// app/api/rag/ingest/route.ts
import { NextResponse } from "next/server";
import { spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

type ParsedBlock = { id: string; label: string; content: string };

function extOf(name = "") {
  return (name.split(".").pop() || "").toLowerCase();
}

function asBlocksFromLines(lines: string[]): ParsedBlock[] {
  if (!lines?.length) return [{ id: "1", label: "Text 1", content: "(empty)" }];
  return lines.map((l, i) => ({ id: String(i + 1), label: `Row ${i + 1}`, content: l.trim() }));
}

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

// EKSEKUSI TESSERACT LEWAT NODE.JS MURNI (FORMAT .mjs BYPASS)
async function runTesseractOcr(imagePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      // Wajib menggunakan .mjs agar Node menganggapnya sebagai modul ES murni
      const scriptPath = path.join(os.tmpdir(), `ocr-worker-${Date.now()}-${Math.random().toString(36).substring(7)}.mjs`);
      const cacheDir = os.tmpdir().replace(/\\/g, "/");
      const safeImgPath = imagePath.replace(/\\/g, "/");
      
      // Script ini berjalan aman, mendukung CJS/ESM
      const scriptContent = `
import { createRequire } from 'module';
const require = createRequire(process.cwd() + '/');

async function run() {
  try {
    const Tesseract = require('tesseract.js');
    const options = { cachePath: '${cacheDir}', logger: () => {} };
    let result;
    try {
      result = await Tesseract.recognize('${safeImgPath}', 'ind+eng', options);
    } catch {
      result = await Tesseract.recognize('${safeImgPath}', 'eng', options);
    }

    console.log("===OCR_START===");
    console.log(result.data.text);
    console.log("===OCR_END===");
    process.exit(0);
  } catch (e) {
    console.error("OCR_FATAL_ERROR:", e.message);
    process.exit(1);
  }
}

run();
`;
      fs.writeFileSync(scriptPath, scriptContent);

      const proc = spawn("node", [scriptPath], { cwd: process.cwd() });
      let out = "";
      let err = "";

      proc.stdout.on("data", (data) => { out += data.toString(); });
      proc.stderr.on("data", (data) => { err += data.toString(); });

      proc.on("close", (code) => {
        try { fs.unlinkSync(scriptPath); } catch {}
        
        if (code !== 0) {
          reject(new Error(err || "Proses OCR Tesseract gagal."));
        } else {
          // Ambil hanya teks hasil OCR
          const match = out.match(/===OCR_START===\n([\s\S]*?)\n===OCR_END===/);
          if (match) {
            resolve(match[1].trim());
          } else {
            resolve(out.trim());
          }
        }
      });

      setTimeout(() => {
        proc.kill();
        try { fs.unlinkSync(scriptPath); } catch {}
        reject(new Error("Proses pemindaian gambar terlalu lama (Timeout)."));
      }, 60000);
    } catch (e: any) {
      reject(new Error("Gagal menyiapkan lingkungan OCR: " + e.message));
    }
  });
}

// PDF Plumber extraction
async function parseWithPdfplumber(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const tempFile = path.join(os.tmpdir(), `pdf-${Date.now()}-${Math.random().toString(36).substring(7)}.pdf`);
    const outTxt = `${tempFile}.extracted.txt`;
    fs.writeFileSync(tempFile, buffer);

    const normalizedPath = tempFile.replace(/\\/g, "/");
    const normalizedOut = outTxt.replace(/\\/g, "/");

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
      } catch {}
      if (fs.existsSync(tempFile)) {
        try { fs.unlinkSync(tempFile); } catch {}
      }

      if (code !== 0) {
        reject(new Error(error || "Pdfplumber parsing failed"));
      } else {
        resolve(text.trim());
      }
    });

    setTimeout(() => {
      pythonProcess.kill();
      if (fs.existsSync(tempFile)) {
        try { fs.unlinkSync(tempFile); } catch {}
      }
      reject(new Error("Pdfplumber parsing timeout"));
    }, 30000);
  });
}

// Fallback PDF Parse dengan aman
async function pdfParseFallback(buf: Buffer): Promise<string> {
  try {
    const { createRequire } = await import("node:module");
    const requireCJS = createRequire(path.join(process.cwd(), "package.json"));
    const pdfParseMod = requireCJS("pdf-parse");
    const run = typeof pdfParseMod === "function" ? pdfParseMod : pdfParseMod.default;
    const data = await run(buf);
    let text = String(data?.text || "").trim();
    text = improveTableDetection(text);
    return text;
  } catch (error: any) {
    throw new Error(`PDF parsing failed: ${error.message}`);
  }
}

function improveTableDetection(text: string): string {
  const lines = text.split(/\r?\n/);
  const improvedLines: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.includes('PKB') || line.includes('BBNKB') || line.includes('SWDKLLJ')) {
      let j = i;
      while (j < lines.length && j < i + 20) {
        const nextLine = lines[j].trim();
        
        if (nextLine.match(/^[A-Z\s]+[0-9,\.]+/)) {
          improvedLines.push(nextLine);
        }
        else if (nextLine.includes('|') && nextLine.match(/[0-9,\.]/)) {
          improvedLines.push(nextLine);
        }
        else if (nextLine.match(/^[0-9,\.\s]+$/)) {
          improvedLines.push(nextLine);
        }
        j++;
      }
      i = j - 1; 
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
      } catch {}
    }

    const DOC_SERVICE_URL = process.env.DOC_SERVICE_URL || "http://localhost:8008/extract";
    try {
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
            parsedBlocks = blocksFromTextPreferCv(String(j.raw_text));
            usedDocling = true;
          }
        }
      }
    } catch {}

    if (!parsedBlocks.length && (ext === "pdf" || mime.includes("pdf"))) {
      try {
        const text = await parseWithPdfplumber(buf);
        parsedBlocks = blocksFromTextPreferCv(text);
      } catch (pdfplumberError: any) {
        try {
          const text = await pdfParseFallback(buf);
          parsedBlocks = blocksFromTextPreferCv(text);
        } catch (fallbackError: any) {
          throw new Error("Gagal memproses PDF.");
        }
      }
      
      const pdfTextLen = parsedBlocks.reduce((s, b) => s + (b.content || "").length, 0);
      if (pdfTextLen < 80) {
        try {
          const { fromBuffer } = await import("pdf2pic");
          const convert = fromBuffer(buf, { format: "png", width: 1200, height: 1600 });
          const ocrParts: string[] = [];
          
          for (const pageNum of [1, 2, 3]) {
            try {
              const result = await convert(pageNum, { responseType: "buffer" });
              const imgBuf = (result as { buffer?: Buffer })?.buffer;
              if (!imgBuf?.length) break;
              const imgPath = path.resolve(os.tmpdir(), `pdf-p${pageNum}-${Date.now()}.png`);
              fs.writeFileSync(imgPath, imgBuf);
              
              try {
                const pageText = await runTesseractOcr(imgPath);
                if (pageText.length > 20) {
                  ocrParts.push(pageText);
                }
              } finally {
                if (fs.existsSync(imgPath)) try { fs.unlinkSync(imgPath); } catch {}
              }
            } catch {
              break;
            }
          }
          const ocrText = ocrParts.join("\n\n").trim();
          if (ocrText.length > 50) parsedBlocks = blocksFromTextPreferCv(ocrText);
        } catch (pdfOcrErr: any) {}
      }
    }
    
    // ======= GAMBAR (JPG, PNG, dll) — OCR Bypass Next.js =======
    if (!parsedBlocks.length && isImage) {
      const tempFile = path.resolve(os.tmpdir(), `img-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`);
      try {
        fs.writeFileSync(tempFile, buf);
        const text = await runTesseractOcr(tempFile);
        if (text) {
          parsedBlocks = blocksFromTextPreferCv(text);
        }
      } catch (ocrError: any) {
        throw new Error(`Gagal membaca teks dari gambar: ${ocrError?.message}`);
      } finally {
        if (fs.existsSync(tempFile)) try { fs.unlinkSync(tempFile); } catch {}
      }
    }

    if (!parsedBlocks.length && !isImage) {
      try {
        const text = await pdfParseFallback(buf);
        const lines = text.split(/\r?\n/).filter(l => /^\d+\.\s+/.test(l.trim()));
        parsedBlocks = lines.length
          ? asBlocksFromLines(lines)
          : blocksFromTextPreferCv(text);
      } catch (error: any) {
        throw new Error("Gagal mengekstrak teks dokumen.");
      }
    }

    if (!parsedBlocks.length && isImage) {
      throw new Error("Tidak ada teks yang terdeteksi dari gambar. Pastikan resolusi cukup jelas.");
    }

    return NextResponse.json({ parsedBlocks, usedDocling });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Gagal memproses file." }, { status: 500 });
  }
}