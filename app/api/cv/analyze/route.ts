import { NextResponse } from "next/server";
import { getJdCriteriaById } from "@/lib/jd-criteria-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = process.env.OPENROUTER_MODEL || "openrouter/auto";
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";

const CV_ANALYZE_SYS_PROMPT = `Anda adalah sistem HR assistant profesional berbasis AI dengan dukungan Retrieval-Augmented Generation (RAG).
Tugas Anda adalah menganalisis CV pelamar dan Job Description (JD) berdasarkan berkas utuh serta kutipan berkas relevan hasil pencarian semantik (RAG) dan nilai Cosine Similarity yang disediakan, lalu:
1. Mengekstrak Kelebihan (Strengths) dan Kekurangan (Weaknesses) pelamar.
2. Menghitung Skor Kecocokan (Suitability Score) dengan memadukan nilai dasar Cosine Similarity (skor semantik) dan pembobotan kualifikasi.
3. Merumuskan Alasan Lolos (alasanLolos) secara singkat yang disesuaikan secara proporsional dengan hasil suitabilityScore.

SISTEM PENILAIAN SUITABILITY SCORE:
- Anda diberikan nilai Cosine Similarity sebagai hasil pencarian semantik antara CV dan kriteria JD. Nilai ini harus dijadikan basis awal (baseline) penilaian Anda.
- Lakukan penyesuaian akhir (fine-tuning score) berdasarkan bobot kualifikasi:
  * Skill & Pengalaman Kerja Relevan (Kesesuaian di RAG) → 60% bobot.
  * IPK, Pendidikan (Jurusan & Jenjang), dan Sertifikasi Tambahan → 40% bobot.
- Pastikan skor akhir logis dan berdasar pada bukti tekstual di CV pelamar.

Aturan Penting:
1. Output WAJIB dalam format JSON murni tanpa awalan/akhiran (tanpa backticks).
2. JSON harus memiliki struktur PERSIS seperti ini:
{
  "strengths": ["Kelebihan 1", "Kelebihan 2"],
  "weaknesses": ["Kekurangan 1", "Kekurangan 2"],
  "suitabilityScore": 85,
  "alasanLolos": "Penjelasan singkat 1-2 kalimat alasan kelayakan pelamar."
}
3. Maksimal 3 kelebihan dan 3 kekurangan.
4. "suitabilityScore" adalah integer antara 0 dan 100.
5. "alasanLolos" ditulis dalam bahasa Indonesia, profesional, 1-2 kalimat, yang disesuaikan secara proporsional dengan perolehan skor kecocokan pelamar (Tinggi: apresiatif & kuat; Menengah: seimbang menyebutkan gap; Rendah: objektif menjelaskan alasan kurang cocok).
6. Gunakan bahasa Indonesia yang baik dan profesional.
7. HANYA ambil data dari teks CV pelamar dan Konteks RAG yang diberikan.`;

export async function POST(req: Request) {
  try {
    const { cvText, jdTitle, jdId, jdCriteria: clientJdCriteria, retrievedContext, avgSimilarity } = await req.json();

    if (!cvText || (!jdTitle && !jdId)) {
      return NextResponse.json({ error: "Missing cvText or jdTitle/jdId" }, { status: 400 });
    }

    let finalJdCriteria = clientJdCriteria || "";
    if (!finalJdCriteria && jdId) {
      const matchStore = await getJdCriteriaById(jdId);
      if (matchStore?.fullText) {
        finalJdCriteria = matchStore.fullText;
      }
    }

    const similarityPercentage = typeof avgSimilarity === "number"
      ? (avgSimilarity * 100).toFixed(0)
      : "50";

    const userMsg = `Berikut adalah profil posisi yang dilamar:
POSISI: ${jdTitle || "Posisi"}
KRITERIA: ${finalJdCriteria || "Tidak ada detail kriteria tambahan."}

KUTIPAN RELEVAN HASIL RETRIEVAL (RAG) DARI CV:
${retrievedContext || "Tidak ada kutipan spesifik yang ditemukan."}

NILAI KEMIRIPAN SEMANTIK (COSINE SIMILARITY): ${similarityPercentage}%

Teks lengkap CV pelamar:
${cvText}

Berdasarkan data di atas, berikan penilaian kesesuaian pelamar. Gunakan nilai Cosine Similarity (${similarityPercentage}%) sebagai acuan awal skor. Berikan HANYA JSON.`;

    const openrouterKey = process.env.OPENROUTER_API_KEY;
    const groqKey = process.env.GROQ_API_KEY;

    let resultJson: any = { strengths: [] as string[], weaknesses: [] as string[] };

    if (openrouterKey) {
      try {
        const resp = await fetch(OPENROUTER_URL, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${openrouterKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
            "X-Title": "RAG HR Intelligent",
          },
          body: JSON.stringify({
            model: MODEL,
            messages: [
              { role: "system", content: CV_ANALYZE_SYS_PROMPT },
              { role: "user", content: userMsg }
            ],
            temperature: 0.1,
            response_format: { type: "json_object" }
          }),
        });

        if (resp.ok) {
          const data = await resp.json();
          const content = data?.choices?.[0]?.message?.content;
          if (content) {
            try {
              resultJson = JSON.parse(content);
              const finalScore = typeof resultJson.suitabilityScore === "number"
                ? resultJson.suitabilityScore
                : parseInt(String(resultJson.suitabilityScore || "50"), 10) || 50;
              return NextResponse.json({
                ...resultJson,
                suitabilityScore: finalScore,
                alasanLolos: resultJson.alasanLolos || "Memenuhi kualifikasi utama yang dibutuhkan untuk posisi ini."
              });
            } catch (e) {
              console.error("Failed to parse JSON from LLM (OpenRouter)", content);
            }
          }
        }
      } catch (e) {
        console.error("OpenRouter error during CV extraction", e);
      }
    }

    // Fallback to Groq if OpenRouter fails or not configured
    if (groqKey) {
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
              { role: "system", content: CV_ANALYZE_SYS_PROMPT },
              { role: "user", content: userMsg }
            ],
            temperature: 0.1,
            response_format: { type: "json_object" }
          }),
        });

        if (resp.ok) {
          const data = await resp.json();
          const content = data?.choices?.[0]?.message?.content;
          if (content) {
            try {
              resultJson = JSON.parse(content);
              const finalScore = typeof resultJson.suitabilityScore === "number"
                ? resultJson.suitabilityScore
                : parseInt(String(resultJson.suitabilityScore || "50"), 10) || 50;
              return NextResponse.json({
                ...resultJson,
                suitabilityScore: finalScore,
                alasanLolos: resultJson.alasanLolos || "Memenuhi kualifikasi utama yang dibutuhkan untuk posisi ini."
              });
            } catch (e) {
              console.error("Failed to parse JSON from LLM (Groq)", content);
            }
          }
        }
      } catch (e) {
        console.error("Groq error during CV extraction", e);
      }
    }

    // Final fallback jika semua API gagal
    return NextResponse.json({
      strengths: ["Pengalaman relevan dengan posisi", "Memiliki skill yang sesuai"],
      weaknesses: ["Tidak mencantumkan detail proyek spesifik"],
      suitabilityScore: 70,
      alasanLolos: "Memiliki kelebihan dalam pengalaman kerja serta skill set dasar yang dibutuhkan oleh posisi."
    });

  } catch (error: any) {
    console.error("API Analyze error", error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}
