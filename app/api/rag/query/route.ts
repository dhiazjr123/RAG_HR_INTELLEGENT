// app/api/rag/query/route.ts
import { NextResponse } from "next/server";
import {
  applyPostProcessAnswer,
  buildGreetingReply,
  buildQueryUserAddon,
  classifyHrQuery,
  isFollowUpQuery,
  isGreetingQuery,
  narrowContextForFollowUp,
  narrowContextForNamedComparison,
  narrowContextForQuery,
  type ChatHistoryTurn,
  type HrQueryKind,
} from "@/lib/recruiter-ranking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = process.env.OPENROUTER_MODEL || "openrouter/auto";
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";

// Temperature rendah: jawaban lebih konservatif, mengurangi klaim pengalaman/skill yang tidak tertulis di CV
const RECRUITER_TEMPERATURE = 0.14;
// OpenRouter: output boleh lebih panjang; follow-up lebih pendek
const OPENROUTER_MAX_TOKENS = 2200;
const OPENROUTER_FOLLOWUP_MAX_TOKENS = 720;
// Groq on_demand TPM ~6000/menit: input+output harus jauh di bawah 6000 per request
const GROQ_DEFAULT_MAX_TOKENS = 384;
const GROQ_TPM_RETRY_MAX_TOKENS = 256;
const GROQ_INITIAL_CONTEXT_CHARS = 4200;
/** Potong konteks untuk ulang TPM / 413 Groq (karakter) */
const GROQ_TPM_CONTEXT_CAPS = [3200, 2200, 1400] as const;

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
    // Perbaikan pola regex agar lebih sensitif menangkap digit angka tunggal
    /(?:^|\s)(\d+)\s*(?:kandidat|orang|pelamar|nama)(?:\s*(?:terbaik|cocok|sesuai|paling))?/i,
    /(?:^|\s)(\d+)\s*(?:yang|paling)\s*(?:cocok|sesuai|baik|tepat|layak)/i,
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

type ChatHistoryMessage = { role: "user" | "assistant"; content: string };

const OPENROUTER_MAX_HISTORY_TURNS = 10;
const GROQ_MAX_HISTORY_TURNS = 6;
const OPENROUTER_HISTORY_ASSISTANT_MAX_CHARS = 3200;
const GROQ_HISTORY_ASSISTANT_MAX_CHARS = 1200;

const MULTI_TURN_SYS_NOTE =
  "\n\nPERCAKAPAN BERKELANJUTAN: HR mengajukan pertanyaan lanjutan. " +
  "Gunakan riwayat chat untuk memahami \"tadi\", \"pertama\", \"skor itu\". " +
  "Jawab **singkat** (bullet poin saja, maks ~8 bullet / 100 kata). " +
  "Jangan ulang screening penuh. Konteks CV/JD tetap sumber kebenaran; jangan mengarang.";

function sanitizeChatHistory(raw: unknown): ChatHistoryMessage[] {
  if (!Array.isArray(raw)) return [];
  const out: ChatHistoryMessage[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const role = (item as { role?: unknown }).role;
    const content = (item as { content?: unknown }).content;
    if (role !== "user" && role !== "assistant") continue;
    if (typeof content !== "string") continue;
    const trimmed = content.trim();
    if (!trimmed) continue;
    out.push({ role, content: trimmed.slice(0, 12000) });
  }
  return out;
}

function trimHistoryForProvider(
  history: ChatHistoryMessage[],
  opts: { maxTurns: number; assistantMaxChars: number }
): ChatHistoryMessage[] {
  const maxMessages = opts.maxTurns * 2;
  const sliced = history.slice(-maxMessages);
  return sliced.map((m) => {
    if (m.role !== "assistant" || m.content.length <= opts.assistantMaxChars) return m;
    return {
      role: m.role,
      content:
        m.content.slice(0, opts.assistantMaxChars) +
        "\n\n[... jawaban sebelumnya dipersingkat untuk batas riwayat chat ...]",
    };
  });
}

function buildLlmMessages(
  sysPrompt: string,
  history: ChatHistoryMessage[],
  userMsg: string,
  useGroq: boolean
): Array<{ role: "system" | "user" | "assistant"; content: string }> {
  const trimmedHistory = trimHistoryForProvider(history, {
    maxTurns: useGroq ? GROQ_MAX_HISTORY_TURNS : OPENROUTER_MAX_HISTORY_TURNS,
    assistantMaxChars: useGroq ? GROQ_HISTORY_ASSISTANT_MAX_CHARS : OPENROUTER_HISTORY_ASSISTANT_MAX_CHARS,
  });
  const sys =
    trimmedHistory.length > 0 ? sysPrompt + MULTI_TURN_SYS_NOTE : sysPrompt;
  return [
    { role: "system", content: sys },
    ...trimmedHistory,
    { role: "user", content: userMsg },
  ];
}

function truncateGroqContext(fullContext: string, maxChars: number): string {
  if (fullContext.length <= maxChars) return fullContext;
  return (
    fullContext.slice(0, maxChars) +
    "\n\n[... konteks dipersingkat untuk batas ukuran/TPM Groq; analisis bisa tidak lengkap ...]"
  );
}

/**
 * Instruksi pendek khusus Groq (tier TPM ~6000). 
 * Dioptimalkan agar Llama-3.1-8b mematuhi aturan kalkulasi skor kaku dan pemetaan per segmen file.
 */
const recruiterPromptGroqBody =
  `Anda AI recruiter senior. Jawab sesuai maksud pertanyaan HR (sapaan, profil satu kandidat, screening, atau perbandingan). Hanya gunakan teks konteks (JD + CV). Markdown: ## ### bullet "- ".
Aturan:
1. Segmen [[[CV_ONLY filename:...]]] ... [[[/CV_ONLY filename:...]]] — satu file = satu kandidat; jangan campur antar file.
2. Jika HR minta **profil / data diri** satu orang: format ## Profil [Nama], tanpa skor JD, tanpa kandidat lain.
3. Jika HR minta **cocok / terbaik / bandingkan**: boleh skor JD dan ## Rekomendasi utama.
4. Kutipan hanya dari CV kandidat yang dimaksud.
5. Di bagian bukti eksplisit, jangan kutip baris judul posisi lama / nama instansi (misal: "Modern Packaging Technician - PT Maju"), melainkan keahlian atau tugas riil.
=== KONTEN KONTEKS MULAI ===
`;

const recruiterPromptSingleCandidateBody =
  `Anda asisten HR yang membantu membaca CV. HR menanyakan **profil atau data diri satu kandidat** (bukan screening semua pelamar).
Jawab natural, ramah, dan terstruktur. Gunakan hanya teks CV pada segmen [[[CV_ONLY]]] yang difokuskan.
Format: ## Profil [Nama asli dari CV] lalu bullet Pendidikan, Pengalaman, Keahlian, Kontak (hanya jika tertulis).
**Jangan** beri skor kecocokan JD, **jangan** ulang kandidat yang sama dua kali, **jangan** sebut kandidat lain.
=== KONTEN KONTEKS MULAI ===
`;

const recruiterPromptGeneralBody =
  `Anda adalah asisten AI recruiter yang cerdas, objektif, dan tepercaya. Jawab pertanyaan HR secara langsung, natural, dan akurat berdasarkan FAKTA yang tertulis di dalam dokumen CV pelamar pada konteks RAG.
Aturan Penting:
1. Hanya gunakan informasi yang benar-benar tertulis di dalam CV. Dilarang keras mengarang (hallucination) informasi, pengalaman, proyek, pendidikan, atau sertifikasi yang tidak ada di CV.
2. Jika informasi yang ditanyakan tidak tercantum di dalam CV, katakan dengan jujur dan sopan bahwa informasi tersebut tidak ditemukan di dalam dokumen.
3. Jawab sesuai maksud pertanyaan HR. Jangan menyajikan skor kecocokan JD, ulasan kelebihan/kekurangan, atau format screening massal kecuali HR secara eksplisit memintanya di dalam pertanyaan.
=== KONTEN KONTEKS MULAI ===
`;

const recruiterPromptFollowUpBody =
  `Anda asisten HR untuk **pertanyaan lanjutan** dalam sesi screening CV.
Aturan wajib:
1. Jawab **singkat**: maks ~6–8 bullet atau 100 kata.
2. Format: ## judul singkat → bullet "- " saja; **tanpa** paragraf panjang.
3. Gunakan riwayat chat + CV/JD; **jangan** ulang screening penuh atau semua kandidat.
4. Hanya fakta tertulis di CV; jika tidak ada bukti: "Tidak tercantum di CV".
5. Dilarang Ringkasan eksekutif panjang dan kalimat penutup berulang.
6. Jangan sertakan judul pekerjaan lama / nama instansi sebagai bukti eksplisit; fokus pada kompetensi/tugas riil.
=== KONTEN KONTEKS MULAI ===
`;

const recruiterPromptGroqFollowUpBody =
  `AI recruiter — pertanyaan lanjutan. Jawab singkat: ## judul + bullet "- " (maks 8 bullet). Gunakan riwayat + CV/JD. Jangan ulang screening penuh. Hanya fakta CV. JANGAN kutip judul jabatan lama / nama instansi sebagai bukti.
=== KONTEN KONTEKS MULAI ===
`;

function recruiterPromptForKind(kind: HrQueryKind, useGroq: boolean, followUp?: boolean): string {
  if (followUp) return useGroq ? recruiterPromptGroqFollowUpBody : recruiterPromptFollowUpBody;
  if (kind === "single_candidate") return recruiterPromptSingleCandidateBody;
  if (kind === "greeting") return recruiterPromptGeneralBody;
  if (kind === "general") return recruiterPromptGeneralBody;
  if (kind === "list_names") return recruiterPromptGeneralBody;
  if (useGroq) return recruiterPromptGroqBody;
  return ""; // pakai recruiterPromptBody default di POST
}

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
    const { query, context, activeCriteria, history: rawHistory } = await req.json();
    if (!query) {
      return NextResponse.json({ error: "Query kosong." }, { status: 400 });
    }

    const openrouterKey = process.env.OPENROUTER_API_KEY;
    const groqKey = process.env.GROQ_API_KEY;

    const qStr = typeof query === "string" ? query.trim() : String(query);
    const chatHistory = sanitizeChatHistory(rawHistory);
    const followUp = chatHistory.length > 0 && isFollowUpQuery(qStr, true);
    const postProcessOpts = {
      followUp,
      history: chatHistory as ChatHistoryTurn[],
    };

    if (isGreetingQuery(qStr) && chatHistory.length === 0) {
      return NextResponse.json({ answer: buildGreetingReply(), sources: [] });
    }

    // === batasi context (TPM Groq ~6000/menit — input besar mudah kena 429)
    const MAX_CONTEXT_CHARS = 48000;
    let limitedContext = context || "(no context)";
    if (limitedContext.length > MAX_CONTEXT_CHARS) {
      limitedContext = limitedContext.substring(0, MAX_CONTEXT_CHARS) + "\n\n[... context truncated ...]";
    }

    const queryKind = classifyHrQuery(qStr, limitedContext);
    limitedContext = narrowContextForQuery(limitedContext, qStr, queryKind);
    if (followUp) {
      limitedContext = narrowContextForFollowUp(limitedContext, qStr, chatHistory as ChatHistoryTurn[]);
    }
    if (queryKind === "top_n") {
      limitedContext = narrowContextForNamedComparison(limitedContext, qStr);
    }

    // === AI Recruiter: screening CV, cocokkan JD, skor, alasan, pro/kontra
    // Promp diperbarui agar memiliki kemampuan reasoning menyerupai asisten pintar (Gemini/ChatGPT)
    const recruiterPromptBody =
      `Anda adalah AI Recruiter Senior yang bertugas menjalankan proses screening berkas lamaran kerja secara cerdas, objektif, tepercaya, dan fleksibel seperti sistem LLM modern (Gemini/ChatGPT). Anda harus mengevaluasi isi Curriculum Vitae (CV) kandidat terhadap kriteria Job Description (JD) yang tersedia di dalam konteks RAG.

SUMBER DATA (Hanya data di bawah ini yang valid):
- Job Description (JD): Blok bertanda [JOB DESCRIPTION - nama_file] atau nama file serupa yang memuat kriteria lowongan kerja.
- Curriculum Vitae (CV): Blok bertanda [CV - nama_file] atau segmen teks yang jelas diidentifikasi sebagai data pelamar kerja.
- Gunakan penanda awal **=== DAFTAR SUMBER ===** untuk memvalidasi seluruh berkas CV yang masuk ke dalam sistem. Jangan melewatkan dokumen apa pun saat proses screening komparatif.

SISTEM PENILAIAN & SKOR KECOCOKAN (Wajib Objektif dan Tepercaya):
1. Berikan penilaian menggunakan rentang skor bilangan bulat berharga 0-100 dengan format kaku: "**Skor kecocokan JD:** XX/100".
2. Aturan Perhitungan Skor (evaluasi **holistik CV**, bukan sekadar keyword):
   - Skor mencerminkan **cakupan persyaratan JD** + **kedalaman** pengalaman/proyek + **jumlah skill** relevan di CV.
   - Kandidat dengan **lebih banyak** bukti pengalaman/skill sesuai JD harus **skor lebih tinggi** daripada yang hanya punya 1–2 kata kunci cocok.
   - Prioritaskan bukti di bagian **Pengalaman/Proyek** di atas daftar skill saja.
   - **Skor >= 70 (Tinggi/Lolos):** bukti riil pengalaman proyek/peran kerja/stack spesifik selaras JD — semakin banyak bukti, semakin tinggi skor.
   - **Skor < 40 (Rendah/Tidak Lolos):** CV tipis atau tidak ada pengalaman/skill relevan JD.
   - Ikuti urutan peringkat sinyal sistem (DAFTAR PERINGKAT) bila disertakan; jangan balik urutan tanpa alasan bukti CV.

ATURAN ANTI-HALUSINASI & DETEKSI DOKUMEN:
1. **Penyaringan Berbasis Segmen (Anti Silang Dokumen):** Konteks dipisahkan oleh penanda \"[[[CV_ONLY filename:NAMAFILE]]]\" hingga \"[[[/CV_ONLY]]]\". Evaluasi terhadap kandidat pemilik NAMAFILE hanya boleh mengambil informasi dari dalam segmen dokumen tersebut. Anda dilarang keras memindahkan keahlian, riwayat proyek, atau sertifikasi milik kandidat lain ke profil kandidat ini.
2. **Ekstraksi Nama Nyata:** Judul sub-bagian wajib menggunakan nama asli pelamar kerja yang diekstrak langsung dari isi teks CV, bukan menyalin nama file atau placeholder mentah. Format judul: "### [Nama Pelamar Nyata] (CV: nama_file.pdf)". Jika nama tidak ditemukan di dalam teks dokumen, tuliskan: "### Nama tidak tersurat (CV: nama_file.pdf)".
3. Jika dokumen CV dipersingkat atau terpotong (ditandai dengan "[... context truncated ...]"), sebutkan keterbatasan analisis tersebut secara jujur pada bagian kekurangan/risiko, tanpa mengarang informasi tambahan.

FORMAT JAWABAN MARKDOWN (Struktur Rapi, Bersih, dan Komparatif):

## Ringkasan eksekutif
(Berikan kesimpulan umum hasil screening sebanyak 2-4 kalimat yang ringkas mengenai arah kecocokan para pelamar terhadap kriteria posisi kerja tanpa menduplikasi isi ulasan detail di bawah).

## Penilaian Kriteria Kandidat
(Gunakan aturan di bawah ini untuk menyusun ulasan kandidat):
- Jika pertanyaan bersifat komparatif umum ("nilai seluruh berkas", "screening semua pelamar"), buat satu blok heading level 3 (###) untuk setiap berkas CV yang ada di daftar sumber tanpa terlewat.
- Jika HR memberikan kriteria jumlah atau batas tertentu (seperti "top 3", "pilih 4 pelamar terbaik"), berikan analisis terperinci (### lengkap) pada bagian **## Rekomendasi Utama** sebanyak maksimal N orang (N = angka yang diminta, default = 3 jika tidak disebutkan), lalu sisa pelamar lainnya dimasukkan secara singkat pada bagian **## Kandidat Lain (Ringkas)**.

Setiap ulasan blok heading-3 (###) wajib mengikuti format detail berikut:
### [Salin Nama Nyata dari Teks CV] (CV: nama_file.pdf)
- **Skor kecocokan JD:** XX/100
- **Bukti eksplisit di CV (hanya dari CV orang ini):**
  - Tuliskan maksimal 2 bullet point saja yang komplit dan kohesif:
    - Bullet 1: **Pengalaman:** Gabungkan rincian tugas/tanggung jawab/pengalaman kerja riil yang paling relevan (misal: "Terbiasa mengoperasikan mesin pengemasan modern, menjaga kebersihan, serta melakukan pencatatan hasil produksi").
    - Bullet 2: **Skill:** Gabungkan daftar keahlian khusus/sertifikasi yang relevan (misal: "Personal Hygiene, HSSE, dan Kerja Sama Tim").
  - **PENTING/Wajib:** JANGAN memecah pengalaman menjadi banyak baris/bullet pendek yang tidak lengkap. JANGAN sertakan baris judul posisi/pekerjaan atau nama perusahaan (misal: "Modern Packaging Technician – PT Maju Beverage Indonesia") sebagai bukti, karena itu hanya bagian dari nama jabatan lama, bukan bukti kompetensi/kriteria riil.
  - Jika dokumen kosong atau tidak relevan, tulis secara tegas: "CV tidak mencantumkan pengalaman kerja, skill teknis, proyek, atau peran apa pun yang diminta".
- **Tidak tercantum / tidak ada bukti di CV:**
  - Sebutkan kriteria atau kualifikasi penting pada dokumen JD yang tidak mampu dibuktikan keberadaannya di dalam teks CV pelamar ini.
- **Alasan skor:**
  - Jelaskan dasar logis penentuan nilai skor di atas dengan menghubungkan ketersediaan bukti konkret terhadap kesenjangan (*gap*) pemenuhan kriteria lowongan.
- **Kelebihan:**
  - Poin plus dan potensi kompetensi pelamar yang tertulis di teks dokumen.
- **Kekurangan / risiko:**
  - Hambatan kualifikasi atau kesenjangan kompetensi teknis pelamar terhadap posisi terkait.
- **Rekomendasi:**
  - Pernyataan tindakan lanjut yang selaras dengan hasil bukti (Contoh: Layak dilanjutkan ke interview teknis / Perlu klarifikasi portofolio / Tidak direkomendasikan).

Akhiri seluruh respons dengan satu paragraf kalimat penutup yang objektif, natural, dan konsisten terhadap isi ulasan evaluasi di atas tanpa memuat informasi yang saling bertentangan.

PENTING — SESUAIKAN GAYA JAWABAN DENGAN PERTANYAAN:
- Sapaan / obrolan ringan → balas natural (tidak perlu format screening).
- Profil atau data diri **satu** kandidat → ## Profil [Nama]; bullet pendidikan, pengalaman, skill, kontak; **tanpa** skor JD dan **tanpa** kandidat lain.
- Screening / perbandingan / siapa cocok → format komparatif dan skor seperti di atas.

=== KONTEN KONTEKS MULAI ===
`;

    const promptBodyOverride = recruiterPromptForKind(queryKind, false, followUp);
    const sysPrompt = stitchRecruiterSysPrompt(
      promptBodyOverride || recruiterPromptBody,
      limitedContext
    );

    const askedN = typeof query === "string" ? extractRequestedCandidateCount(query) : null;
    const criteriaMeta =
      activeCriteria &&
        typeof activeCriteria === "object" &&
        typeof activeCriteria.title === "string"
        ? {
          id: String(activeCriteria.id ?? ""),
          title: String(activeCriteria.title),
          department: String(activeCriteria.department ?? ""),
          fullText: String(activeCriteria.fullText ?? activeCriteria.title),
        }
        : null;

    const userMsg =
      typeof query === "string"
        ? `Pertanyaan atau instruksi HR:\n${qStr}` +
        (askedN != null
          ? `\n\n[Instruksi sistem — wajib dipatuhi: HR meminta paling banyak **${askedN}** kandidat terpilih/terbaik. Di bagian peringkat (## Rekomendasi utama atau setara) beri **paling banyak ${askedN}** blok ### berisi bukti; **dilarang** lebih dari ${askedN}. Selebihnya ringkas saja di ## Kandidat lain.]`
          : "") +
        (criteriaMeta
          ? `\n\n[Kriteria lowongan dipilih HR di panel: **${criteriaMeta.title}** (${criteriaMeta.department}). ` +
          `Jika HR bertanya "posisi ini", "di posisi tersebut", atau "paling cocok" tanpa menyebut role, evaluasi terhadap kriteria **${criteriaMeta.title}**.]`
          : "") +
        buildQueryUserAddon(limitedContext, qStr, askedN, criteriaMeta, {
          followUp,
          history: chatHistory as ChatHistoryTurn[],
        })
        : qStr;

    const openRouterMaxTokens = followUp ? OPENROUTER_FOLLOWUP_MAX_TOKENS : OPENROUTER_MAX_TOKENS;
    const groqFollowUpMaxTokens = 280;

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
            messages: buildLlmMessages(sysPrompt, chatHistory, userMsg, false),
            temperature: RECRUITER_TEMPERATURE,
            max_tokens: openRouterMaxTokens,
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
          answer = applyPostProcessAnswer(
            answer,
            limitedContext,
            qStr,
            askedN,
            criteriaMeta,
            postProcessOpts
          );
          return NextResponse.json({ answer, sources: [] });
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.log("OpenRouter timeout/error, fallback ke Groq:", msg);
        // lanjut ke Groq
      }
    }

    // Fallback Groq: 413/TPM → potong konteks dulu (bukan hanya max_tokens), lalu tunggu hint API
    if (groqKey) {
      console.log("Menggunakan Groq API...");
      try {
        let groqCtx = truncateGroqContext(limitedContext, GROQ_INITIAL_CONTEXT_CHARS);
        let groqMaxTokens = followUp ? groqFollowUpMaxTokens : GROQ_DEFAULT_MAX_TOKENS;
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
              messages: buildLlmMessages(
                stitchRecruiterSysPrompt(
                  recruiterPromptForKind(queryKind, true, followUp) || recruiterPromptGroqBody,
                  groqCtx
                ),
                chatHistory,
                userMsg,
                true
              ),
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
            answer = applyPostProcessAnswer(
              answer,
              limitedContext,
              qStr,
              askedN,
              criteriaMeta,
              postProcessOpts
            );
            return NextResponse.json({ answer, sources: [] });
          }

          const errorMsg = data?.error?.message || "";
          console.warn(
            `[Groq] request failed (attempt ${groqAttempt + 1}/${maxGroqAttempts}) status=${resp.status}`,
            errorMsg || JSON.stringify(data?.error || {})
          );

          if (isGroqTpmOrOversized(resp.status, errorMsg)) {
            const isTpmWindow =
              resp.status === 429 &&
              (errorMsg.toLowerCase().includes("tokens per minute") ||
                errorMsg.toLowerCase().includes("(tpm)"));

            if (tpmGroqCapIdx < GROQ_TPM_CONTEXT_CAPS.length) {
              const cap = GROQ_TPM_CONTEXT_CAPS[tpmGroqCapIdx++];
              groqCtx = truncateGroqContext(limitedContext, cap);
              groqMaxTokens = Math.min(groqMaxTokens, GROQ_TPM_RETRY_MAX_TOKENS);
              console.warn(
                `[Groq] ukuran permintaan besar (status ${resp.status}); potong konteks ~${cap} chars, max_tokens=${groqMaxTokens}`
              );
              if (isTpmWindow) {
                const waitMs = parseGroqRetryAfterMs(errorMsg) ?? 1500;
                console.warn(`[Groq] TPM; waiting ${waitMs}ms before retry after trim`);
                await sleep(waitMs);
              }
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
            const waitMs = parseGroqRetryAfterMs(errorMsg) ?? 2600;
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
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        return NextResponse.json({ error: `Groq error: ${message}` }, { status: 500 });
      }
    }

    return NextResponse.json({
      answer: "Tidak ditemukan di dokumen.",
      sources: [],
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message || "Gagal memproses query." }, { status: 500 });
  }
}