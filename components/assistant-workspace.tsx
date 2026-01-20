"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Send, Bot, User, FileText, Download, Copy, ChevronDown, ChevronRight, ChevronLeft
} from "lucide-react";
import { useDocuments } from "@/components/documents-context";
import FileUploadButton from "@/components/file-upload-button";
import { cn } from "@/lib/utils";
import { TabsContainer } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/client";
// Client-side PDF parsing (avoid server worker issues)
// We import lazily inside the function to keep SSR clean

/* ========= Types ========= */
type Msg = { id: string; role: "user" | "assistant"; text: string };
type ParsedBlock = { id: string; label: string; content: string };
type DocItem = { id: string; name: string; status?: string; file?: File };

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
    const lines = Array.from(linesMap.values()).sort((a,b) => b.y - a.y);
    const pageLines = lines.map(line => {
      const sorted = line.items.sort((a,b) => ((a.transform?.[4]??0) - (b.transform?.[4]??0)));
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

async function mockExtract(file: File): Promise<Record<string, string>> {
  await wait(400);
  return { title: file.name, authors: "Penulis A; Penulis B", year: "2018", keywords: "contoh, demo" };
}

/** Ingest file -> simpan parsedBlocks ke state, buka semua blok */
async function autoIngest(
  file: File,
  docId: string,
  setParsedById: React.Dispatch<React.SetStateAction<Record<string, ParsedBlock[]>>>,
  setOpenBlocks: React.Dispatch<React.SetStateAction<Record<string, Record<string, boolean>>>>
) {
  let blocks: ParsedBlock[] = [];
  const isPdf = file.type?.includes("pdf") || file.name?.toLowerCase().endsWith(".pdf");
  
  if (isPdf) {
    // Parse PDF using pdfplumber via API (better table extraction)
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/pdf/parse", { method: "POST", body: fd });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.text) {
        blocks = splitToBlocksClient(d.text);
      } else {
        // Fallback to client-side parsing
        const text = await parsePdfInBrowser(file);
        blocks = splitToBlocksClient(text);
      }
    } catch (error) {
      // Fallback to client-side parsing if pdfplumber fails
      console.warn("Pdfplumber failed, using PDF.js fallback:", error);
      const text = await parsePdfInBrowser(file);
      blocks = splitToBlocksClient(text);
    }
  } else {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/rag/ingest", { method: "POST", body: fd });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(d?.error || "Ingest gagal");
    blocks = d.parsedBlocks || [];
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
export default function AssistantWorkspace() {
  const router = useRouter();
  const { documents, addFromFiles, addQuery } = useDocuments();

  // Dokumen aktif
  const [currentId, setCurrentId] = useState<string | null>(null);
  const currentDoc = useMemo(
    () => documents.find((d) => d.id === currentId),
    [documents, currentId]
  );

  // Preview URL
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  useEffect(() => {
    if (currentDoc?.file) {
      const url = URL.createObjectURL(currentDoc.file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreviewUrl(null);
  }, [currentDoc?.file]);

  // Pilih doc pertama otomatis
  useEffect(() => {
    if (!currentId && documents.length > 0) {
      setCurrentId(documents[0].id);
    }
  }, [documents, currentId]);

  // Hasil Parse & Extract per dokumen
  const [parsedById, setParsedById] = useState<Record<string, ParsedBlock[]>>({});

  // Auto-parse semua dokumen yang sudah "Processed" tapi belum ter-parse
  useEffect(() => {
    if (documents.length === 0) return;
    
    const processedDocs = documents.filter(
      (doc) => doc.status === "Processed" && !parsedById[doc.id] && doc.file
    );

    if (processedDocs.length > 0) {
      console.log(`🔄 Auto-parsing ${processedDocs.length} processed document(s)...`);
      processedDocs.forEach(async (doc) => {
        try {
          await autoIngest(doc.file!, doc.id, setParsedById, setOpenBlocks);
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

  // Tentukan key penyimpanan berdasarkan user Supabase (per HR)
  useEffect(() => {
    if (typeof window === "undefined") return;

    (async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        const userId = data.user?.id;
        const key = userId ? `rag_chat_history_v1_${userId}` : "rag_chat_history_v1_guest";
        setChatStorageKey(key);

        // Load riwayat jika ada
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw) as Msg[];
          if (Array.isArray(parsed)) {
            setMsgs(parsed);
          }
        }
      } catch (e) {
        console.warn("Gagal inisialisasi riwayat chat:", e);
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

  // Tab state untuk panel kanan
  const [activeTab, setActiveTab] = useState<"parse" | "chat">("chat");

  // PDF page navigation
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

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
        await autoIngest(file, doc.id, setParsedById, setOpenBlocks);
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
      await autoIngest(currentDoc.file, currentId, setParsedById, setOpenBlocks);
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
        (doc) => doc.status === "Processed" && !parsedById[doc.id] && doc.file
      );

      if (unparsedDocs.length > 0) {
        setIsParsing(true);
        for (const doc of unparsedDocs) {
          try {
            await autoIngest(doc.file!, doc.id, setParsedById, setOpenBlocks);
          } catch (e) {
            console.error(`Failed to parse ${doc.name}:`, e);
          }
        }
        setIsParsing(false);
      }

      // Kumpulkan blocks dari SEMUA dokumen yang sudah diparsed
      const allBlocks: ParsedBlock[] = [];
      const docNames: Record<string, string> = {};
      
      // Ambil dari parsedById terlebih dahulu
      documents.forEach((doc) => {
        if (doc.status === "Processed" && parsedById[doc.id] && parsedById[doc.id].length > 0) {
          const blocks = parsedById[doc.id];
          docNames[doc.id] = doc.name;
          // Tambahkan nama dokumen sebagai prefix untuk setiap block
          blocks.forEach((block) => {
            allBlocks.push({
              ...block,
              label: `[${doc.name}] ${block.label}`,
            });
          });
        }
      });

      // Jika tidak ada blocks dari parsedById, coba parse semua dokumen yang "Processed"
      if (allBlocks.length === 0 && documents.length > 0) {
        const processedDocs = documents.filter((d) => d.file && d.status === "Processed");
        if (processedDocs.length > 0) {
          setIsParsing(true);
          console.log(`📄 Parsing ${processedDocs.length} document(s) for query...`);
          
          for (const doc of processedDocs) {
            try {
              const blocks = await autoIngest(doc.file!, doc.id, setParsedById, setOpenBlocks);
              blocks.forEach((block) => {
                allBlocks.push({
                  ...block,
                  label: `[${doc.name}] ${block.label}`,
                });
              });
              console.log(`✅ Parsed ${doc.name}: ${blocks.length} blocks`);
            } catch (e: any) {
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
        context = allBlocks
          .map((b) => `[${b.label}] ${b.content}`)
          .join("\n\n");
        
        // Tambahkan informasi jumlah dokumen di context
        const docCount = new Set(
          allBlocks.map((b) => {
            const match = b.label.match(/\[([^\]]+)\]/);
            return match ? match[1] : "";
          })
        ).size;

        context = `=== INFORMASI: Terdapat ${docCount} dokumen CV yang tersedia ===\n\n${context}`;
      } else {
        // Jika tidak ada blocks, cek apakah ada dokumen yang sudah diupload
        const uploadedDocs = documents.filter((d) => d.status === "Processed");
        if (uploadedDocs.length > 0) {
          context = `=== PERINGATAN: Terdapat ${uploadedDocs.length} dokumen yang sudah diupload (${uploadedDocs.map(d => d.name).join(", ")}) tetapi belum berhasil diparsing. Silakan coba upload ulang atau refresh halaman. ===`;
        } else {
          context = "(no context - belum ada dokumen yang diproses. Silakan upload dokumen CV terlebih dahulu.)";
        }
      }

      const res = await fetch("/api/rag/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: text, context }),
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

  /* ===== Komponen kecil ===== */
  const Separator = () => <div className="w-full h-px bg-border" />;


  // Update PDF pages when document changes
  useEffect(() => {
    if (currentDoc?.file && previewUrl) {
      const ext = (currentDoc.name.split(".").pop() || "").toLowerCase();
      if (ext === "pdf") {
        // Try to get total pages from PDF
        const loadPdfPages = async () => {
          try {
            const { getDocument } = (await import("pdfjs-dist")) as any;
            const buf = new Uint8Array(await currentDoc.file!.arrayBuffer());
            const pdf = await getDocument({ data: buf, disableWorker: true }).promise;
            setTotalPages(pdf.numPages);
            setCurrentPage(1);
          } catch (e) {
            console.warn("Could not load PDF pages:", e);
            setTotalPages(1);
          }
        };
        loadPdfPages();
      }
    }
  }, [currentDoc?.file, previewUrl]);

  const handlePrevPage = useCallback(() => {
    setCurrentPage((p) => Math.max(1, p - 1));
  }, []);

  const handleNextPage = useCallback(() => {
    setCurrentPage((p) => Math.min(totalPages, p + 1));
  }, [totalPages]);

  const handleDownload = useCallback(() => {
    if (!previewUrl || !currentDoc) return;
    const a = document.createElement("a");
    a.href = previewUrl;
    a.download = currentDoc.name;
    a.click();
  }, [previewUrl, currentDoc]);

  const CvPreviewPane = useMemo(
    () =>
      memo(function CvPreviewPaneInner(props: {
        doc: typeof currentDoc;
        url: string | null;
        page: number;
        pages: number;
        onPrev: () => void;
        onNext: () => void;
        onDownload: () => void;
      }) {
        const { doc, url, page, pages, onPrev, onNext, onDownload } = props;

        if (!doc || !url) {
          return (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-sm">Pilih dokumen untuk melihat preview</p>
                <p className="text-xs mt-2 opacity-75">Upload CV di header untuk memulai</p>
              </div>
            </div>
          );
        }

        const ext = (doc.name.split(".").pop() || "").toLowerCase();
        const isPDF = ext === "pdf";
        const isImg = ["png", "jpg", "jpeg", "gif", "webp"].includes(ext);

        return (
          <div className="flex flex-col h-full">
            {/* Header Controls */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-card/50">
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium text-foreground truncate max-w-[300px]">{doc.name}</span>
                  {isPDF && (
                    <span className="text-xs text-muted-foreground">
                      Halaman {page} / {pages}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isPDF && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onPrev}
                      disabled={page === 1}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onNext}
                      disabled={page === pages}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </>
                )}
                <Button variant="ghost" size="sm" onClick={onDownload} className="h-8 w-8 p-0">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto bg-muted/20 p-4">
              {isPDF ? (
                <div className="flex justify-center h-full">
                  <iframe
                    src={`${url}#page=${page}`}
                    className="w-full h-full rounded-md border border-border bg-white shadow-lg"
                    style={{ minHeight: "600px" }}
                  />
                </div>
              ) : isImg ? (
                <div className="flex justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={doc.name}
                    className="max-w-full max-h-full object-contain rounded-md border border-border shadow-lg"
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p className="text-sm">Preview tidak tersedia untuk .{ext}</p>
                    <p className="text-xs mt-2 opacity-75">Saran: konversi ke PDF</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      }),
    []
  );

  /* ===== UI: Split View (PDF Preview Kiri | Tabs Kanan) ===== */
  return (
    <div className="min-h-screen page-gradient flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card/70 glass soft-shadow">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-gradient">AI Assistant Workspace</h1>
          </div>
          <div className="flex items-center gap-3">
            {/* Document Selector */}
            {documents.length > 0 && (
              <div className="flex items-center gap-2">
                <select
                  value={currentId || ""}
                  onChange={(e) => setCurrentId(e.target.value)}
                  className="px-3 py-1.5 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {documents.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} {d.status === "Processed" ? "✓" : "⏳"}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <FileUploadButton
              onSelectFiles={onUpload}
              label="Upload CV"
              size="sm"
              variant="default"
              className="gap-2 btn-gradient"
              multiple
            />
          </div>
        </div>
      </div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="fixed top-20 right-4 z-50 space-y-2">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`px-4 py-3 rounded-lg shadow-lg border backdrop-blur-sm max-w-sm transform transition-all duration-300 ease-in-out animate-in slide-in-from-right-5 ${
                notification.type === 'success'
                  ? 'bg-emerald-500/90 text-white border-emerald-400'
                  : 'bg-red-500/90 text-white border-red-400'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="text-sm font-medium">{notification.message}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main Split View */}
      <main className="flex-1 flex overflow-hidden h-[calc(100vh-4rem)]">
        {/* ========== LEFT PANEL: PDF Preview ========== */}
        <div className="w-1/2 border-r border-border bg-card/50 flex flex-col overflow-hidden">
          <CvPreviewPane
            doc={currentDoc}
            url={previewUrl}
            page={currentPage}
            pages={totalPages}
            onPrev={handlePrevPage}
            onNext={handleNextPage}
            onDownload={handleDownload}
          />
        </div>

        {/* ========== RIGHT PANEL: Tabs (Parse, Preview, Extract, Chat) ========== */}
        <div className="w-1/2 bg-card/50 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-hidden p-6 flex flex-col min-h-0">
            <TabsContainer
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as typeof activeTab)}
              className="flex-1 flex flex-col min-h-0"
              tabs={[
                {
                  value: "parse",
                  label: "Parse",
                  content: (
                    <div className="h-full flex flex-col">
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-sm font-medium text-muted-foreground">Hasil Parsing</h3>
                          <Badge variant="outline" className="text-xs">
                            {parsedBlocks.length} blok
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Auto-parse saat upload dokumen
                        </p>
                      </div>
                      <div className="flex-1 overflow-auto space-y-2 pr-2">
                        {parsedBlocks.length > 0 ? (
                          parsedBlocks.map((b) => {
                            const isOpen = blockOpen(b.id);
                            return (
                              <div key={b.id} className="rounded-md border border-border/60 bg-card">
                                <button
                                  className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium hover:bg-muted/50 transition-colors"
                                  onClick={() =>
                                    setOpenBlocks((prev) => ({
                                      ...prev,
                                      [currentId!]: { ...(prev[currentId!] ?? {}), [b.id]: !isOpen },
                                    }))
                                  }
                                >
                                  <span className="truncate">{b.label}</span>
                                  {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                </button>
                                {isOpen && (
                                  <div className="px-3 pb-3 border-t border-border/50">
                                    <pre className="whitespace-pre-wrap text-xs mt-2 mb-2 font-mono bg-muted/30 p-2 rounded">{b.content}</pre>
                                    <Button
                                      variant="ghost" size="sm"
                                      onClick={async () => await navigator.clipboard.writeText(b.content)}
                                      className="h-7"
                                    >
                                      <Copy className="h-3 w-3 mr-1" /> Copy
                                    </Button>
                                  </div>
                                )}
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-xs text-muted-foreground text-center py-8">
                            Belum ada hasil parsing. Upload dokumen untuk memulai.
                          </div>
                        )}
                      </div>
                    </div>
                  ),
                },
                {
                  value: "chat",
                  label: "Chat",
                  content: (
                    <div className="h-full flex flex-col">
                      <Card className="flex-1 flex flex-col bg-transparent border-0 shadow-none">
                        <CardContent className="flex-1 overflow-auto space-y-4 pt-4 pb-4">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                              Riwayat Chat
                            </p>
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
                          {msgs.length === 0 ? (
                            <div className="text-sm text-muted-foreground text-center py-8">
                              <Bot className="h-8 w-8 mx-auto mb-2 opacity-50" />
                              <p className="font-medium">Halo! Bagaimana saya dapat membantu Anda hari ini?</p>
                              <p className="mt-4 text-xs opacity-75">• Upload CV di header untuk chat dengan konteks</p>
                              <p className="text-xs opacity-75">• Atau langsung tanyakan apapun di sini</p>
                              {documents.length > 0 && (
                                <div className="mt-4 p-3 bg-muted/30 rounded-md text-xs">
                                  <p className="font-medium mb-1">Dokumen yang tersedia:</p>
                                  <ul className="list-disc list-inside space-y-1">
                                    {documents.map((d) => (
                                      <li key={d.id} className="truncate">
                                        {d.name} {d.status === "Processed" ? "✓" : "⏳"}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          ) : (
                            msgs.map((m) => (
                              <div
                                key={m.id}
                                className={`flex items-start gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}
                              >
                                {m.role === "assistant" && (
                                  <div className="mt-1 rounded-full p-2 bg-muted/50">
                                    <Bot className="h-4 w-4" />
                                  </div>
                                )}
                                <div
                                  className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm leading-relaxed ${
                                    m.role === "user"
                                      ? "bg-primary text-primary-foreground rounded-br-sm"
                                      : "bg-muted/40 text-foreground rounded-bl-sm"
                                  }`}
                                >
                                  {m.text}
                                </div>
                                {m.role === "user" && (
                                  <div className="mt-1 rounded-full p-2 bg-muted/50">
                                    <User className="h-4 w-4" />
                                  </div>
                                )}
                              </div>
                            ))
                          )}
                        </CardContent>
                        <div className="p-4 border-t border-border flex items-end gap-3">
                          <Textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Tulis pertanyaan tentang CV..."
                            className="min-h-[64px] resize-none flex-1"
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) sendChat();
                            }}
                          />
                          <Button className="gap-2 btn-gradient" onClick={sendChat} disabled={isParsing}>
                            {isParsing ? (
                              <>
                                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Processing...
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
                  ),
                },
              ]}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
