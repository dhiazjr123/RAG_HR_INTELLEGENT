// app/api/rag/ingest/route.ts
import { NextResponse } from "next/server";
import { spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ParsedBlock = { id: string; label: string; content: string };

function extOf(name = "") {
  return (name.split(".").pop() || "").toLowerCase();
}

function asBlocksFromLines(lines: string[]): ParsedBlock[] {
  if (!lines?.length) return [{ id: "1", label: "Text 1", content: "(empty)" }];
  return lines.map((l, i) => ({ id: String(i + 1), label: `Row ${i + 1}`, content: l.trim() }));
}

function buildCvBlocks(text: string): ParsedBlock[] {
  const headingRegex = /^(work experience|experience|pengalaman|projects?|project|portfolio|portofolio|skills?|keahlian|technical skills|soft skills|education|pendidikan|certifications?|sertifikasi|achievements?|prestasi|languages?|bahasa|summary|ringkasan|about|tentang|profile|profil)\b/i;
  const lines = String(text || "").replace(/\r/g, "").split("\n");
  const blocks: { label: string; content: string[] }[] = [];
  let current = { label: "General", content: [] as string[] };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (headingRegex.test(line)) {
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
    // Create temporary file
    const tempFile = path.join(os.tmpdir(), `pdf-${Date.now()}-${Math.random().toString(36).substring(7)}.pdf`);
    fs.writeFileSync(tempFile, buffer);

    // Normalize path untuk Windows (ganti backslash dengan forward slash)
    const normalizedPath = tempFile.replace(/\\/g, '/');

    // Run pdfplumber via Python
    const pythonScript = `
import pdfplumber
import sys

try:
    pdf = pdfplumber.open(r'${normalizedPath}')
    text = ""
    for page in pdf.pages:
        # Extract text
        page_text = page.extract_text() or ""
        text += page_text
        
        # Extract tables if any
        tables = page.extract_tables()
        if tables:
            for table in tables:
                text += "\\n\\n[TABLE]\\n"
                for row in table:
                    if row:
                        text += " | ".join([str(cell) if cell else "" for cell in row]) + "\\n"
        
        text += "\\n"
    print(text)
except Exception as e:
    print(f"ERROR: {e}", file=sys.stderr)
    sys.exit(1)
`;

    const pythonProcess = spawn("python", ["-c", pythonScript]);

    let output = "";
    let error = "";

    pythonProcess.stdout.on("data", (data) => {
      output += data.toString();
    });

    pythonProcess.stderr.on("data", (data) => {
      error += data.toString();
    });

    pythonProcess.on("close", (code) => {
      // Cleanup
      if (fs.existsSync(tempFile)) {
        try {
          fs.unlinkSync(tempFile);
        } catch (e) {
          // Ignore cleanup errors
        }
      }

      if (code !== 0) {
        reject(new Error(error || "Pdfplumber parsing failed"));
      } else {
        resolve(output.trim());
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

// Fallback ke pdf-parse jika pdfplumber tidak tersedia
async function pdfParseFallback(buf: Buffer): Promise<string> {
  try {
    const pdfParse = await import("pdf-parse");
    const data = await pdfParse.default(buf);
    let text = String(data.text || "").trim();
    
    // Improvement: Deteksi dan format tabel
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

    let parsedBlocks: ParsedBlock[] = [];
    let usedDocling = false;

    // ======= 0) Coba Docling lokal via Python (tanpa service HTTP) =======
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
        // Fallback ke pdf-parse
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
    }
    // ======= 3) Fallback ke parser lama untuk non-PDF atau jika semua gagal =======
    else if (!parsedBlocks.length) {
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

    return NextResponse.json({ parsedBlocks, usedDocling });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Gagal memproses file." }, { status: 500 });
  }
}
