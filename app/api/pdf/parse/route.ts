// app/api/pdf/parse/route.ts — ekstraksi PDF (selaras dengan /api/rag/ingest)
import { NextResponse } from "next/server";
import { spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function parseWithPdfplumber(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const tempFile = path.join(os.tmpdir(), `pdf-${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`);
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

    const timeout = setTimeout(() => {
      pythonProcess.kill();
      try {
        if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
      } catch {
        /* ignore */
      }
      try {
        if (fs.existsSync(outTxt)) fs.unlinkSync(outTxt);
      } catch {
        /* ignore */
      }
      reject(new Error("Pdfplumber parsing timeout"));
    }, 45000);

    pythonProcess.on("close", (code) => {
      clearTimeout(timeout);
      let text = "";
      try {
        if (fs.existsSync(outTxt)) {
          text = fs.readFileSync(outTxt, "utf8");
          fs.unlinkSync(outTxt);
        }
      } catch {
        /* ignore */
      }
      if (fs.existsSync(tempFile)) {
        try {
          fs.unlinkSync(tempFile);
        } catch {
          /* ignore */
        }
      }

      if (code !== 0) {
        reject(new Error(error || "Pdfplumber parsing failed"));
      } else {
        resolve(text.trim());
      }
    });
  });
}

async function pdfParseFallback(buf: Buffer): Promise<string> {
  const { createRequire } = await import("node:module");
  const require = createRequire(path.join(process.cwd(), "package.json"));
  const pdfParseMod = require("pdf-parse");
  const run = typeof pdfParseMod === "function" ? pdfParseMod : pdfParseMod.default;
  const data = await run(buf);
  return String(data?.text || "").trim();
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "File tidak ditemukan." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let text = "";

    try {
      text = await parseWithPdfplumber(buffer);
    } catch (e) {
      console.warn("Pdfplumber failed, trying pdf-parse:", e);
      try {
        text = await pdfParseFallback(buffer);
      } catch (e2) {
        console.error("All PDF parse methods failed:", e2);
        return NextResponse.json(
          { error: "Gagal parse PDF. Pastikan Python + pdfplumber terinstall, atau file tidak rusak." },
          { status: 500 }
        );
      }
    }

    if (!text || text.length < 5) {
      return NextResponse.json(
        {
          error:
            "Hampir tidak ada teks terbaca. PDF mungkin hasil scan — unggah lewat Kelola Dokumen agar OCR dijalankan.",
          text: text || "",
        },
        { status: 422 }
      );
    }

    return NextResponse.json({ text });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal parse PDF";
    console.error("Pdfplumber error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
