// app/api/rag/query/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = process.env.OPENROUTER_MODEL || "openrouter/auto";
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";

// Temperature rendah: jawaban lebih konservatif, mengurangi klaim pengalaman/skill yang tidak tertulis di CV
const RECRUITER_TEMPERATURE = 0.14;
// OpenRouter: output boleh lebih panjang
const OPENROUTER_MAX_TOKENS = 2200;
// Groq free tier TPM ketat (~6000/menit): batasi output + konteks (lihat juga MAX_CONTEXT_CHARS)
const GROQ_DEFAULT_MAX_TOKENS = 512;
const GROQ_TPM_RETRY_MAX_TOKENS = 384;
/** Potong konteks untuk ulang TPM / 413 Groq (karakter) */
const GROQ_TPM_CONTEXT_CAPS = [8800, 6000, 4000, 2600] as const;

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/** Contoh pesan: "Please try again in 16.12s" */
function parseGroqRetryAfterMs(message: string): number | null {
  const m = message.match(/try again in\s+([\d.]+)\s*s/i);
  if (!m) return null;
  const sec = parseFloat(m[1]);
  if (!Number.isFinite(sec) || sec <= 0) return null;
  return Math.min(Math.ceil(sec * 1000), 22_000);
}

/** Angka kandidat yang diminta HR (top N / sebutkan N / 3/4 kandidat). null = tidak disebutkan eksplisit. */
function extractRequestedCandidateCount(query: string): number | null {
  const s = query.trim().toLowerCase();
  const slash = s.match(/(\d+)\s*\/\s*(\d+)\s*kandidat/);
  if (slash) {
    const a = parseInt(slash[1], 10);
    const b = parseInt(slash[2], 10);
    const n = Math.max(a, b);
    if (n >= 1 && n <= 50) return n;
  }
  const topN = s.match(/\btop\s*(\d+)\b/);
  if (topN) {
    const n = parseInt(topN[1], 10);
    if (n >= 1 && n <= 50) return n;
  }
  const patterns = [
    /(?:top|sebutkan|tampilkan|pilih|cukup|hanya|maks\.?|maksimal)\s*(?:saja\s*)?(\d+)\s*(?:kandidat|orang|pelamar|nama)/i,
    /(\d+)\s*(?:kandidat|orang|pelamar|nama)(?:\s*(?:terbaik|cocok|sesuai|paling))?/i,
    /(\d+)\s*(?:yang|paling)\s*(?:cocok|sesuai|baik|tepat|layak)/i,
  ];
  for (const re of patterns) {
    const m = s.match(re);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n >= 1 && n <= 50) return n;
    }
  }
  const wordMap: [string, number][] = [
    ["dua", 2],
    ["tiga", 3],
    ["empat", 4],
    ["lima", 5],
    ["enam", 6],
    ["tujuh", 7],
    ["delapan", 8],
    ["sembilan", 9],
    ["sepuluh", 10],
  ];
  for (const [w, n] of wordMap) {
    if (new RegExp(`\\b${w}\\s+kandidat`).test(s)) return n;
  }
  return null;
}

function stitchRecruiterSysPrompt(recruiterPromptBody: string, ctx: string): string {
  return recruiterPromptBody + ctx + "\n=== KONTEN KONTEKS SELESAI ===";
}

/**
 * Instruksi pendek khusus Groq (tier TPM ~6000). Prompt penuh membuat "Requested" ~4k+ token
 * hampir hanya dari sistem — potong konteks saja tidak cukup.
 */
const recruiterPromptGroqBody =
  `Anda AI recruiter. Jawab HANYA dari teks konteks (JD + CV). Markdown: ## ### **label** bullet "- ".
Fakta: jangan tambah skill/pengalaman/proyek/teknologi. Per kandidat hanya dari segmen [[[CV_ONLY filename:...]]] ... [[[/CV_ONLY ...]]] yang **nama filenya sama** dengan kandidat di ###. **Dilarang** pindahkan kutipan Flutter/mobile/stack dari segmen file lain. Bukti = kutipan dari segmen itu saja ATAU: "CV tidak mencantumkan ...".
Judul ###: salin **nama asli** dari teks CV + (CV: file). **Dilarang** tulis literal "Nama Lengkap" atau hanya nama file jika nama ada di CV. Tanpa nama: Nama tidak tersurat (CV: …).
Jika HR minta angka (top 4, 3 kandidat): **maks N** blok ### peringkat = angka itu (default 3). Jangan lebih.
Satu kandidat satu penilaian panjang (tidak dobel); ringkasan/penutup tidak boleh lawan ###. "Relevan JD" hanya jika kata/skill di CV juga di JD. Map 2–4 poin JD → ada/tidak bukti per CV.
Skor JD 0–100 dari bukti di segmen file yang sama vs JD; tanpa bukti relevan → 0–35; **dilarang skor ≥70** jika segmen CV_ONLY file itu tidak berisi teknologi/pengalaman konkret yang selaras JD.
Semua kandidat: ### per file daftar. Peringkat/top: ikuti angka di pertanyaan HR untuk maks blok peringkat; bila tidak ada angka, maks 3. Jangan nobatkan tanpa bukti.
Nama persis seperti di CV (bukan huruf terpisah spasi).
=== KONTEN KONTEKS MULAI ===
`;

/** True untuk TPM, HTTP 413, atau pesan "request too large" dari Groq */
function isGroqTpmOrOversized(status: number, message: string) {
  if (status === 413) return true;
  const s = message.toLowerCase();
  return (
    s.includes("tokens per minute") ||
    s.includes("(tpm)") ||
    /\btpm\b/.test(s) ||
    s.includes("request too large")
  );
}

/** Terlalu banyak request / jeda antar request (bukan TPM/413) */
function isGroqRpmError(status: number, message: string) {
  if (isGroqTpmOrOversized(status, message)) return false;
  const s = message.toLowerCase();
  return (
    status === 429 ||
    s.includes("rate limit") ||
    s.includes("rate_limit") ||
    s.includes("too many requests")
  );
}

/** Rapikan teks Markdown dari model: pertahankan sintaks MD; jangan strip bold/list. */
function polishAssistantAnswer(answer: string): string {
  if (!answer) return answer;

  // Rapikan baris penomoran yang terpecah tidak wajar (1. lalu baris kosong berlebihan)
  answer = answer.replace(/^(\d+)\.\s*\n{2,}/gm, "$1.\n\n");

  // Hindari blok kosong berlebihan (tetap biarkan ganda untuk paragraf Markdown)
  answer = answer.replace(/\n{4,}/g, "\n\n\n");
  
  // Jangan hapus kalimat terakhir yang tidak lengkap - biarkan seperti adanya
  // karena mungkin memang terpotong dari API
  
  // Perbaiki nama yang terpotong (contoh: "SAPUTR" -> "SAPUTRA", "NUGROH" -> "NUGROHO")
  // Tapi hanya jika memang terlihat seperti nama yang terpotong
  const nameFixes: Record<string, string> = {
    'SAPUTR': 'SAPUTRA',
    'NUGROH': 'NUGROHO',
    'SAPUTRA': 'SAPUTRA', // Pastikan sudah benar
    'NUGROHO': 'NUGROHO', // Pastikan sudah benar
  };
  
  // Perbaiki nama yang terpotong di berbagai konteks
  for (const [wrong, correct] of Object.entries(nameFixes)) {
    if (wrong === correct) continue; // Skip jika sudah benar
    
    // Perbaiki di berbagai posisi: di akhir kalimat, sebelum angka, sebelum titik, dll
    const patterns = [
      new RegExp(`\\b${wrong}\\s*$`, 'gmi'), // Di akhir baris
      new RegExp(`\\b${wrong}\\s+[0-9]`, 'gmi'), // Sebelum angka
      new RegExp(`\\b${wrong}\\s*\\.`, 'gmi'), // Sebelum titik
      new RegExp(`\\b${wrong}\\s*\\n`, 'gmi'), // Sebelum newline
    ];
    
    patterns.forEach(pattern => {
      answer = answer.replace(pattern, (match) => match.replace(wrong, correct));
    });
  }
  
  // Trim whitespace
  answer = answer.trim();
  
  return answer;
}

export async function POST(req: Request) {
  try {
    const { query, context } = await req.json();
    if (!query) {
      return NextResponse.json({ error: "Query kosong." }, { status: 400 });
    }

    const openrouterKey = process.env.OPENROUTER_API_KEY;
    const groqKey = process.env.GROQ_API_KEY;

    // === batasi context (TPM Groq ~6000/menit — input besar mudah kena 429)
    const MAX_CONTEXT_CHARS = 14200;
    let limitedContext = context || "(no context)";
    if (limitedContext.length > MAX_CONTEXT_CHARS) {
      limitedContext = limitedContext.substring(0, MAX_CONTEXT_CHARS) + "\n\n[... context truncated ...]";
    }

    // === AI Recruiter: screening CV, cocokkan JD, skor, alasan, pro/kontra
    const recruiterPromptBody =
      `Anda adalah AI recruiter senior. Tugas Anda: membaca CV dan Job Description (JD) dalam konteks, mencocokkan kandidat dengan kebutuhan role, memberi penilaian terstruktur, dan menjawab pertanyaan HR dengan nada profesional, natural, dan mudah diikuti — mirip asisten berkualitas tinggi (jelas, ringkas, tidak kaku).

SUMBER DATA (hanya ini yang valid):
- JD / lowongan: blok bertanda [JOB DESCRIPTION - nama_file] atau nama file mengandung jd, job, lowongan, requirement.
- CV: blok [CV - nama_file] atau nama file / segmen yang jelas merupakan CV.
- Di awal konteks sering ada **=== DAFTAR SUMBER ===** berisi nomor urut semua file CV. Anggap itu daftar resmi kandidat untuk pertanyaan kolektif.

KEADILAN & KELENGKAPAN (bedakan jenis pertanyaan):
1. Pertanyaan **komparatif penuh** ("bandingkan semua pelamar", "nilai tiap CV", "screening semua", "sebutkan satu per satu", "semua kandidat", evaluasi JD untuk **seluruh** file): beri **satu blok ###** per file CV pada **DAFTAR SUMBER**, tanpa melompati nomor urut. Judul ### harus berisi **nama pelamar yang disalin dari teks CV** + (CV: file) — **dilarang** menulis placeholder teks **Nama Lengkap**; jika nama tidak ada di CV: **Nama tidak tersurat (CV: …)**.
2. Pertanyaan **prioritas / terpilih / paling cocok / terbaik untuk role / top / siapa yang harus dilanjutkan** / HR menyebut **angka** (mis. top 4, sebutkan 3 kandidat, 3/4 kandidat): hemat panjang — di **## Rekomendasi utama** (atau setara) beri **paling banyak N** blok ### dengan bukti, di mana **N** = angka yang **eksplisit** diminta HR di pertanyaan; jika HR **tidak** menyebut angka, **N = 3**. **Dilarang** memberi lebih dari **N** kandidat berperingkat ber-detail (### lengkap) untuk pertanyaan bertipe ini; selebihnya hanya **## Kandidat lain (ringkas)** satu paragraf atau bullet pendek. Setiap ### singkat: bukti + skor + alasan. **Nama di judul ###** = string nama **nyata** dari teks CV file itu — **dilarang** literal **Nama Lengkap** sebagai pengganti nama. Lalu **## Kandidat lain (ringkas)**: nama orang dari CV + (CV: file) + satu kalimat status. **Jangan** menobatkan "paling cocok" tanpa bukti di CV.
3. Jika pertanyaan **hanya** satu nama atau satu file CV, fokus ke kandidat itu.
4. Jika teks CV dipersingkat di konteks, akui keterbatasan per kandidat; jangan mengisi dari CV lain.

ATURAN FAKTA (wajib):
1. HANYA gunakan yang benar-benar tertulis di konteks. Jangan menambah skill, pengalaman, gelar, industri, proyek, teknologi, atau angka yang tidak ada.
2. **Bukti eksplisit di CV:** setiap bullet di bagian ini HARUS berupa (a) kutipan singkat atau parafrase ketat dari kalimat CV yang sama, ATAU (b) satu bullet persis: **"CV tidak mencantumkan pengalaman kerja, skill teknis, proyek, atau peran apa pun"** jika memang demikian. **DILARANG** menulis teknologi atau peran (mis. Flutter, Firebase, mobile, backend, UI/UX, fullstack) kecuali kata itu **secara harfiah** muncul di teks CV kandidat tersebut.
3. CV tipis / tanpa bagian pengalaman atau skill: di **Bukti eksplisit** hanya gunakan bullet (b) di atas; di **Tidak tercantum** sebut requirement JD yang tidak punya bukti; **skor kecocokan JD** untuk role yang membutuhkan bukti teknis **tidak boleh tinggi** (gunakan rentang rendah, mis. 0–35), bukan skor menengah seperti 60.
4. LINGKUP PER KANDIDAT: setiap pernyataan tentang seorang kandidat HANYA boleh didasarkan pada teks CV orang itu saja (blok [CV - nama_file] yang sesuai). DILARANG memindahkan pengalaman/skill dari CV kandidat lain, dari JD, atau dari pengetahuan umum, ke kandidat ini.
5. **ANTI SILANG FILE (mutlak):** Di konteks sering ada penanda \"[[[CV_ONLY filename:NAMAFILE]]]\" hingga \"[[[/CV_ONLY filename:NAMAFILE]]]\". Untuk kandidat dengan file **NAMAFILE**, setiap kutipan di **Bukti eksplisit** harus berupa substring yang **hanya** diambil dari segmen CV_ONLY **dengan filename yang persis sama**. Jika kata seperti Flutter, Firebase, mobile, Android, iOS, atau "proyek" hanya muncul di dalam segmen CV_ONLY **file lain**, untuk kandidat ini Anda **dilarang** menulis kutipan itu — tulis: **CV tidak menyebutkan** skill/pengalaman tersebut. Untuk pertanyaan "paling cocok" / mobile dev: **wajib** memberi bukti pada ### yang judulnya memang file CV tempat teknologi itu tertulis, bukan pada file lain.
6. BIDANG / ROLE / SKILL: jika CV tidak pernah menyebutkan suatu bidang atau teknologi, tulis **CV tidak menyebutkan** — jangan mengandaikan "pengalaman di bidang X".
7. Jika suatu poin JD tidak bisa diverifikasi dari CV kandidat tersebut, nyatakan **tidak ada bukti di CV** untuk poin itu. Jangan mengisi celah agar jawaban terdengar lengkap.
8. Jika konteks terpotong (ada teks "[... context truncated ...]"), akui bahwa penilaian bisa terbatas dan sebut apa yang masih bisa disimpulkan dari bagian yang ada.
9. FORMAT KELUARAN: selalu gunakan Markdown yang rapi agar mudah dibaca (seperti ChatGPT):
   - Judul bagian besar pakai ## (contoh: ## Ringkasan eksekutif), sub-bagian pakai ###.
   - **Judul ### wajib memuat nama manusia nyata:** bentuk **### Budi Santoso (CV: CV.pdf)** — ganti **Budi Santoso** dengan nama **persis** yang Anda baca di teks CV segmen itu (bukan contoh fiktif jika CV berisi nama lain). **Dilarang keras** menulis frasa placeholder **Nama Lengkap**, **Nama Kandidat**, atau teks dalam kurung siku seperti placeholder template. **Dilarang** judul ### yang **hanya** nama file jika CV memuat nama orang. Jika nama tidak terbaca: **### Nama tidak tersurat (CV: namafile.pdf)**. Tulis nama **tanpa spasi antar huruf** (contoh salah: "Y o g a"; benar: "Yoga").
   - Di bawah ###, baris pertama boleh mengulang **Nama (CV: file)** lalu bullet bukti/skor.
   - Gunakan **teks** untuk label singkat (misalnya **Skor kecocokan JD:**, **Alasan skor:**, **Kelebihan:**, **Kekurangan / risiko:**, **Rekomendasi:**).
   - Isi poin pakai bullet "- " (dash + spasi), satu ide per baris; hindari satu paragraf panjang tanpa jeda baris.
   - Sisipkan baris kosong antar paragraf dan antar kandidat agar "turun ke bawah" jelas.
   - **Dilarang menggandakan kandidat:** jangan menilai orang yang sama dua kali dengan narasi panjang hampir identik; jangan mengisi **Ringkasan** dengan daftar panjang yang mengulang ###.
   - Tidak perlu HTML. Link sumber opsional dalam bentuk Markdown [teks](url) hanya jika relevan.
10. Tulis nama orang dan identitas persis seperti di CV; hindari nama terpotong. **Dilarang** menyajikan kandidat hanya sebagai nama file tanpa menyebut nama orang jika nama itu ada di CV. **Dilarang** menulis frasa placeholder **Nama Lengkap** atau **Nama Kandidat** sebagai pengganti nama nyata.
11. Sebelum mengklaim kandidat punya pengalaman di suatu bidang, cek ulang: apakah ada kalimat di CV yang secara eksplisit mendukung? Jika tidak, jawab negatif atau netral sesuai ketiadaan bukti.
12. **ANTI-DUPLIKASI & KONSISTENSI:** Untuk **setiap** kandidat (nama + file CV), penilaian naratif panjang **hanya sekali** — biasanya di **satu blok ###** (komparatif) atau di **satu baris** ringkas (daftar). **Dilarang** mengulang orang yang sama di banyak paragraf dengan kesimpulan serupa (contoh: Yoga muncul dua kali dengan alasan hampir sama). **Ringkasan eksekutif** maksimal 2–4 kalimat: rangkum arah umum, **jangan** menyalin ulang isi panjang ### per orang. **Paragraf penutup** wajib **selaras** dengan **Alasan skor** / **Bukti** di ### untuk **nama yang sama** — **dilarang keras** menggabungkan dua nama dalam satu kalimat yang **mengontradiksi** ### salah satunya (mis. di atas Faisal "ada relevan" lalu di penutup "Faisal tidak punya relevan"). **Kata "relevan dengan JD/posisi":** hanya jika kutipan CV memuat skill/pengalaman/teknologi yang **secara harfiah** juga muncul di teks JD (atau istilah setara yang keduanya tertulis); jika CV punya skill lain yang **tidak** disebut JD, tulis **tidak ada bukti di CV untuk poin JD …** — bukan "relevan secara umum".

CARA BERPIKIR (tampilkan ringkas di jawaban, bukan monolog panjang):
- Sebut dokumen mana yang dianggap JD vs tiap CV; jangan mencampur fakta antar CV.
- Untuk setiap ### kandidat, **buka hanya** segmen konteks \"[[[CV_ONLY filename:NAMA]]]\" hingga \"[[[/CV_ONLY filename:NAMA]]]\" dengan **NAMA sama** dengan file/judul kandidat; jangan melihat segmen CV_ONLY file lain saat menulis bukti untuk kandidat ini.
- **Sebelum menulis judul ###:** salin **nama pelamar** huruf demi huruf dari teks CV (header/identitas) ke judul; **jangan** mengganti dengan kata **Nama Lengkap**. Jika tidak ada nama di teks, **Nama tidak tersurat (CV: …)** — bukan nama file saja.
- Untuk tiap kandidat, hanya kutip atau rangkum ketat dari CV-nya; untuk setiap butir JD penting: tulis **ada bukti** atau **tidak disebutkan di CV** (bukan ditebak). Jangan pernah mengarang proyek atau stack teknologi.
- Untuk penilaian ke JD: ambil **2–4 poin konkret** dari teks JD (skill, tool, domain, pengalaman). Untuk **tiap kandidat**, sebut bukti kutipan dari CV-nya **per poin** (**ada** / **tidak ada bukti**) lalu gap; **dilarang** melompat ke kata "relevan" tanpa pemetaan ini; akhiri dengan ringkasan gap vs JD hanya dari fakta tersebut.
- Inferensi di luar teks CV dilarang kecuali satu baris dengan label persis: *Interpretasi wajar (bukan fakta di CV):* — dan hanya jika tidak mengubah fakta (mis. implikasi umum dari gelar yang memang tertulis).

SKOR KECOCOKAN (hanya jika ada JD + CV yang dinilai):
- Gunakan skor bilangan bulat 0–100: "Skor kecocokan JD: XX/100".
- Skor mencerminkan seberapa banyak requirement penting JD yang didukung bukti eksplisit di CV kandidat tersebut saja, bukan kualitas umum subjektif. Jangan menaikkan skor dengan mengandaikan pengalaman atau skill yang tidak tertulis di CV orang itu.
- **Skor ≥ 70** hanya jika di segmen CV (penanda CV_ONLY **filename yang sama** dengan judul ###) ada **minimal satu** kalimat konkret yang mendukung requirement utama JD. Jika segmen itu tidak memuat teknologi/pengalaman/proyek yang relevan dengan JD, skor **wajib di bawah 70** (biasanya 0–40).
- Jika CV tidak mencantumkan pengalaman kerja atau skill relevan dengan JD sama sekali, skor kecocokan JD harus **rendah (mis. 0–35)**; **dilarang** memberi skor menengah/tinggi hanya agar jawaban terlihat seimbang.
- Jika CV tidak memuat cukup informasi untuk skor adil, beri skor rendah atau jelaskan "Skor bersyarat" dan sebutkan data yang kurang.
- Jika tidak ada JD di konteks, JANGAN memberi skor kecocokan JD; bisa beri ringkasan profil dan risiko berdasarkan CV saja.

FORMAT JAWABAN MARKDOWN (sesuaikan dengan jenis pertanyaan — lihat KEADILAN poin 1 vs 2):

## Ringkasan eksekutif
(2–4 kalimat saja: arah umum vs JD; **jangan** mengulang penilaian panjang per nama yang sudah ada di ###; jangan menduplikasi kandidat)

## Penilaian (pilih struktur sesuai pertanyaan — lihat KEADILAN poin 1 vs 2)
- **Komparatif penuh:** ulangi blok ### **sekali per file CV** pada DAFTAR SUMBER.
- **Paling cocok / top / prioritas / HR sebut angka N:** gunakan **## Rekomendasi utama** dengan **tepat paling banyak N** blok heading-3 berbukti (N dari angka di pertanyaan HR bila ada; bila tidak ada angka, N=3), lalu **## Kandidat lain (ringkas)** — **dilarang** lebih dari N blok penilaian ber-detail untuk bagian peringkat.
- **Judul per kandidat (wajib):** satu baris heading Markdown level-3 yang dimulai dengan **nama pelamar yang Anda salin dari teks CV** (bukan frasa literal \"Nama Lengkap\" atau \"Nama Kandidat\"), lalu **(CV: namafile.pdf)**. Contoh bentuk benar: heading berisi **Rizky Hidayat (CV: dummy_cv_5.pdf)** — ganti Rizky Hidayat dengan nama yang benar-benar ada di segmen CV itu.

### [Salin nama nyata dari teks CV — dilarang tulis literal Nama Lengkap] (CV: namafile.pdf)
- **Skor kecocokan JD:** XX/100 (atau jelaskan jika tidak applicable)
- **Bukti eksplisit di CV (hanya dari CV orang ini):**
  - Hanya kutipan/parafrase ketat yang **tepat-tepat** berasal dari segmen \"[[[CV_ONLY filename:...]]]\" dengan **filename sama** dengan judul ### ini. ATAU satu bullet: **"CV tidak mencantumkan pengalaman kerja, skill teknis, proyek, atau peran apa pun."** Jangan menulis stack (Flutter, Firebase, mobile, backend, UI/UX, dll.) kecuali teks itu **ada di segmen CV_ONLY file ini**.
- **Tidak tercantum / tidak ada bukti di CV:**
  - (requirement JD atau pertanyaan yang tidak didukung teks CV ini)
- **Alasan skor:**
  - (hanya merujuk bullet di **Bukti eksplisit**; jika bukti kosong, skor rendah dan jangan mengarang pengalaman)
- **Kelebihan:**
  - (hanya dari yang tertulis; jika tidak ada, tulis: tidak ada kelebihan tersurat dibanding JD)
- **Kekurangan / risiko:**
  - (termasuk gap terhadap JD)
- **Rekomendasi:** (selaras dengan bukti; jika tidak ada bukti relevan, rekomendasikan tidak lanjut atau perlu wawancara klarifikasi, bukan "cocok")

Jika pertanyaan hanya faktual tentang JD atau satu CV, jawab lebih ringkas tetapi tetap pakai ## / ### dan bullet agar tetap terstruktur.

Akhiri dengan **satu** paragraf penutup singkat yang **konsisten** dengan ### di atas (tanpa kontradiksi); jika data kurang, sebutkan secara eksplisit.

=== KONTEN KONTEKS MULAI ===
`;

    const sysPrompt = stitchRecruiterSysPrompt(recruiterPromptBody, limitedContext);

    const qStr = typeof query === "string" ? query.trim() : String(query);
    const askedN = typeof query === "string" ? extractRequestedCandidateCount(query) : null;
    const userMsg =
      typeof query === "string"
        ? `Pertanyaan atau instruksi HR:\n${qStr}` +
          (askedN != null
            ? `\n\n[Instruksi sistem — wajib dipatuhi: HR meminta paling banyak **${askedN}** kandidat terpilih/terbaik. Di bagian peringkat (## Rekomendasi utama atau setara) beri **paling banyak ${askedN}** blok ### berisi bukti; **dilarang** lebih dari ${askedN}. Selebihnya ringkas saja di ## Kandidat lain.]`
            : "")
        : qStr;

    // Try OpenRouter dengan timeout
    if (openrouterKey) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 detik timeout

        const resp = await fetch(OPENROUTER_URL, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${openrouterKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
            "X-Title": "RAG Document AI",
          },
          body: JSON.stringify({
            model: MODEL,
            messages: [
              { role: "system", content: sysPrompt },
              { role: "user", content: userMsg },
            ],
            temperature: RECRUITER_TEMPERATURE,
            max_tokens: OPENROUTER_MAX_TOKENS,
            top_p: 0.9,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const data = await resp.json();
        if (resp.ok) {
          const choice = data?.choices?.[0];
          let answer = choice?.message?.content || "Tidak ditemukan di dokumen.";
          const finishReason = choice?.finish_reason;
          
          // Jika jawaban terpotong karena length, tambahkan catatan
          if (finishReason === "length") {
            answer += "\n\n[Catatan: Jawaban mungkin terpotong karena batasan panjang. Silakan ajukan pertanyaan yang lebih spesifik untuk mendapatkan informasi lengkap.]";
          }
          
          answer = polishAssistantAnswer(answer);
          return NextResponse.json({ answer, sources: [] });
        }
      } catch (e) {
        console.log("OpenRouter timeout/error, fallback ke Groq:", e.message);
        // lanjut ke Groq
      }
    }

    // Fallback Groq: 413/TPM → potong konteks dulu (bukan hanya max_tokens), lalu tunggu hint API
    if (groqKey) {
      console.log("Menggunakan Groq API...");
      try {
        let groqCtx = limitedContext;
        let groqMaxTokens = GROQ_DEFAULT_MAX_TOKENS;
        let tpmGroqWaitRound = 0;
        let groqTokenFloorPass = 0;
        let tpmGroqCapIdx = 0;
        let rpmWaitsDone = 0;
        const maxGroqAttempts = 12;

        for (let groqAttempt = 0; groqAttempt < maxGroqAttempts; groqAttempt++) {
          const resp = await fetch(GROQ_URL, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${groqKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: GROQ_MODEL,
              messages: [
                { role: "system", content: stitchRecruiterSysPrompt(recruiterPromptGroqBody, groqCtx) },
                { role: "user", content: userMsg },
              ],
              temperature: RECRUITER_TEMPERATURE,
              max_tokens: groqMaxTokens,
            }),
          });

          const data = await resp.json();
          if (resp.ok) {
            const choice = data?.choices?.[0];
            let answer = choice?.message?.content || "Tidak ditemukan di dokumen.";
            const finishReason = choice?.finish_reason;

            if (finishReason === "length") {
              answer +=
                "\n\n[Catatan: Jawaban mungkin terpotong karena batasan panjang. Silakan ajukan pertanyaan yang lebih spesifik untuk mendapatkan informasi lengkap.]";
            }

            answer = polishAssistantAnswer(answer);
            return NextResponse.json({ answer, sources: [] });
          }

          const errorMsg = data?.error?.message || "";
          console.warn(
            `[Groq] request failed (attempt ${groqAttempt + 1}/${maxGroqAttempts}) status=${resp.status}`,
            errorMsg || JSON.stringify(data?.error || {})
          );

          if (isGroqTpmOrOversized(resp.status, errorMsg)) {
            // 413 / "request too large" → utamakan memperkecil INPUT (konteks), bukan hanya max_tokens
            if (tpmGroqCapIdx < GROQ_TPM_CONTEXT_CAPS.length) {
              const cap = GROQ_TPM_CONTEXT_CAPS[tpmGroqCapIdx++];
              groqCtx =
                limitedContext.slice(0, cap) +
                "\n\n[... konteks dipersingkat untuk batas ukuran/TPM Groq; analisis bisa tidak lengkap ...]";
              groqMaxTokens = Math.min(groqMaxTokens, GROQ_TPM_RETRY_MAX_TOKENS);
              console.warn(
                `[Groq] ukuran permintaan besar (status ${resp.status}); potong konteks ~${cap} chars, max_tokens=${groqMaxTokens}`
              );
              continue;
            }

            const apiWait = parseGroqRetryAfterMs(errorMsg);
            if (apiWait !== null && tpmGroqWaitRound < 3) {
              tpmGroqWaitRound++;
              console.warn(
                `[Groq] TPM; waiting ${apiWait}ms as suggested by API (wait ${tpmGroqWaitRound}/3)`
              );
              await sleep(apiWait);
              continue;
            }

            if (groqTokenFloorPass === 0 && groqMaxTokens > GROQ_TPM_RETRY_MAX_TOKENS) {
              groqTokenFloorPass = 1;
              groqMaxTokens = GROQ_TPM_RETRY_MAX_TOKENS;
              console.warn("[Groq] TPM; lowering max_tokens to", groqMaxTokens);
              continue;
            }
            if (groqTokenFloorPass === 1 && groqMaxTokens > 256) {
              groqTokenFloorPass = 2;
              groqMaxTokens = 256;
              console.warn("[Groq] TPM; lowering max_tokens to", groqMaxTokens);
              continue;
            }

            return NextResponse.json({
              answer:
                "Permintaan melebihi batas token per menit (TPM) Groq untuk paket Anda. Tunggu ±1 menit, perpendek pertanyaan, atau kurangi jumlah CV per chat. Info: https://console.groq.com/settings/billing",
              sources: [],
            });
          }

          if (isGroqRpmError(resp.status, errorMsg) && rpmWaitsDone < 2) {
            rpmWaitsDone++;
            const waitMs = 2600;
            console.warn(`[Groq] rate limit; waiting ${waitMs}ms then retry (${rpmWaitsDone}/2)`);
            await sleep(waitMs);
            continue;
          }

          if (isGroqRpmError(resp.status, errorMsg)) {
            return NextResponse.json({
              answer:
                "Batas kecepatan permintaan Groq sementara tercapai. Silakan tunggu beberapa detik lalu coba lagi.",
              sources: [],
            });
          }

          const msg = errorMsg || `Groq error (${resp.status})`;
          return NextResponse.json({ error: msg }, { status: 500 });
        }

        return NextResponse.json(
          {
            answer:
              "Layanan AI sementara tidak tersedia setelah beberapa percobaan. Silakan coba lagi sebentar lagi.",
            sources: [],
          },
          { status: 200 }
        );
      } catch (e: any) {
        return NextResponse.json({ error: `Groq error: ${e.message}` }, { status: 500 });
      }
    }

    // Jika tidak ada API key, kembalikan jawaban default
    return NextResponse.json({ 
      answer: "Tidak ditemukan di dokumen.", 
      sources: [] 
    });

  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Gagal memproses query." }, { status: 500 });
  }
}