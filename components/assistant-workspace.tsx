"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Send,
  Bot,
  User,
  FileText,
  Copy,
  ChevronDown,
  ChevronRight,
  Save,
  FileType,
  Printer,
  Trash2,
  Sparkles,
  Briefcase,
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
  FileSearch,
  Award,
} from "lucide-react";
import { useDocuments } from "@/components/documents-context";
import FileUploadButton from "@/components/file-upload-button";
import { ChatMarkdown } from "@/components/chat-markdown";
import { JdCriteriaPanel } from "@/components/jd-criteria-panel";
import { formatCvIdentityLine, resolveApplicantName } from "@/lib/recruiter-ranking";
import { blocksFromTextPreferCv } from "@/lib/document-blocks";
import {
  criteriaToParsedBlocks,
  getCriteriaById,
  JD_CRITERIA_STORAGE_KEY,
} from "@/lib/partner-jd-criteria";
import { useJdCriteria } from "@/lib/jd-criteria-client";

import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
// Client-side PDF parsing (avoid server worker issues)
// We import lazily inside the function to keep SSR clean

/* ========= Types ========= */
type Msg = { id: string; role: "user" | "assistant"; text: string };

/** Laporan sesi HR (tersimpan per user di localStorage) */
type HrReport = {
  id: string;
  title: string;
  createdAt: string;
  documentNames: string[];
  messages: Msg[];
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function safeDownloadBasename(title: string): string {
  return (title || "laporan").replace(/[^\w\-. ]+/g, "_").trim().slice(0, 80) || "laporan";
}

/** Ekspor PDF langsung (tanpa dialog print) menggunakan html2pdf.js */
async function generateAndDownloadPdf(title: string, documentNames: string[], messages: Msg[]) {
  try {
    // Load html2pdf from CDN to avoid Next.js Webpack SSR issues with legacy libraries
    const html2pdf = await new Promise<any>((resolve, reject) => {
      if ((window as any).html2pdf) {
        return resolve((window as any).html2pdf);
      }
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
      script.onload = () => resolve((window as any).html2pdf);
      script.onerror = () => reject(new Error("Gagal memuat html2pdf.js dari CDN"));
      document.head.appendChild(script);
    });
    
    const parts: string[] = [];
    parts.push("<div style=\"padding: 10px; font-family: system-ui, -apple-system, sans-serif; color: #111; line-height: 1.45;\">");
    parts.push(`<h1 style="font-size: 1.25rem; margin: 0 0 8px;">${escapeHtml(title)}</h1>`);
    parts.push(`<div style="color: #555; font-size: 13px; margin-bottom: 20px;">${escapeHtml(new Date().toLocaleString("id-ID"))}</div>`);
    
    if (documentNames.length > 0) {
      parts.push("<p style=\"font-size: 14px; font-weight: 600; margin: 0 0 8px;\">Dokumen konteks</p><ul style=\"font-size: 13px; margin: 0 0 20px 20px; padding: 0;\">");
      for (const n of documentNames) {
        parts.push(`<li style="margin-bottom: 4px;">${escapeHtml(n)}</li>`);
      }
      parts.push("</ul><hr style=\"margin: 20px 0; border: none; border-top: 1px solid #e2e8f0;\" />");
    }
    
    for (const m of messages) {
      const isUser = m.role === "user";
      const lab = isUser ? "HR" : "Asisten AI";
      const bg = isUser ? "#eff6ff" : "#f8fafc";
      const borderColor = isUser ? "#bfdbfe" : "#e2e8f0";
      parts.push(
        `<div style="background: ${bg}; border: 1px solid ${borderColor}; border-radius: 8px; padding: 12px 14px; margin-bottom: 14px; page-break-inside: avoid;">`,
        `<div style="font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px; color: #64748b;">${lab}</div>`,
        `<div style="font-size: 13px; white-space: pre-wrap; font-family: system-ui;">${escapeHtml(m.text)}</div>`,
        `</div>`
      );
    }
    parts.push("</div>");

    const element = document.createElement("div");
    element.innerHTML = parts.join("");
    // Must be in DOM for html2canvas to measure it correctly, but don't use -9999px which breaks it
    element.style.position = "absolute";
    element.style.top = "0";
    element.style.left = "0";
    element.style.width = "800px";
    element.style.zIndex = "-9999";
    element.style.opacity = "0";
    element.style.pointerEvents = "none";
    document.body.appendChild(element);
    
    const opt = {
      margin:       15,
      filename:     `${safeDownloadBasename(title)}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    await html2pdf().set(opt).from(element).save();
    
    // Cleanup
    document.body.removeChild(element);
  } catch (error) {
    console.error("PDF generation error:", error);
    throw error;
  }
}
type ParsedBlock = { id: string; label: string; content: string };
type DocItem = { id: string; name: string; status?: string; file?: File };

/** Saran pertanyaan — hanya mengisi input, tidak auto-kirim */
const CHAT_SUGGESTIONS = [
  "Siapa kandidat paling cocok untuk posisi ini?",
  "Ranking top 3 kandidat beserta alasan skor",
  "Apa gap utama yang perlu diklarifikasi saat wawancara?",
];

/* ========= Utils ========= */
const wait = (ms: number) => new Promise((res) => setTimeout(res, ms));

// ===== Helpers for client-side PDF parsing =====
async function parsePdfInBrowser(file: File): Promise<string> {
  const { getDocument } = (await import("pdfjs-dist")) as any;
  const buf = new Uint8Array(await file.arrayBuffer());
  const pdf = await getDocument({ data: buf, disableWorker: true }).promise;
  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const items = (content.items || []) as any[];
    // Group by Y (line) with tolerance
    const linesMap = new Map<number, { y: number; items: any[] }>();
    const tol = 2; // px
    for (const it of items) {
      const y = (it?.transform?.[5] as number) ?? 0;
      let key = y;
      // find existing key within tolerance
      for (const k of Array.from(linesMap.keys())) {
        if (Math.abs(k - y) <= tol) { key = k; break; }
      }
      if (!linesMap.has(key)) linesMap.set(key, { y: key, items: [] });
      linesMap.get(key)!.items.push(it);
    }
    // Sort lines top->bottom (y descending in PDF), then items by x
    const lines = Array.from(linesMap.values()).sort((a, b) => b.y - a.y);
    const pageLines = lines.map(line => {
      const sorted = line.items.sort((a, b) => ((a.transform?.[4] ?? 0) - (b.transform?.[4] ?? 0)));
      return sorted.map(it => it?.str ?? "").join(" ");
    });
    const pageText = pageLines.map(s => s.replace(/\s+/g, " ").trim()).join("\n").trim();
    if (pageText) fullText += pageText + "\n";
  }
  return fullText.trim();
}

function splitToBlocksClient(text: string, blockSize = 1200): ParsedBlock[] {
  const out: ParsedBlock[] = [];
  const clean = (text || "").replace(/\r/g, "").trim();
  if (!clean) return [{ id: "1", label: "Text 1", content: "(empty file)" }];
  let i = 0,
    idx = 1;
  while (i < clean.length) {
    out.push({ id: String(idx), label: `Text ${idx}`, content: clean.slice(i, i + blockSize).trim() });
    i += blockSize;
    idx++;
  }
  return out;
}

/** Batas kirim ke /api/rag/query — selaraskan dengan MAX_CONTEXT_CHARS di server */
const RAG_QUERY_BODY_MAX_CHARS = 48000;
/** Riwayat chat multi-turn yang dikirim ke API (≈10 giliran user+assistant) */
const CHAT_HISTORY_MAX_MESSAGES = 20;
const RAG_QUERY_JD_MAX_CHARS = 6500;
const RAG_QUERY_MIN_CHARS_PER_CV = 1400;

const CV_EXCERPT_STOPWORDS = new Set([
  "yang", "dengan", "untuk", "dari", "pada", "adalah", "akan", "atau", "dan", "di", "ke",
  "ini", "itu", "saya", "kami", "anda", "mereka", "cocok", "kandidat", "rekomendasi",
  "siapa", "mana", "bagaimana", "berapa", "the", "and", "for", "with", "from",
]);

/** Pola bukti domain umum (game dev, mobile, dll.) — dipakai saat CV harus dipotong */
function relevancePatternsForQuery(query: string, jdText: string): RegExp[] {
  const patterns: RegExp[] = [
    /\bgame\b/i,
    /\bgaming\b/i,
    /game\s*dev/i,
    /game\s*development/i,
    /pengembang\s*game/i,
    /permainan/i,
    /unity/i,
    /unreal/i,
    /godot/i,
    /cocos/i,
    /phaser/i,
    /gameplay/i,
    /level\s*design/i,
    /portofolio\s*game/i,
    /membuat\s*game/i,
    /mobile\s*game/i,
    /studio\s*game/i,
  ];
  const blob = `${query} ${jdText}`.toLowerCase();
  for (const w of blob.split(/[^a-zA-Z0-9\u00C0-\u024F]+/)) {
    if (w.length < 4 || CV_EXCERPT_STOPWORDS.has(w)) continue;
    patterns.push(new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
  }
  return patterns;
}

/**
 * Saat CV melebihi jatah karakter: pertahankan header (nama) + paragraf yang cocok pertanyaan/JD,
 * bukan hanya awal file (sering membuang pengalaman game di halaman bawah).
 */
/** Pertahankan blok PENGALAMAN / KETERAMPILAN saat CV dipotong */
function preserveCvKeySections(fullText: string, maxSectionChars = 2200): string {
  const parts: string[] = [];
  for (const label of ["PENGALAMAN", "KETERAMPILAN", "KEAHLIAN", "SKILL", "EXPERIENCE"]) {
    const re = new RegExp(`(${label}[^\\n]*\\n[\\s\\S]*?)(?=\\n[A-Z]{3,}[^\\na-z]|$)`, "i");
    const m = fullText.match(re);
    if (m?.[1]) {
      const block = m[1].trim().slice(0, maxSectionChars);
      if (block.length > 20 && !parts.some((p) => p.includes(block.slice(0, 40)))) {
        parts.push(block);
      }
    }
  }
  if (parts.length === 0) return "";
  return "\n\n--- [bagian penting CV: pengalaman & keterampilan] ---\n\n" + parts.join("\n\n");
}

function smartCvExcerpt(fullText: string, maxChars: number, query: string, jdText: string): string {
  if (fullText.length <= maxChars) return fullText;

  const keySections = preserveCvKeySections(fullText);
  const patterns = relevancePatternsForQuery(query, jdText);
  const headerSize = Math.min(950, Math.floor(maxChars * 0.38));
  const header = fullText.slice(0, headerSize);
  let used = header.length;

  const paras = fullText.split(/\n+/).map((p) => p.trim()).filter((p) => p.length > 8);
  const scored: { text: string; score: number }[] = [];

  for (const p of paras) {
    if (header.includes(p)) continue;
    let score = 0;
    for (const re of patterns) {
      if (re.test(p)) score += 4;
    }
    if (/pengalaman|experience|proyek|project|skill|keahlian|pekerjaan|posisi|role/i.test(p)) {
      score += 1;
    }
    if (score > 0) scored.push({ text: p, score });
  }

  scored.sort((a, b) => b.score - a.score);

  const chunks: string[] = [header];
  if (keySections && !header.includes(keySections.slice(0, 40))) {
    chunks.push(keySections);
    used += keySections.length;
  }
  const relMarker = "\n\n--- [cuplikan CV relevan pertanyaan HR] ---\n\n";
  if (scored.length > 0 && used + relMarker.length < maxChars - 100) {
    let rel = relMarker;
    for (const { text } of scored) {
      const add = (rel.endsWith("\n\n") || rel === relMarker ? "" : "\n") + text;
      if (used + rel.length + add.length > maxChars - 150) break;
      rel += add + "\n";
    }
    chunks.push(rel);
    used += rel.length;
  }

  const tailBudget = maxChars - used - 90;
  if (tailBudget > 250) {
    const tail = fullText.slice(Math.max(headerSize, fullText.length - tailBudget));
    if (!chunks.join("").includes(tail.slice(0, 60))) {
      chunks.push("\n\n--- [lanjutan CV] ---\n\n" + tail);
    }
  }

  let result = chunks.join("");
  if (result.length > maxChars) {
    result =
      result.slice(0, maxChars) +
      '\n\n[... isi CV dipersingkat; prioritaskan cuplikan relevan di atas — baca seluruh segmen sebelum menyimpulkan ...]';
  }
  return result;
}

function isCandidateMentionedInQuery(query: string, name: string | null, filename: string): boolean {
  const q = query.toLowerCase();
  const fileClean = filename.toLowerCase().replace(/\.pdf$/i, "");
  if (q.includes(fileClean)) return true;
  if (!name) return false;
  const n = name.toLowerCase().trim();
  if (n.length < 3) return false;
  if (q.includes(n)) return true;
  
  const parts = n.split(/\s+/).filter(p => p.length >= 3);
  if (parts.length === 0) return false;
  
  const stopwords = new Set(["dan", "atau", "yang", "dari", "dengan", "untuk", "cv", "pdf", "profil", "profile"]);
  const matchedParts = parts.filter(p => !stopwords.has(p) && q.includes(p));
  return matchedParts.length >= 1;
}

/**
 * Susun konteks chat: daftar semua file CV di awal + bagi jatah karakter per CV
 * supaya tidak hanya 2–3 dokumen pertama yang terbaca sebelum pemotongan.
 */
function buildBalancedRagContext(blocks: ParsedBlock[], hrQuery = ""): string {
  type Group = { kind: "CV" | "JOB DESCRIPTION"; file: string; chunks: string[] };
  const order: string[] = [];
  const byKey = new Map<string, Group>();

  for (const b of blocks) {
    const m = b.label.match(/^\[(CV|JOB DESCRIPTION) - ([^\]]+)\]/);
    if (!m) continue;
    const kind = m[1] as "CV" | "JOB DESCRIPTION";
    const file = m[2];
    const key = `${kind}\0${file}`;
    if (!byKey.has(key)) {
      order.push(key);
      byKey.set(key, { kind, file, chunks: [] });
    }
    byKey.get(key)!.chunks.push(`[${b.label}] ${b.content}`);
  }

  if (order.length === 0) {
    return blocks.map((b) => `[${b.label}] ${b.content}`).join("\n\n");
  }

  const jdKeys = order.filter((k) => byKey.get(k)!.kind === "JOB DESCRIPTION");
  const cvKeys = order.filter((k) => byKey.get(k)!.kind === "CV");

  let jdJoined = jdKeys
    .map((k) => byKey.get(k)!.chunks.join("\n\n"))
    .join("\n\n---\n\n");
  if (jdJoined.length > RAG_QUERY_JD_MAX_CHARS) {
    jdJoined =
      jdJoined.slice(0, RAG_QUERY_JD_MAX_CHARS) +
      "\n\n[... teks JD dipersingkat agar ruang untuk semua CV ...]";
  }

  const rosterJd =
    jdKeys.length > 0
      ? jdKeys.map((k, i) => `${i + 1}. ${byKey.get(k)!.file}`).join("\n")
      : "(tidak ada file JD dalam dokumen ini)";

  const rosterCv =
    cvKeys.length > 0
      ? cvKeys
        .map((k, i) => {
          const g = byKey.get(k)!;
          const full = g.chunks.join("\n\n");
          const name = resolveApplicantName(full, g.file);
          return name
            ? `${i + 1}. ${g.file} — pelamar: **${name}**`
            : `${i + 1}. ${g.file}`;
        })
        .join("\n")
      : "(tidak ada file CV)";

  const roster =
    `=== DAFTAR SUMBER (semua nama file di bawah harus dipertimbangkan jika pertanyaan HR mengarah ke semua kandidat) ===\n` +
    `Job description / lowongan:\n${rosterJd}\n\n` +
    `CV kandidat (${cvKeys.length} file):\n${rosterCv}\n\n` +
    `Instruksi: (a) Jika HR meminta **bandingkan semua / screening semua / sebutkan satu-satu / semua kandidat**, beri satu blok ### per file pada daftar di atas. (b) Jika HR hanya bertanya **siapa paling cocok / terbaik / top / N kandidat / prioritas**, beri **tepat N** (atau 3 jika tidak disebut) di Rekomendasi utama hanya yang punya bukti positif terhadap role yang ditanya; sisanya ringkas di Kandidat lain **tanpa mengulang** nama yang sudah di utama. (c) Baca **seluruh** segmen [[[CV_ONLY]]] termasuk bagian [cuplikan CV relevan] — jangan hanya paragraf awal. **Judul setiap blok kandidat harus memuat nama orang dari teks CV** + (CV: nama file).\n` +
    `[Selesai daftar]\n\n`;

  const mentionedKeys = new Set<string>();
  for (const k of cvKeys) {
    const g = byKey.get(k)!;
    const full = g.chunks.join("\n\n");
    const name = resolveApplicantName(full, g.file);
    if (isCandidateMentionedInQuery(hrQuery, name, g.file)) {
      mentionedKeys.add(k);
    }
  }

  const jdSectionLen = jdJoined ? jdJoined.length + 32 : 0;
  const nCv = cvKeys.length;
  const cvJoinOverhead = nCv > 0 ? 120 + nCv * 48 : 0;
  let remaining = RAG_QUERY_BODY_MAX_CHARS - roster.length - jdSectionLen - cvJoinOverhead;
  if (remaining < 200) remaining = 200;

  // Prioritize budget allocation (up to 7500 chars) for query-mentioned candidates
  const MENTIONED_CV_BUDGET = 7500;
  let mentionedBudgetUsed = 0;
  for (const k of cvKeys) {
    if (mentionedKeys.has(k)) {
      const g = byKey.get(k)!;
      const fullText = g.chunks.join("\n\n");
      const len = Math.min(MENTIONED_CV_BUDGET, fullText.length);
      mentionedBudgetUsed += len;
    }
  }

  const nonMentionedCount = cvKeys.length - mentionedKeys.size;
  let remainingForOthers = remaining - mentionedBudgetUsed;
  if (remainingForOthers < 200) remainingForOthers = 200;

  const perNonMentionedCv = nonMentionedCount > 0 ? Math.floor(remainingForOthers / nonMentionedCount) : remainingForOthers;

  let perCv = nCv > 0 ? Math.floor(remaining / nCv) : remaining;
  if (nCv > 0 && perCv < RAG_QUERY_MIN_CHARS_PER_CV) {
    perCv = Math.max(nCv <= 3 ? 1800 : 600, Math.floor(remaining / nCv));
  }
  if (nCv <= 4 && perCv < 2200) {
    perCv = Math.min(2800, Math.max(perCv, Math.floor(remaining / Math.max(nCv, 1))));
  }

  const cvSections: string[] = [];
  const jdHintForExcerpt = jdJoined.slice(0, 3000);

  for (const k of cvKeys) {
    const g = byKey.get(k)!;
    const fullText = g.chunks.join("\n\n");
    let chunk = fullText;
    
    let budget = perCv;
    if (mentionedKeys.has(k)) {
      budget = MENTIONED_CV_BUDGET;
    } else if (mentionedKeys.size > 0) {
      budget = perNonMentionedCv;
    }

    if (chunk.length > budget) {
      chunk = smartCvExcerpt(fullText, budget, hrQuery, jdHintForExcerpt);
    }
    const safeName = g.file.replace(/\]/g, ")").replace(/\[/g, "(");
    const identityLine = formatCvIdentityLine(fullText, safeName);
    cvSections.push(
      `[[[CV_ONLY filename:${safeName}]]]\n` +
      identityLine +
      chunk +
      `\n\n[[[/CV_ONLY filename:${safeName}]]]`
    );
  }

  const parts: string[] = [roster];
  if (jdJoined) {
    parts.push(`=== TEKS JD / LOWONGAN ===\n${jdJoined}`);
  }
  if (cvSections.length) {
    parts.push(
      `=== TEKS CV PER KANDIDAT (satu file = satu kelompok) ===\n\n` +
      cvSections.join("\n\n---------- CV_LAINNYA ----------\n\n")
    );
  }
  return parts.join("\n\n");
}

async function mockExtract(file: File): Promise<Record<string, string>> {
  await wait(400);
  return { title: file.name, authors: "Penulis A; Penulis B", year: "2018", keywords: "contoh, demo" };
}

/** Ingest file → parsedBlocks (pipeline sama dengan upload: Docling/OCR/tabel) */
async function autoIngest(
  file: File | null | undefined,
  docId: string,
  setParsedById: React.Dispatch<React.SetStateAction<Record<string, ParsedBlock[]>>>,
  setOpenBlocks: React.Dispatch<React.SetStateAction<Record<string, Record<string, boolean>>>>,
  existingParsedText?: string
) {
  let blocks: ParsedBlock[] = [];
  let ingestError: Error | null = null;

  if (existingParsedText && existingParsedText.trim().length > 60) {
    blocks = blocksFromTextPreferCv(existingParsedText);
    if (blocks.length > 0 && blocks[0].content !== "(empty file)") {
      setParsedById((prev) => ({ ...prev, [docId]: blocks }));
      setOpenBlocks((prev) => ({
        ...prev,
        [docId]: blocks.reduce((acc, b) => ((acc[b.id] = true), acc), {} as Record<string, boolean>),
      }));
      return blocks;
    }
  }

  if (!file) {
    throw new Error("File tidak tersedia untuk diunggah");
  }

  try {
    const fd = new FormData();
    fd.append("file", file);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);
    const res = await fetch("/api/rag/ingest", {
      method: "POST",
      body: fd,
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));
    const d = await res.json().catch(() => ({}));
    if (res.ok && Array.isArray(d.parsedBlocks) && d.parsedBlocks.length > 0) {
      blocks = d.parsedBlocks;
    } else if (!res.ok) {
      throw new Error(d?.error || "Ingest gagal");
    }
  } catch (e: unknown) {
    ingestError = e instanceof Error ? e : new Error(String(e));
    console.warn("Ingest API gagal, fallback parse lokal:", ingestError.message);
  }

  if (blocks.length === 0) {
    const isPdf = file.type?.includes("pdf") || file.name?.toLowerCase().endsWith(".pdf");
    if (isPdf) {
      try {
        const text = await parsePdfInBrowser(file);
        blocks = blocksFromTextPreferCv(text);
      } catch {
        blocks = splitToBlocksClient("(gagal mengekstrak teks dari PDF)");
      }
    } else {
      throw ingestError ?? new Error("Gagal mengekstrak dokumen");
    }
  }

  const totalChars = blocks.reduce((s, b) => s + (b.content?.length || 0), 0);
  if (totalChars < 40) {
    console.warn(`⚠️ Ekstraksi teks sangat sedikit untuk ${file.name} (${totalChars} chars)`);
  }

  setParsedById((prev) => ({ ...prev, [docId]: blocks }));
  setOpenBlocks((prev) => ({
    ...prev,
    [docId]: blocks.reduce((acc, b) => ((acc[b.id] = true), acc), {} as Record<string, boolean>),
  }));
  return blocks;
}

/** Cari Doc hasil addFromFiles yang match dengan file (nama & type) */
async function findDocByFile(
  getDocs: () => DocItem[],
  file: File,
  retries = 20,
  delayMs = 75
): Promise<DocItem | null> {
  for (let i = 0; i < retries; i++) {
    const docs = getDocs();
    const found = docs.find((d) => d.file && d.file.name === file.name && d.file.type === file.type);
    if (found) return found;
    await wait(delayMs);
  }
  return null;
}

/* ========= Komponen Utama ========= */
export default function AssistantWorkspace({ backButton }: { backButton?: React.ReactNode } = {}) {
  const router = useRouter();
  const { documents, addFromFiles, addQuery } = useDocuments();

  // Kriteria / JD mitra (panel kiri) — dimuat dari API (sinkron dengan dashboard Admin)
  const { criteria: jdCriteriaList, loading: jdCriteriaLoading, refresh: refreshJdCriteria } =
    useJdCriteria();
  const [selectedCriteriaId, setSelectedCriteriaId] = useState<string | null>(null);
  const [criteriaReady, setCriteriaReady] = useState(false);

  useEffect(() => {
    if (jdCriteriaLoading || jdCriteriaList.length === 0) return;
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem(JD_CRITERIA_STORAGE_KEY);
      if (stored && getCriteriaById(stored, jdCriteriaList)) {
        setSelectedCriteriaId(stored);
      } else if (jdCriteriaList[0]) {
        setSelectedCriteriaId(jdCriteriaList[0].id);
      }
    } catch {
      if (jdCriteriaList[0]) setSelectedCriteriaId(jdCriteriaList[0].id);
    } finally {
      setCriteriaReady(true);
    }
  }, [jdCriteriaLoading, jdCriteriaList]);

  useEffect(() => {
    if (selectedCriteriaId && !getCriteriaById(selectedCriteriaId, jdCriteriaList) && jdCriteriaList[0]) {
      setSelectedCriteriaId(jdCriteriaList[0].id);
    }
  }, [jdCriteriaList, selectedCriteriaId]);

  useEffect(() => {
    if (!criteriaReady || !selectedCriteriaId) return;
    try {
      localStorage.setItem(JD_CRITERIA_STORAGE_KEY, selectedCriteriaId);
    } catch {
      /* ignore */
    }
  }, [selectedCriteriaId, criteriaReady]);

  const selectedCriteria = useMemo(
    () => getCriteriaById(selectedCriteriaId, jdCriteriaList),
    [selectedCriteriaId, jdCriteriaList]
  );

  const handleSelectCriteria = useCallback((id: string) => {
    setSelectedCriteriaId(id);
  }, []);

  // Dokumen CV aktif (tab Parse — preview teks hasil ekstraksi)
  const isLikelyJdFile = (fileName: string) => {
    const lower = fileName.toLowerCase();
    return /jd\b|job\s*description|lowongan|requirement|kriteria\s*posisi|deskripsi\s*pekerjaan/.test(lower) || lower.includes("job_desc") || lower.startsWith("jd_");
  };

  const cvDocuments = useMemo(
    () => documents.filter((d) => !isLikelyJdFile(d.name)),
    [documents]
  );

  const [currentId, setCurrentId] = useState<string | null>(null);
  const currentDoc = useMemo(
    () => cvDocuments.find((d) => d.id === currentId),
    [cvDocuments, currentId]
  );

  useEffect(() => {
    if (!currentId && cvDocuments.length > 0) {
      setCurrentId(cvDocuments[0].id);
    }
  }, [cvDocuments, currentId]);

  // Hasil Parse & Extract per dokumen
  const [parsedById, setParsedById] = useState<Record<string, ParsedBlock[]>>({});

  // Auto-parse semua dokumen yang sudah "Processed" tapi belum ter-parse
  useEffect(() => {
    if (documents.length === 0) return;

    const processedDocs = documents.filter(
      (doc) => doc.status === "Processed" && !parsedById[doc.id] && (doc.file || (doc.parsedText && doc.parsedText.trim().length > 60))
    );

    if (processedDocs.length > 0) {
      console.log(`🔄 Auto-parsing ${processedDocs.length} processed document(s)...`);
      processedDocs.forEach(async (doc) => {
        try {
          await autoIngest(doc.file || null, doc.id, setParsedById, setOpenBlocks, doc.parsedText);
          console.log(`✅ Auto-parsed: ${doc.name}`);
        } catch (e) {
          console.error(`❌ Failed to auto-parse ${doc.name}:`, e);
        }
      });
    }
  }, [documents, parsedById]);
  const parsedBlocks = currentId ? parsedById[currentId] ?? [] : [];

  // Expand state per block
  const [openBlocks, setOpenBlocks] = useState<Record<string, Record<string, boolean>>>({});
  const blockOpen = (bid: string) => !!openBlocks[currentId ?? ""]?.[bid];

  // Loading flags
  const [isParsing, setIsParsing] = useState(false);

  // Notifications
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    type: 'success' | 'error';
    message: string;
    timestamp: number;
  }>>([]);

  // Chat
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [chatStorageKey, setChatStorageKey] = useState<string | null>(null);
  const [reportsStorageKey, setReportsStorageKey] = useState<string | null>(null);
  const [reportsReady, setReportsReady] = useState(false);
  const [savedReports, setSavedReports] = useState<HrReport[]>([]);
  const [reportsDialogOpen, setReportsDialogOpen] = useState(false);
  const [exportingDocx, setExportingDocx] = useState(false);

  // Key penyimpanan chat + laporan berdasarkan user Supabase (per HR)
  useEffect(() => {
    if (typeof window === "undefined") return;

    (async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        const userId = data.user?.id;
        const chatKey = userId ? `rag_chat_history_v1_${userId}` : "rag_chat_history_v1_guest";
        const repKey = userId ? `rag_hr_reports_v1_${userId}` : "rag_hr_reports_v1_guest";
        setChatStorageKey(chatKey);
        setReportsStorageKey(repKey);

        const raw = localStorage.getItem(chatKey);
        if (raw) {
          const parsed = JSON.parse(raw) as Msg[];
          if (Array.isArray(parsed)) {
            setMsgs(parsed);
          }
        }

        const rawRep = localStorage.getItem(repKey);
        if (rawRep) {
          try {
            const parsedRep = JSON.parse(rawRep) as HrReport[];
            if (Array.isArray(parsedRep)) {
              setSavedReports(parsedRep);
            }
          } catch {
            /* abaikan data rusak */
          }
        }
      } catch (e) {
        console.warn("Gagal inisialisasi riwayat chat / laporan:", e);
      } finally {
        setReportsReady(true);
      }
    })();
  }, []);

  // Simpan riwayat setiap ada perubahan pesan
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!chatStorageKey) return;
    try {
      localStorage.setItem(chatStorageKey, JSON.stringify(msgs));
    } catch (e) {
      console.warn("Gagal simpan riwayat chat:", e);
    }
  }, [msgs, chatStorageKey]);

  // Simpan daftar laporan HR (setelah reportsReady agar tidak menimpa sebelum load)
  useEffect(() => {
    if (typeof window === "undefined" || !reportsStorageKey || !reportsReady) return;
    try {
      localStorage.setItem(reportsStorageKey, JSON.stringify(savedReports));
    } catch (e) {
      console.warn("Gagal simpan laporan ke localStorage:", e);
    }
  }, [savedReports, reportsStorageKey, reportsReady]);



  /* ===== Handlers ===== */

  // Heuristic: compute average scores from parsed text
  function tryAnswerAverageQuery(query: string, blocks: ParsedBlock[]): string | null {
    const q = query.toLowerCase();
    const isAvg = q.includes("rata") || q.includes("average") || q.includes("mean");
    const isUts = q.includes("uts");
    const isUas = q.includes("uas");
    if (!isAvg || (!isUts && !isUas)) return null;

    const texts = blocks.map(b => b.content).join("\n");
    // Focus by exam keyword
    const examFiltered = isUts || isUas
      ? texts
        .split(/\n+/)
        .filter(line => (isUts && /\buts\b/i.test(line)) || (isUas && /\buas\b/i.test(line)))
        .join("\n")
      : texts;

    // Extract numbers that look like scores 0-100 (supports comma/point decimals)
    const numMatches = examFiltered.match(/\b\d{1,3}(?:[.,]\d+)?\b/g) || [];
    const nums = numMatches
      .map(s => Number(String(s).replace(",", ".")))
      .filter(v => isFinite(v) && v >= 0 && v <= 100);

    if (nums.length === 0) return "Maaf, tidak ditemukan angka nilai yang relevan untuk dihitung.";
    const sum = nums.reduce((a, b) => a + b, 0);
    const avg = sum / nums.length;
    const examLabel = isUts ? "UTS" : "UAS";
    return `Perkiraan rata-rata ${examLabel}: ${avg.toFixed(2)} (n=${nums.length}).`;
  }

  /** Add notification */
  const addNotification = (type: 'success' | 'error', message: string) => {
    const id = crypto.randomUUID?.() ?? `${Date.now()}`;
    setNotifications(prev => [...prev, { id, type, message, timestamp: Date.now() }]);

    // Auto remove after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  /** Upload → auto-ingest (seperti NotebookLM: tambah sumber langsung diproses) */
  const onUpload = async (files: File[]) => {
    if (!files.length) return;
    addFromFiles(files);

    for (const file of files) {
      try {
        const doc = await findDocByFile(() => documents as DocItem[], file);
        if (!doc || !doc.id) continue;
        setCurrentId(doc.id);

        // Auto-parse in background
        addNotification('success', `Memulai parsing ${file.name}...`);
        const uploaded = documents.find((d) => d.id === doc.id);
        await autoIngest(file, doc.id, setParsedById, setOpenBlocks, uploaded?.parsedText);
        addNotification('success', `✅ ${file.name} berhasil diparsing!`);
      } catch (e: any) {
        addNotification('error', `❌ Gagal parsing ${file.name}: ${e.message || "Unknown error"}`);
      }
    }
  };

  /** Parse manual dari kartu Studio */
  const runParse = async () => {
    if (!currentDoc?.file || !currentId) return alert("Pilih dokumen yang punya file.");
    setIsParsing(true);
    try {
      await autoIngest(currentDoc.file, currentId, setParsedById, setOpenBlocks, currentDoc.parsedText);
    } catch (e: any) {
      alert(e.message || "Ingest error");
    } finally {
      setIsParsing(false);
    }
  };

  /** Chat — menggunakan SEMUA dokumen yang sudah diupload, bukan hanya dokumen aktif */
  const sendChat = async () => {
    const text = input.trim();
    if (!text) return;
    addQuery(text);

    const id = crypto.randomUUID?.() ?? `${Date.now()}`;
    setMsgs((m) => [...m, { id, role: "user", text }]);
    setInput("");

    try {
      // Pastikan semua dokumen yang belum diparsed di-parse dulu
      const unparsedDocs = documents.filter(
        (doc) => doc.status === "Processed" && !parsedById[doc.id] && (doc.file || (doc.parsedText && doc.parsedText.trim().length > 60))
      );

      if (unparsedDocs.length > 0) {
        setIsParsing(true);
        for (const doc of unparsedDocs) {
          try {
            await autoIngest(doc.file || null, doc.id, setParsedById, setOpenBlocks, doc.parsedText);
          } catch (e) {
            console.error(`Failed to parse ${doc.name}:`, e);
          }
        }
        setIsParsing(false);
      }

      // Deteksi JD dari file upload (diabaikan jika kriteria mitra sudah dipilih)
      const isLikelyJd = (fileName: string) => isLikelyJdFile(fileName);

      const partnerJdBlocks = selectedCriteria ? criteriaToParsedBlocks(selectedCriteria) : [];

      // Kumpulkan blocks CV dari semua dokumen yang sudah diparsed
      const cvBlocksFromDocs: ParsedBlock[] = [];
      const docNames: Record<string, string> = {};

      documents.forEach((doc) => {
        if (selectedCriteria && isLikelyJd(doc.name)) return;
        if (doc.status === "Processed" && parsedById[doc.id] && parsedById[doc.id].length > 0) {
          const blocks = parsedById[doc.id];
          docNames[doc.id] = doc.name;
          blocks.forEach((block) => {
            cvBlocksFromDocs.push({
              ...block,
              label: `[CV - ${doc.name}] ${block.label}`,
            });
          });
        }
      });

      let allBlocks: ParsedBlock[] = [...partnerJdBlocks, ...cvBlocksFromDocs];

      // Jika belum ada blocks, parse CV yang belum diproses
      if (cvBlocksFromDocs.length === 0 && cvDocuments.length > 0) {
        const processedDocs = cvDocuments.filter((d) => (d.file || (d.parsedText && d.parsedText.trim().length > 60)) && d.status === "Processed");
        if (processedDocs.length > 0) {
          setIsParsing(true);
          console.log(`📄 Parsing ${processedDocs.length} CV for query...`);

          for (const doc of processedDocs) {
            try {
              const blocks = await autoIngest(doc.file || null, doc.id, setParsedById, setOpenBlocks, doc.parsedText);
              blocks.forEach((block) => {
                allBlocks.push({
                  ...block,
                  label: `[CV - ${doc.name}] ${block.label}`,
                });
              });
              console.log(`✅ Parsed ${doc.name}: ${blocks.length} blocks`);
            } catch (e: unknown) {
              console.error(`❌ Failed to parse ${doc.name}:`, e);
            }
          }
          setIsParsing(false);
        }
      }

      console.log(`📊 Total blocks for query: ${allBlocks.length} from ${new Set(Object.values(docNames)).size} document(s)`);

      // Heuristic answer for average UTS/UAS
      const avgAnswer = tryAnswerAverageQuery(text, allBlocks);
      if (avgAnswer) {
        setMsgs((m) => [...m, { id: `${id}-a`, role: "assistant", text: avgAnswer }]);
        return;
      }

      // Buat context dari SEMUA dokumen
      let context = "";

      if (allBlocks.length > 0) {
        const body = buildBalancedRagContext(allBlocks, text);
        const docCount = new Set(
          allBlocks.map((b) => {
            const m = b.label.match(/^\[(CV|JOB DESCRIPTION) - ([^\]]+)\]/);
            return m ? `${m[1]}:${m[2]}` : b.label;
          })
        ).size;

        const criteriaHeader = selectedCriteria
          ? `=== KRITERIA LOWONGAN AKTIF (HR sudah memilih di panel) ===\n` +
          `Kriteria aktif: **${selectedCriteria.title}** (${selectedCriteria.department}, ${selectedCriteria.id})\n` +
          `Posisi: ${selectedCriteria.title}\n` +
          `Departemen: ${selectedCriteria.department}\n\n` +
          `${selectedCriteria.fullText}\n\n` +
          `=== AKHIR KRITERIA AKTIF ===\n\n` +
          `Instruksi: Semua pertanyaan screening ("posisi ini", "paling cocok", "top N") merujuk ke kriteria **${selectedCriteria.title}** di atas.\n\n`
          : "";

        context = criteriaHeader + `=== INFORMASI: Screening CV kandidat terhadap kriteria posisi mitra. ===\n\n${body}`;
      } else if (selectedCriteria && partnerJdBlocks.length > 0) {
        context =
          `=== Kriteria dipilih: ${selectedCriteria.title} (${selectedCriteria.department}) ===\n\n` +
          selectedCriteria.fullText +
          `\n\n=== Belum ada CV diunggah. Upload CV di header untuk screening. ===`;
      } else {
        const uploadedDocs = documents.filter((d) => d.status === "Processed");
        if (uploadedDocs.length > 0) {
          context = `=== PERINGATAN: Terdapat ${uploadedDocs.length} CV diunggah tetapi belum berhasil diparsing. Pilih kriteria di panel kiri dan coba upload ulang. ===`;
        } else if (!selectedCriteria) {
          context = "(no context — pilih kriteria/JD di panel kiri dan upload CV kandidat.)";
        } else {
          context = `(Kriteria: ${selectedCriteria.title}. Upload CV kandidat di header untuk memulai screening.)`;
        }
      }

      const chatHistory = msgs.slice(-CHAT_HISTORY_MAX_MESSAGES).map((m) => ({
        role: m.role,
        content: m.text,
      }));

      const res = await fetch("/api/rag/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: text,
          context,
          history: chatHistory,
          activeCriteria: selectedCriteria
            ? {
              id: selectedCriteria.id,
              title: selectedCriteria.title,
              department: selectedCriteria.department,
              fullText: selectedCriteria.fullText,
            }
            : null,
        }),
      });

      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d?.error || "Query gagal");

      const answer = (d.answer as string) || "Saya tidak tahu.";
      setMsgs((m) => [...m, { id: `${id}-a`, role: "assistant", text: answer }]);
    } catch (e: any) {
      setMsgs((m) => [
        ...m,
        { id: `${id}-a`, role: "assistant", text: `❌ ${e.message || "Query error"}` },
      ]);
    } finally {
      setIsParsing(false);
    }
  };

  /** Hapus seluruh riwayat chat (state + localStorage) */
  const handleClearChat = () => {
    if (typeof window === "undefined") return;
    if (!chatStorageKey) {
      setMsgs([]);
      return;
    }

    const ok = window.confirm("Hapus semua riwayat chat di AI Assistant ini?");
    if (!ok) return;

    try {
      localStorage.removeItem(chatStorageKey);
    } catch (e) {
      console.warn("Gagal menghapus riwayat chat dari localStorage:", e);
    }
    setMsgs([]);
  };

  const currentExportTitle = () => `Sesi HR — ${new Date().toLocaleString("id-ID")}`;

  const downloadDocx = async (title: string, documentNames: string[], messages: Msg[], createdAt?: string) => {
    if (messages.length === 0) {
      addNotification("error", "Tidak ada pesan untuk diekspor.");
      return;
    }
    setExportingDocx(true);
    try {
      const res = await fetch("/api/reports/docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          createdAt: createdAt ?? new Date().toISOString(),
          documentNames,
          messages: messages.map(({ role, text }) => ({ role, text })),
        }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error || "Gagal membuat DOCX");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${safeDownloadBasename(title)}.docx`;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      addNotification("success", "File DOCX berhasil diunduh.");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Gagal ekspor DOCX";
      addNotification("error", msg);
    } finally {
      setExportingDocx(false);
    }
  };

  const handleSaveReport = () => {
    if (msgs.length === 0) {
      addNotification("error", "Belum ada percakapan untuk disimpan.");
      return;
    }
    const defaultTitle = `Laporan ${new Date().toLocaleString("id-ID")}`;
    const title = window.prompt("Judul laporan:", defaultTitle);
    if (title === null) return;
    const trimmed = title.trim() || defaultTitle;
    const report: HrReport = {
      id: crypto.randomUUID?.() ?? `${Date.now()}`,
      title: trimmed,
      createdAt: new Date().toISOString(),
      documentNames: documents.map((d) => d.name),
      messages: msgs.map((m) => ({ ...m })),
    };
    setSavedReports((prev) => [report, ...prev]);
    addNotification(
      "success",
      "Laporan disimpan. Buka \"Laporan tersimpan\" untuk melihat, mencetak PDF, atau mengunduh DOCX."
    );
  };

  const handleLoadReportIntoChat = (r: HrReport) => {
    const ok = window.confirm(
      `Memuat "${r.title}" akan mengganti riwayat chat di layar ini. Anda masih bisa menyimpan ulang atau mengekspor. Lanjut?`
    );
    if (!ok) return;
    setMsgs(r.messages.map((m) => ({ ...m })));
    setReportsDialogOpen(false);
    addNotification("success", "Riwayat chat diganti dari laporan.");
  };

  const handleDeleteSavedReport = (id: string) => {
    const ok = window.confirm("Hapus laporan ini dari perangkat Anda?");
    if (!ok) return;
    setSavedReports((prev) => prev.filter((x) => x.id !== id));
    addNotification("success", "Laporan dihapus.");
  };

  const handleExportCurrentPdf = async () => {
    try {
      addNotification("success", "Menyiapkan file PDF...");
      await generateAndDownloadPdf(currentExportTitle(), documents.map((d) => d.name), msgs);
      addNotification("success", "Laporan PDF berhasil diunduh.");
    } catch (e) {
      addNotification("error", "Gagal mengunduh laporan PDF.");
    }
  };

  const handleExportCurrentDocx = () => {
    void downloadDocx(currentExportTitle(), documents.map((d) => d.name), msgs);
  };

  /* ===== Komponen kecil ===== */
  const Separator = () => <div className="w-full h-px bg-border" />;

  const onSelectCriteria = (id: string) => {
    handleSelectCriteria(id);
    const c = getCriteriaById(id, jdCriteriaList);
    if (c) addNotification("success", `Kriteria: ${c.title}`);
  };

  /* ===== UI: Split View (Kriteria JD Kiri | Chat Kanan) ===== */
  return (
    <div className="flex-1 min-h-0 page-gradient flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-border/80 aw-header soft-shadow sticky top-0 z-40">
        <div className="flex h-[3.5rem] items-center justify-between px-3 md:px-5 gap-3">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            {backButton}
            <div className="h-8 w-8 rounded-xl aw-bot-avatar flex items-center justify-center shrink-0">
              <Sparkles className="h-4 w-4 text-[#6fb7ff]" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base md:text-lg font-semibold text-gradient truncate">AI Assistant Workspace</h1>
              <p className="text-[10px] md:text-[11px] text-muted-foreground hidden sm:block">
                Screening CV vs kriteria JD — PT Sosro Gunung Slamet
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {documents.length > 0 && (
              <Badge variant="outline" className="hidden md:inline-flex text-[10px] gap-1">
                <FileText className="h-3 w-3" />
                {documents.length} CV
              </Badge>
            )}
            {selectedCriteria && (
              <Badge className="hidden sm:inline-flex max-w-[220px] truncate text-[10px] aw-jd-badge text-foreground border">
                <Briefcase className="h-3 w-3 mr-1 shrink-0" />
                {selectedCriteria.title}
              </Badge>
            )}
            <FileUploadButton
              onSelectFiles={onUpload}
              label="Upload CV"
              size="sm"
              variant="default"
              className="gap-2 btn-figma border-0 admin-action-btn"
              multiple
            />
          </div>
        </div>
      </div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="fixed top-[5.5rem] right-4 z-50 space-y-2">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={cn(
                "aw-msg-enter px-4 py-3 rounded-xl shadow-lg border backdrop-blur-md max-w-sm",
                notification.type === "success"
                  ? "bg-emerald-500/90 text-white border-emerald-400"
                  : "bg-red-500/90 text-white border-red-400"
              )}
            >
              <div className="text-sm font-medium">{notification.message}</div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={reportsDialogOpen} onOpenChange={setReportsDialogOpen} title="Laporan tersimpan">
        {savedReports.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Belum ada laporan. Setelah sesi tanya-jawab dengan AI, gunakan{" "}
            <strong className="text-foreground">Simpan laporan</strong> di tab Chat, lalu ekspor PDF atau DOCX bila
            diperlukan.
          </p>
        ) : (
          <ul className="space-y-3">
            {savedReports.map((r) => (
              <li
                key={r.id}
                className="rounded-lg border border-border/80 bg-card/40 p-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">{r.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(r.createdAt).toLocaleString("id-ID")} · {r.messages.length} pesan
                    {r.documentNames.length > 0 ? ` · ${r.documentNames.length} dokumen` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1 shrink-0">
                  <Button size="xs" variant="secondary" className="h-7" onClick={() => handleLoadReportIntoChat(r)}>
                    Buka di chat
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        addNotification("success", "Menyiapkan file PDF...");
                        await generateAndDownloadPdf(r.title, r.documentNames, r.messages);
                        addNotification("success", "Laporan PDF berhasil diunduh.");
                      } catch (e) {
                        addNotification("error", "Gagal mengunduh laporan PDF.");
                      }
                    }}
                    className="h-7 text-[11px] gap-1 px-2"
                  >
                    <Printer className="h-3 w-3" />
                    PDF
                  </Button>
                  <Button
                    size="xs"
                    variant="outline"
                    className="h-7 gap-1"
                    disabled={exportingDocx}
                    onClick={() => void downloadDocx(r.title, r.documentNames, r.messages, r.createdAt)}
                  >
                    <FileType className="h-3 w-3" />
                    DOCX
                  </Button>
                  <Button
                    size="xs"
                    variant="ghost"
                    className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleDeleteSavedReport(r.id)}
                    aria-label="Hapus laporan"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Dialog>

      {/* Main Split View */}
      <main className="flex-1 flex overflow-hidden min-h-0">
        {/* LEFT: Kriteria JD */}
        <div className="w-1/2 border-r border-border/80 flex flex-col overflow-hidden min-w-0 aw-panel-left">
          <div className="px-3 py-1.5 border-b border-border/60 bg-card/30 shrink-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Briefcase className="h-3.5 w-3.5 text-primary" />
              Kriteria & Job Description
            </p>
          </div>
          {criteriaReady && !jdCriteriaLoading ? (
            <JdCriteriaPanel
              selectedId={selectedCriteriaId}
              onSelect={onSelectCriteria}
              criteriaList={jdCriteriaList}
              onRefresh={refreshJdCriteria}
            />
          ) : (
            <div className="flex-1 p-6 space-y-3">
              <div className="h-12 aw-skeleton rounded-lg bg-muted/30" />
              <div className="h-32 aw-skeleton rounded-lg bg-muted/20" />
              <div className="h-32 aw-skeleton rounded-lg bg-muted/20" />
              <p className="text-xs text-center text-muted-foreground pt-4">Memuat kriteria...</p>
            </div>
          )}
        </div>

        {/* RIGHT: Parse & Chat */}
        <div className="w-1/2 aw-panel-right flex flex-col overflow-hidden">
          <div className="px-3 py-1.5 border-b border-border/60 bg-card/20 shrink-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5 text-primary" />
              Analisis & Chat AI
            </p>
          </div>
          <div className="flex-1 overflow-hidden pt-3 px-3 pb-1 md:pt-4 md:px-4 md:pb-2 flex flex-col min-h-0">
            <div className="flex-1 flex flex-col min-h-0">
              <Card className="flex-1 flex flex-col bg-transparent border-0 shadow-none py-0 gap-0 min-h-0">
                <CardContent className="flex-1 overflow-y-auto space-y-4 pt-4 pb-4 min-h-0">
                  <div className="flex flex-col gap-2 mb-2 sm:flex-row sm:items-start sm:justify-between">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide shrink-0">
                      Riwayat Chat
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 justify-start sm:justify-end">
                      {msgs.length > 0 && (
                        <>
                          <Button
                            variant="outline"
                            size="xs"
                            onClick={handleSaveReport}
                            className="text-xs h-7 px-2 gap-1"
                            title="Simpan snapshot percakapan untuk keputusan HR nanti"
                          >
                            <Save className="h-3 w-3 shrink-0" />
                            Simpan laporan
                          </Button>
                          <Button
                            variant="outline"
                            size="xs"
                            onClick={handleExportCurrentPdf}
                            className="text-xs h-7 px-2 gap-1"
                            title="Buka jendela cetak; pilih Simpan sebagai PDF"
                          >
                            <Printer className="h-3 w-3 shrink-0" />
                            PDF
                          </Button>
                          <Button
                            variant="outline"
                            size="xs"
                            onClick={handleExportCurrentDocx}
                            disabled={exportingDocx}
                            className="text-xs h-7 px-2 gap-1"
                            title="Unduh Microsoft Word (.docx)"
                          >
                            {exportingDocx ? (
                              <div className="h-3 w-3 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin shrink-0" />
                            ) : (
                              <FileType className="h-3 w-3 shrink-0" />
                            )}
                            DOCX
                          </Button>
                        </>
                      )}
                      <Button
                        variant="secondary"
                        size="xs"
                        onClick={() => setReportsDialogOpen(true)}
                        className="text-xs h-7 px-2 gap-1"
                      >
                        Laporan ({savedReports.length})
                      </Button>
                      {msgs.length > 0 && (
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={handleClearChat}
                          className="text-xs h-7 px-2 py-1 hover:bg-destructive/10 hover:text-destructive border-destructive/40"
                        >
                          Hapus riwayat
                        </Button>
                      )}
                    </div>
                  </div>
                  {msgs.length === 0 ? (
                    <div className="text-sm text-center py-6 aw-msg-enter">
                      <div className="mx-auto h-14 w-14 rounded-2xl aw-bot-avatar flex items-center justify-center mb-4">
                        <Bot className="h-7 w-7 text-[#6fb7ff]" />
                      </div>
                      <p className="font-semibold text-foreground">Halo! Siap bantu screening kandidat.</p>
                      <p className="mt-2 text-xs text-muted-foreground max-w-sm mx-auto">
                        Pilih kriteria JD di panel kiri, upload CV, lalu ajukan pertanyaan.
                      </p>

                      {selectedCriteria && (
                        <div className="mt-5 p-3 aw-jd-badge rounded-xl text-xs text-left max-w-sm mx-auto">
                          <p className="font-medium text-foreground flex items-center gap-1.5">
                            <Briefcase className="h-3.5 w-3.5" />
                            Kriteria aktif
                          </p>
                          <p className="mt-1 font-medium">{selectedCriteria.title}</p>
                          <p className="text-muted-foreground">{selectedCriteria.department}</p>
                        </div>
                      )}

                      <div className="mt-5 flex flex-wrap justify-center gap-2 max-w-md mx-auto">
                        {CHAT_SUGGESTIONS.map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setInput(s)}
                            className="aw-suggest-chip text-left text-xs px-3 py-2 rounded-full border border-border/80 bg-muted/20 text-muted-foreground hover:text-foreground"
                          >
                            {s}
                          </button>
                        ))}
                      </div>

                      {documents.length > 0 && (
                        <div className="mt-5 p-3 rounded-xl border border-border/60 bg-muted/15 text-xs max-w-sm mx-auto text-left">
                          <p className="font-medium mb-2 flex items-center gap-1.5">
                            <FileText className="h-3.5 w-3.5" />
                            CV terupload ({documents.length})
                          </p>
                          <ul className="space-y-1">
                            {documents.slice(0, 4).map((d) => (
                              <li key={d.id} className="truncate text-muted-foreground flex items-center gap-1.5">
                                <span
                                  className={cn(
                                    "h-1.5 w-1.5 rounded-full shrink-0",
                                    d.status === "Processed" ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
                                  )}
                                />
                                {d.name}
                              </li>
                            ))}
                            {documents.length > 4 && (
                              <li className="text-muted-foreground/70">+{documents.length - 4} lainnya</li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    msgs.map((m, i) => (
                      <div
                        key={m.id}
                        className={cn(
                          "flex items-start gap-3 aw-msg-enter",
                          m.role === "user" ? "justify-end" : "justify-start"
                        )}
                        style={{ animationDelay: `${Math.min(i * 40, 200)}ms` }}
                      >
                        {m.role === "assistant" && (
                          <div className="mt-1 rounded-full p-2 aw-bot-avatar shrink-0">
                            <Bot className="h-4 w-4 text-[#6fb7ff]" />
                          </div>
                        )}
                        <div
                          className={cn(
                            "max-w-[85%] min-w-0 rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                            m.role === "user"
                              ? "aw-user-bubble rounded-br-md font-medium"
                              : "aw-assistant-bubble rounded-bl-md text-foreground"
                          )}
                        >
                          {m.role === "assistant" ? (
                            <ChatMarkdown content={m.text} />
                          ) : (
                            <div className="whitespace-pre-wrap break-words">{m.text}</div>
                          )}
                        </div>
                        {m.role === "user" && (
                          <div className="mt-1 rounded-full p-2 bg-muted/40 border border-border/50 shrink-0">
                            <User className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </CardContent>
                <div className="p-2 md:p-3 border-t border-border/80 bg-card/20 flex flex-col sm:flex-row items-stretch sm:items-end gap-3 shrink-0">
                  <div className="flex-1 rounded-xl border border-border bg-background/80 aw-input-wrap transition-all">
                    <Textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder={
                        selectedCriteria
                          ? `Tanya tentang CV vs ${selectedCriteria.title}...`
                          : "Pilih kriteria JD di kiri, lalu tanya tentang CV..."
                      }
                      className="min-h-[64px] resize-none border-0 bg-transparent focus-visible:ring-0 shadow-none"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) sendChat();
                      }}
                    />
                    <p className="text-[10px] text-muted-foreground px-3 pb-2 hidden sm:block">
                      Ctrl+Enter untuk kirim
                    </p>
                  </div>
                  <Button
                    className="gap-2 btn-figma border-0 admin-action-btn h-11 sm:h-auto sm:min-h-[64px] px-5 shrink-0"
                    onClick={sendChat}
                    disabled={isParsing}
                  >
                    {isParsing ? (
                      <>
                        <div className="h-4 w-4 border-2 border-[#0b1533]/30 border-t-[#0b1533] rounded-full animate-spin" />
                        Memproses...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Kirim
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
