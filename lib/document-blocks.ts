/** Blok teks terstruktur dari hasil ekstraksi dokumen (CV/JD) */

export type ParsedBlock = { id: string; label: string; content: string };

const CV_JD_HEADING_REGEX =
  /^(work experience|experience|pengalaman|projects?|project|portfolio|portofolio|skills?|keahlian|technical skills|soft skills|education|pendidikan|certifications?|sertifikasi|achievements?|prestasi|languages?|bahasa|summary|ringkasan|about|tentang|profile|profil|data\s+pribadi|identitas|biodata|job description|deskripsi pekerjaan|job title|posisi|lowongan|requirements?|persyaratan|qualifications?|kualifikasi|kriteria|responsibilities?|tanggung jawab|must have|nice to have|benefits?|benefit|tunjangan|compensation|gaji)\b/i;

function asBlocksFromLines(lines: string[]): ParsedBlock[] {
  if (!lines?.length) return [{ id: "1", label: "Text 1", content: "(empty)" }];
  return lines.map((l, i) => ({ id: String(i + 1), label: `Row ${i + 1}`, content: l.trim() }));
}

export function buildCvBlocks(text: string): ParsedBlock[] {
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

/** Pecah teks panjang menjadi blok ~size karakter di batas paragraf */
export function splitTextToBlocks(text: string, blockSize = 2400): ParsedBlock[] {
  const out: ParsedBlock[] = [];
  const clean = (text || "").replace(/\r/g, "").trim();
  if (!clean) return [{ id: "1", label: "Text 1", content: "(empty file)" }];

  let i = 0;
  let idx = 1;
  while (i < clean.length) {
    let end = Math.min(i + blockSize, clean.length);
    if (end < clean.length) {
      const slice = clean.slice(i, end);
      const lastBreak = Math.max(slice.lastIndexOf("\n\n"), slice.lastIndexOf("\n"));
      if (lastBreak > blockSize * 0.45) end = i + lastBreak;
    }
    const chunk = clean.slice(i, end).trim();
    if (chunk) {
      out.push({ id: String(idx), label: `Section ${idx}`, content: chunk });
      idx++;
    }
    i = end;
  }
  return out.length ? out : [{ id: "1", label: "Text 1", content: clean }];
}

/** Prioritas blok per heading CV/JD; fallback paragraf */
export function blocksFromTextPreferCv(text: string): ParsedBlock[] {
  const cvBlocks = buildCvBlocks(text);
  if (cvBlocks.length >= 2) return cvBlocks;

  const paras = String(text || "")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 8);
  if (paras.length >= 2) {
    return paras.map((p, i) => ({ id: String(i + 1), label: `Paragraph ${i + 1}`, content: p }));
  }

  const lines = String(text || "").split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length >= 3 && lines.length <= 80) {
    return asBlocksFromLines(lines);
  }

  return splitTextToBlocks(text);
}

export function joinBlocksToText(blocks: ParsedBlock[]): string {
  return blocks.map((b) => b.content).filter(Boolean).join("\n\n");
}
