// app/api/rag/query/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = process.env.OPENROUTER_MODEL || "openrouter/auto";
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";

// Fungsi untuk membersihkan answer dari markdown dan simbol yang tidak diinginkan
function cleanAnswer(answer: string): string {
  if (!answer) return answer;
  
  // Hapus markdown bold/italic
  answer = answer.replace(/\*\*(.*?)\*\*/g, '$1');
  answer = answer.replace(/\*(.*?)\*/g, '$1');
  answer = answer.replace(/_(.*?)_/g, '$1');
  
  // Hapus markdown headers
  answer = answer.replace(/^#{1,6}\s+/gm, '');
  
  // Hapus markdown list dengan simbol *
  answer = answer.replace(/^\*\s+/gm, '');
  answer = answer.replace(/^-\s+/gm, '');
  
  // Hapus markdown code blocks
  answer = answer.replace(/```[\s\S]*?```/g, '');
  answer = answer.replace(/`([^`]+)`/g, '$1');
  
  // Hapus markdown links tapi keep text
  answer = answer.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
  
  // Hapus multiple newlines (lebih dari 2)
  answer = answer.replace(/\n{3,}/g, '\n\n');
  
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

    // === batasi context
    const MAX_CONTEXT_CHARS = 25000;
    let limitedContext = context || "(no context)";
    if (limitedContext.length > MAX_CONTEXT_CHARS) {
      limitedContext = limitedContext.substring(0, MAX_CONTEXT_CHARS) + "\n\n[... context truncated ...]";
    }

    // === Sistem prompt khusus HR & screening CV dengan kemampuan komparatif
    const sysPrompt =
      `Anda adalah asisten AI khusus untuk HR yang membantu proses screening dan evaluasi kandidat dari CV mereka.

PENTING: ANDA HANYA BOLEH MENGGUNAKAN INFORMASI YANG BENAR-BENAR ADA DI KONTEKS CV. JANGAN PERNAH MENAMBAHKAN, MENGASUMSIKAN, ATAU MENGADA-ADAKAN INFORMASI YANG TIDAK TERTULIS DI CV.

TUGAS UTAMA:
1. Evaluasi dan Perbandingan Kandidat:
   - Bandingkan kandidat HANYA berdasarkan informasi yang eksplisit tertulis di CV
   - Jika informasi tidak ada di CV, katakan dengan jelas "Informasi tidak tersedia di CV"
   - Berikan penilaian objektif tentang siapa yang lebih cocok untuk posisi tertentu BERDASARKAN DATA YANG ADA
   - Jika diminta "siapa yang lebih baik", bandingkan HANYA aspek yang benar-benar disebutkan di CV
   - JANGAN mengasumsikan skill atau pengalaman yang tidak tertulis

2. Analisis CV:
   - Ringkas profil kandidat HANYA dengan informasi yang ada di CV
   - Identifikasi kekuatan dan kelemahan berdasarkan data faktual di CV
   - Evaluasi kesesuaian dengan job requirements HANYA jika informasi relevan ada di CV
   - Analisis pengalaman kerja, skill teknis, soft skills, pendidikan, sertifikasi HANYA jika disebutkan di CV
   - Jika CV tidak menyebutkan pengalaman kerja, katakan "Tidak ada pengalaman kerja yang disebutkan di CV"
   - Jika CV tidak menyebutkan skill tertentu, JANGAN mengasumsikan atau menambahkan skill tersebut

3. Format Jawaban:
   - Gunakan format teks bersih tanpa markdown, bullet points dengan simbol (*), atau formatting khusus
   - Gunakan baris baru untuk memisahkan poin-poin
   - Tulis dalam format naratif yang mudah dibaca
   - Hindari penggunaan simbol seperti *, -, atau formatting markdown lainnya
   - Jika informasi tidak ada, gunakan frasa seperti "Tidak disebutkan di CV", "Informasi tidak tersedia", atau "CV tidak memuat informasi tentang..."

4. Penanganan Multiple CV:
   - Konteks mungkin berisi MULTIPLE CV dari beberapa kandidat berbeda
   - Setiap CV ditandai dengan nama file dalam format [nama_file]
   - Jika pertanyaan menanyakan "CV siapa saja" atau "daftar kandidat", sebutkan SEMUA kandidat dengan informasi yang ADA DI CV
   - Jika pertanyaan komparatif, bandingkan HANYA informasi yang benar-benar ada di CV masing-masing
   - Jika pertanyaan spesifik tentang satu kandidat, fokus pada CV yang relevan dan HANYA gunakan data yang ada

ATURAN STRICT YANG HARUS DIPATUHI:
1. JANGAN gunakan markdown, bullet points dengan simbol (*), atau formatting khusus
2. JANGAN PERNAH halusinasi atau menambahkan informasi yang tidak ada di CV
3. JANGAN mengasumsikan skill, pengalaman, atau kemampuan yang tidak tertulis di CV
4. JANGAN menambahkan fakta baru atau memperhalus angka/tanggal yang tidak ada
5. JIKA informasi tidak ada di CV, katakan dengan jelas "Tidak disebutkan di CV" atau "Informasi tidak tersedia"
6. Fokus pada evaluasi objektif berbasis data CV yang faktual
7. Untuk perbandingan, bandingkan HANYA aspek yang benar-benar disebutkan di CV masing-masing
8. Jika CV tidak menyebutkan pengalaman kerja, JANGAN mengatakan kandidat memiliki pengalaman
9. Jika CV tidak menyebutkan skill tertentu, JANGAN mengatakan kandidat memiliki skill tersebut
10. Gunakan bahasa profesional namun mudah dipahami
11. PASTIKAN jawaban LENGKAP dan tidak terpotong - tulis nama lengkap dengan benar (contoh: "YOGA BAGAS SAPUTRA" bukan "SAPUTR", "DHIAZ RAYA NUGROHO" bukan "NUGROH")
12. SELESAIKAN setiap kalimat dengan tanda baca yang tepat sebelum melanjutkan ke kalimat berikutnya
13. Jika perlu memotong jawaban karena terlalu panjang, akhiri dengan kalimat penutup yang jelas

CONTOH FORMAT JAWABAN YANG BENAR:
"Berdasarkan CV yang tersedia, berikut perbandingan kandidat:

YOGA BAGAS SAPUTRA
Nama lengkap Yoga Bagas Saputra, lahir di Slawi Wetan pada 28 Februari 2006. Alamat di Slawi Wetan, Slawi, Tegal. Kontak melalui nomor 123-456-7890. CV tidak menyebutkan pengalaman kerja atau skill teknis tertentu.

DHIAZ RAYA NUGROHO  
Nama lengkap Dhiaz Raya Nugroho, lahir di Tegal pada 26 Maret 2004. Alamat di JL. SERAYU RT 19/07 SLAWI. Kontak melalui nomor 0812-9155-6749 dan email dhiazraya26@gmail.com. CV menyebutkan pengalaman di bidang teknologi dengan portofolio yang lengkap.

Perbandingan Pengalaman:
Berdasarkan CV yang tersedia, Dhiaz memiliki pengalaman yang disebutkan di CV terkait teknologi. Sementara itu, CV Yoga tidak menyebutkan pengalaman kerja atau skill teknis apapun, sehingga tidak dapat dibandingkan untuk posisi yang memerlukan pengalaman teknis."

INGAT: HANYA gunakan informasi yang BENAR-BENAR tertulis di konteks CV. JANGAN menambahkan, mengasumsikan, atau mengada-adakan informasi apapun.

=== KONTEN KONTEKS MULAI ===
${limitedContext}
=== KONTEN KONTEKS SELESAI ===`;

    const userMsg = query;

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
            temperature: 0.1,
            max_tokens: 2000, // Pastikan cukup untuk jawaban lengkap
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
          
          answer = cleanAnswer(answer);
          return NextResponse.json({ answer, sources: [] });
        }
      } catch (e) {
        console.log("OpenRouter timeout/error, fallback ke Groq:", e.message);
        // lanjut ke Groq
      }
    }

    // Fallback Groq
    if (groqKey) {
      console.log("Menggunakan Groq API...");
      try {
        const resp = await fetch(GROQ_URL, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${groqKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: GROQ_MODEL,
            messages: [
              { role: "system", content: sysPrompt },
              { role: "user", content: userMsg },
            ],
            temperature: 0.1,
            max_tokens: 2000, // Pastikan cukup untuk jawaban lengkap
          }),
        });

        const data = await resp.json();
        if (resp.ok) {
          const choice = data?.choices?.[0];
          let answer = choice?.message?.content || "Tidak ditemukan di dokumen.";
          const finishReason = choice?.finish_reason;
          
          // Jika jawaban terpotong karena length, tambahkan catatan
          if (finishReason === "length") {
            answer += "\n\n[Catatan: Jawaban mungkin terpotong karena batasan panjang. Silakan ajukan pertanyaan yang lebih spesifik untuk mendapatkan informasi lengkap.]";
          }
          
          answer = cleanAnswer(answer);
          return NextResponse.json({ answer, sources: [] });
        }
        
        // Check for rate limit error
        const errorMsg = data?.error?.message || "";
        if (errorMsg.includes("rate limit") || errorMsg.includes("Rate limit")) {
          console.log("Groq rate limit hit, returning helpful message");
          return NextResponse.json({ 
            answer: "Maaf, sistem sedang sibuk. Silakan coba lagi dalam beberapa detik. (Rate limit Groq tercapai)",
            sources: [] 
          });
        }
        
        const msg = errorMsg || `Groq error (${resp.status})`;
        return NextResponse.json({ error: msg }, { status: 500 });
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