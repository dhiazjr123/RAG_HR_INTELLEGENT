import { NextResponse } from "next/server";
import { buffer as streamToBuffer } from "node:stream/consumers";
import { PassThrough } from "node:stream";

export const runtime = "nodejs";

type ReportMessage = { role: string; text: string };

type Body = {
  title?: string;
  createdAt?: string;
  documentNames?: string[];
  messages?: ReportMessage[];
};

function sanitizeFilename(name: string): string {
  const s = (name || "laporan").replace(/[^\w\-. \u00C0-\u024F]+/g, "_").trim();
  return s.slice(0, 120) || "laporan";
}

function safeDocxText(s: string, max = 50000): string {
  return (s || "")
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, " ")
    .slice(0, max);
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Body JSON tidak valid" }, { status: 400 });
  }

  const title = typeof body.title === "string" && body.title.trim() ? body.title.trim() : "Laporan sesi";
  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (messages.length === 0) {
    return NextResponse.json({ error: "Tidak ada pesan untuk diekspor" }, { status: 400 });
  }
  if (messages.length > 500) {
    return NextResponse.json({ error: "Terlalu banyak pesan (maks. 500)" }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const officegen = require("officegen") as (opts: {
    type: string;
    orientation?: string;
    pageMargins?: Record<string, number>;
  }) => {
    createP: (opts?: { align?: string }) => { addText: (t: string, o?: Record<string, unknown>) => void };
    generate: (stream: PassThrough) => void;
    on: (ev: string, fn: (err: unknown) => void) => void;
  };

  const docx = officegen({
    type: "docx",
    orientation: "portrait",
    pageMargins: { top: 1000, left: 1000, bottom: 1000, right: 1000 },
  });

  const titleP = docx.createP({ align: "center" });
  titleP.addText(safeDocxText(title, 500), { bold: true, font_size: 28 });

  const meta = docx.createP({ align: "center" });
  meta.addText(`Dibuat: ${body.createdAt || new Date().toISOString()}`, { italic: true, font_size: 20 });

  docx.createP();

  const docNames = Array.isArray(body.documentNames)
    ? body.documentNames.filter((n) => typeof n === "string")
    : [];
  if (docNames.length > 0) {
    docx.createP().addText("Dokumen konteks:", { bold: true, font_size: 22 });
    for (const n of docNames.slice(0, 200)) {
      docx.createP().addText(`• ${safeDocxText(n, 500)}`);
    }
    docx.createP();
  }

  for (const m of messages) {
    const role = m.role === "user" ? "user" : "assistant";
    const label = role === "user" ? "HR" : "Asisten AI";
    const h = docx.createP();
    h.addText(`${label}:`, { bold: true, font_size: 22, color: role === "user" ? "1a365d" : "2f855a" });

    const lines = safeDocxText(typeof m.text === "string" ? m.text : "").split("\n");
    for (const line of lines) {
      const p = docx.createP();
      p.addText(line.length ? line : " ");
    }
    docx.createP();
  }

  const stream = new PassThrough();
  const bufPromise = streamToBuffer(stream);

  await new Promise<void>((resolve, reject) => {
    docx.on("error", reject);
    docx.generate(stream);
    resolve();
  });

  const buf = await bufPromise;

  const fname = sanitizeFilename(title) + ".docx";
  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${fname}"`,
    },
  });
}
