// app/api/rag/ingest/route.ts
import { NextResponse } from "next/server";
import { spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// OCR gambar/PDF bisa memakan waktu 1–2 menit (unduh model Tesseract, dll.)
export const maxDuration = 120;

type ParsedBlock = { id: string; label: string; content: string };

function extOf(name = "") {
  return (name.split(".").pop() || "").toLowerCase();
}

function asBlocksFromLines(lines: string[]): ParsedBlock[] {
  if (!lines?.length) return [{ id: "1", label: "Text 1", content: "(empty)" }];
  return lines.map((l, i) => ({ id: String(i + 1), label: `Row ${i + 1}`, content: l.trim() }));
}

// Headings untuk CV dan Job Description (JD) / lowongan
const CV_JD_HEADING_REGEX = /^(work experience|experience|pengalaman|projects?|project|portfolio|portofolio|skills?|keahlian|technical skills|soft skills|education|pendidikan|certifications?|sertifikasi|achievements?|prestasi|languages?|bahasa|summary|ringkasan|about|tentang|profile|profil|job description|deskripsi pekerjaan|job title|posisi|lowongan|requirements?|persyaratan|qualifications?|kualifikasi|kriteria|responsibilities?|tanggung jawab|must have|nice to have|benefits?|benefit|tunjangan|compensation|gaji)\b/i;

function buildCvBlocks(text: string): ParsedBlock[] {
  const lines = String(text || "").replace(/\r/g, "").split("\n");
  const blocks: { label: string; content: string[] }[] = [];
  let current = { label: "General", content: [] as string[] };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (CV_JD_HEADING_REGEX.test(line)) {
      if (current.content.length) blocks.push(current);
      current = { label: line, content: [] };
      continue;
    }
    current.content.push(line);
  }
  if (current.content.length) blocks.push(current);

  if (!blocks.length) return [];

  return blocks.map((b, i) => ({
    id: String(i + 1),
    label: b.label,
    content: b.content.join("\n"),
  }));
}

function blocksFromTextPreferCv(text: string): ParsedBlock[] {
  const cvBlocks = buildCvBlocks(text);
  if (cvBlocks.length >= 2) return cvBlocks;

  const lines = String(text || "").split(/\r?\n/).filter(Boolean);
  return asBlocksFromLines(lines);
}

// PDF Plumber extraction (preferred for better table extraction)
async function parseWithPdfplumber(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const tempFile = path.join(os.tmpdir(), `pdf-${Date.now()}-${Math.random().toString(36).substring(7)}.pdf`);
    const outTxt = `${tempFile}.extracted.txt`;
    fs.writeFileSync(tempFile, buffer);

    const normalizedPath = tempFile.replace(/\\/g, "/");
    const normalizedOut = outTxt.replace(/\\/g, "/");

    // Tulis hasil ke file UTF-8 (hindari error Windows: charmap tidak bisa encode emoji di stdout)
    const pythonScript = `
import pdfplumber
import sys

try:
    pdf = pdfplumber.open(r'${normalizedPath}')
    text = ""
    for page in pdf.pages:
        page_text = page.extract_text() or ""
        text += page_text
        tables = page.extract_tables()
        if tables:
            for table in tables:
                text += "\\n\\n[TABLE]\\n"
                for row in table:
                    if row:
                        text += " | ".join([str(cell) if cell else "" for cell in row]) + "\\n"
        text += "\\n"
    with open(r'${normalizedOut}', "w", encoding="utf-8", errors="replace") as f:
        f.write(text)
except Exception as e:
    print(str(e), file=sys.stderr)
    sys.exit(1)
`;

    const pythonProcess = spawn("python", ["-c", pythonScript], {
      env: { ...process.env, PYTHONIOENCODING: "utf-8", PYTHONUTF8: "1" },
    });

    let error = "";

    pythonProcess.stderr.on("data", (data) => {
      error += data.toString("utf8");
    });

    pythonProcess.on("close", (code) => {
      let text = "";
      try {
        if (fs.existsSync(outTxt)) {
          text = fs.readFileSync(outTxt, "utf8");
          fs.unlinkSync(outTxt);
        }
      } catch {
        // ignore
      }
      if (fs.existsSync(tempFile)) {
        try {
          fs.unlinkSync(tempFile);
        } catch {
          // ignore
        }
      }

      if (code !== 0) {
        reject(new Error(error || "Pdfplumber parsing failed"));
      } else {
        resolve(text.trim());
      }
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      pythonProcess.kill();
      if (fs.existsSync(tempFile)) {
        try {
          fs.unlinkSync(tempFile);
        } catch (e) {
          // Ignore cleanup errors
        }
      }
      reject(new Error("Pdfplumber parsing timeout"));
    }, 30000);
  });
}

// Fallback: muat pdf-parse lewat require (CJS) dari root proyek — stabil di Next.js vs dynamic import
async function pdfParseFallback(buf: Buffer): Promise<string> {
  try {
    const { createRequire } = await import("node:module");
    const require = createRequire(path.join(process.cwd(), "package.json"));
    const pdfParseMod = require("pdf-parse");
    const run = typeof pdfParseMod === "function" ? pdfParseMod : pdfParseMod.default;
    const data = await run(buf);
    let text = String(data?.text || "").trim();
    text = improveTableDetection(text);
    return text;
  } catch (error: any) {
    throw new Error(`PDF parsing failed: ${error.message}`);
  }
}

// Function untuk improve deteksi tabel pajak
function improveTableDetection(text: string): string {
  const lines = text.split(/\r?\n/);
  const improvedLines: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Deteksi header tabel pajak
    if (line.includes('PKB') || line.includes('BBNKB') || line.includes('SWDKLLJ')) {
      // Cari baris dengan angka (kemungkinan data tabel)
      let j = i;
      while (j < lines.length && j < i + 20) { // Maksimal 20 baris ke bawah
        const nextLine = lines[j].trim();
        
        // Deteksi baris dengan nama kasir dan angka
        if (nextLine.match(/^[A-Z\s]+[0-9,\.]+/)) {
          improvedLines.push(nextLine);
        }
        // Deteksi baris dengan format: Nama | Angka | Angka | Angka
        else if (nextLine.includes('|') && nextLine.match(/[0-9,\.]/)) {
          improvedLines.push(nextLine);
        }
        // Deteksi baris dengan angka saja (subtotal)
        else if (nextLine.match(/^[0-9,\.\s]+$/)) {
          improvedLines.push(nextLine);
        }
        
        j++;
      }
      i = j - 1; // Skip ke baris terakhir yang diproses
    } else {
      improvedLines.push(line);
    }
  }
  
  return improvedLines.join('\n');
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "File tidak ditemukan di FormData." }, { status: 400 });
    }

    const f = file as File;
    const name = (f as any).name || "document";
    const mime = f.type || "";
    const ext = extOf(name);

    const ab = await f.arrayBuffer();
    const buf = Buffer.from(ab);

    const imageExts = ["jpg", "jpeg", "png", "gif", "webp"];
    const isImage = imageExts.includes(ext) || mime.startsWith("image/");

    let parsedBlocks: ParsedBlock[] = [];
    let usedDocling = false;

    // ======= 0) Coba Docling lokal — SKIP untuk gambar (gunakan OCR saja, hindari binary jadi teks) =======
    if (!isImage) {
      try {
        const mod: any = await import("@/lib/doclingExtractor");
        if (mod && typeof mod.extractDocument === "function") {
          const result = await mod.extractDocument(buf, name, mime);
          if (result?.success) {
            const text = String(result.text || "");
            parsedBlocks = blocksFromTextPreferCv(text);
            usedDocling = true;
          }
        }
      } catch {
        // diam-diam lanjut ke opsi lain
      }
    }

    // ======= 1) Coba Docling service jika tersedia =======
    const DOC_SERVICE_URL = process.env.DOC_SERVICE_URL || "http://localhost:8008/extract";
    try {
      // hanya untuk PDF / DOCX
      if (!parsedBlocks.length && (ext === "pdf" || mime.includes("pdf") || ext === "docx")) {
        const fd = new FormData();
        fd.append("file", new Blob([buf], { type: mime || "application/pdf" }), name);

        const r = await fetch(DOC_SERVICE_URL, { method: "POST", body: fd as any });
        if (r.ok) {
          const j: any = await r.json();
          const rowLines: string[] = j?.row_lines || [];
          if (rowLines.length) {
            parsedBlocks = asBlocksFromLines(rowLines);
            usedDocling = true;
          } else if (j?.raw_text) {
            // fallback ke raw markdown dari docling
            parsedBlocks = blocksFromTextPreferCv(String(j.raw_text));
            usedDocling = true;
          }
        }
      }
    } catch {
      // diam-diam fallback
    }

    // ======= 2) Coba PDF Plumber untuk PDF (lebih baik untuk tabel) =======
    if (!parsedBlocks.length && (ext === "pdf" || mime.includes("pdf"))) {
      try {
        const text = await parseWithPdfplumber(buf);
        parsedBlocks = blocksFromTextPreferCv(text);
      } catch (pdfplumberError: any) {
        console.warn("Pdfplumber failed, falling back to pdf-parse:", pdfplumberError.message);
        try {
          const text = await pdfParseFallback(buf);
          const lines = text.split(/\r?\n/).filter(l => /^\d+\.\s+/.test(l.trim()));
          parsedBlocks = lines.length
            ? asBlocksFromLines(lines)
            : blocksFromTextPreferCv(text);
        } catch (fallbackError: any) {
          console.error("All PDF parsing methods failed:", fallbackError.message);
          throw new Error("Gagal memproses PDF. Pastikan Python dan pdfplumber terinstall.");
        }
      }
      const pdfTextLen = parsedBlocks.reduce((s, b) => s + (b.content || "").length, 0);
      if (pdfTextLen < 80) {
        try {
          const { fromBuffer } = await import("pdf2pic");
          const convert = fromBuffer(buf, { format: "png", width: 1200, height: 1600 });
          const result = await convert(1, { responseType: "buffer" });
          const imgBuf = (result as { buffer?: Buffer })?.buffer;
          if (imgBuf && imgBuf.length > 0) {
            const imgPath = path.resolve(os.tmpdir(), `pdf-page1-${Date.now()}.png`);
            fs.writeFileSync(imgPath, imgBuf);
            try {
              const Tesseract = await import("tesseract.js");
              const { createWorker } = Tesseract;
              let worker;
              try {
                worker = await createWorker("ind+eng", 1, { logger: () => {} });
              } catch {
                worker = await createWorker("eng", 1, { logger: () => {} });
              }
              try {
                const { data } = await worker.recognize(imgPath);
                const ocrText = (data?.text || "").trim();
                if (ocrText.length > 50) parsedBlocks = blocksFromTextPreferCv(ocrText);
              } finally {
                await worker.terminate();
              }
            } finally {
              if (fs.existsSync(imgPath)) try { fs.unlinkSync(imgPath); } catch {}
            }
          }
        } catch (pdfOcrErr: any) {
          console.warn("PDF-to-image OCR fallback failed (install GraphicsMagick for image-only PDFs):", pdfOcrErr?.message);
        }
      }
    }
    // ======= 3) Gambar (JPG, PNG, dll) — OCR dengan Tesseract.js (createWorker API) =======
    if (!parsedBlocks.length && isImage) {
      const tempFile = path.resolve(os.tmpdir(), `img-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`);
      try {
        fs.writeFileSync(tempFile, buf);
        const Tesseract = await import("tesseract.js");
        const { createWorker } = Tesseract;
        let worker;
        try {
          worker = await createWorker("ind+eng", 1, { logger: () => {} });
        } catch (langError: any) {
          worker = await createWorker("eng", 1, { logger: () => {} });
        }
        try {
          const { data } = await worker.recognize(tempFile);
          const text = (data?.text || "").trim();
          if (text) parsedBlocks = blocksFromTextPreferCv(text);
        } finally {
          await worker.terminate();
        }
      } catch (ocrError: any) {
        console.warn("OCR (Tesseract) failed for image:", ocrError?.message);
        throw new Error("Gagal mengekstrak teks dari gambar. Pastikan file gambar jelas dan berisi teks.");
      } finally {
        if (fs.existsSync(tempFile)) try { fs.unlinkSync(tempFile); } catch {}
      }
    }

    // ======= 4) Fallback untuk non-PDF/non-image atau jika semua gagal =======
    if (!parsedBlocks.length && !isImage) {
      try {
        const text = await pdfParseFallback(buf);
        const lines = text.split(/\r?\n/).filter(l => /^\d+\.\s+/.test(l.trim()));
        parsedBlocks = lines.length
          ? asBlocksFromLines(lines)
          : blocksFromTextPreferCv(text);
      } catch (error: any) {
        console.error("Fallback parsing failed:", error.message);
        throw new Error("Gagal memproses file.");
      }
    }

    if (!parsedBlocks.length && isImage) {
      throw new Error("Tidak ada teks yang terdeteksi dari gambar. Coba gambar dengan resolusi lebih tinggi atau kontras lebih jelas.");
    }

    return NextResponse.json({ parsedBlocks, usedDocling });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Gagal memproses file." }, { status: 500 });
  }
}
