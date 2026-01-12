// components/documents-context.tsx
"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { deleteIndexForDocument } from "@/lib/ragLocal";
import { createClient } from "@/lib/supabase/client";
import { addActivity, loadActivities } from "@/lib/activity-tracker";

/* ================== Types ================== */

export type DocRow = {
  id: string;
  name: string;
  type: string;                  // ekstensi (PDF, DOCX, ...)
  size: string;                  // "2.4 MB"
  uploadDate: string;            // "YYYY-MM-DD"
  status: "Processing" | "Processed";
  file?: File;                   // disimpan di IndexedDB (Blob)
  parsedText?: string;           // hasil ekstraksi teks untuk preview
  uploadedBy?: string;           // User ID pengunggah
};

export type RecentQuery = {
  id: string;
  text: string;
  at: number;                    // timestamp (ms)
};

type Ctx = {
  documents: DocRow[];
  addFromFiles: (files: File[]) => Promise<void>;
  removeDocument: (id: string) => void;

  recentQueries: RecentQuery[];
  addQuery: (text: string) => void;
  removeQuery: (id: string) => void;
  clearQueries: () => void;
};

/* ================== Keys & helpers ================== */

// Helper untuk mendapatkan userId dari Supabase
async function getCurrentUserId(): Promise<string | null> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || null;
  } catch {
    return null;
  }
}

// Helper untuk membuat key yang terikat ke userId
function getStorageKey(baseKey: string, userId: string | null): string {
  if (!userId) return baseKey; // fallback untuk guest/anonymous
  return `${baseKey}_${userId}`;
}

type DocMeta = Omit<DocRow, "file">;

/** format ukuran file */
function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

/** tebak mime dari ekstensi utk buat File dari Blob saat hydrate */
function mimeFromExt(extUpper: string) {
  const ext = extUpper.toLowerCase();
  switch (ext) {
    case "pdf": return "application/pdf";
    case "txt": return "text/plain";
    case "doc": return "application/msword";
    case "docx": return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "xls": return "application/vnd.ms-excel";
    case "xlsx": return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    case "ppt": return "application/vnd.ms-powerpoint";
    case "pptx": return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    default: return "application/octet-stream";
  }
}

/* ================== IndexedDB (simpel) ================== */

const IDB_VERSION = 1;
const STORE_FILES = "files";

function getIDBName(userId: string | null): string {
  if (!userId) return "rag-docs-db-guest";
  return `rag-docs-db-${userId}`;
}

function openDB(userId: string | null): Promise<IDBDatabase> {
  const dbName = getIDBName(userId);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(dbName, IDB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_FILES)) {
        db.createObjectStore(STORE_FILES); // key = id (string)
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbPutFile(id: string, blob: Blob, userId: string | null) {
  const db = await openDB(userId);
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_FILES, "readwrite");
    tx.objectStore(STORE_FILES).put(blob, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function idbGetFile(id: string, userId: string | null): Promise<Blob | undefined> {
  const db = await openDB(userId);
  const blob = await new Promise<Blob | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE_FILES, "readonly");
    const req = tx.objectStore(STORE_FILES).get(id);
    req.onsuccess = () => resolve(req.result as Blob | undefined);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return blob;
}

async function idbDeleteFile(id: string, userId: string | null) {
  const db = await openDB(userId);
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_FILES, "readwrite");
    tx.objectStore(STORE_FILES).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

/* ================== Context ================== */

const DocumentsCtx = createContext<Ctx | null>(null);

export function DocumentsProvider({ children }: { children: React.ReactNode }) {
  const [documents, setDocuments] = useState<DocRow[]>([]);
  const [recentQueries, setRecentQueries] = useState<RecentQuery[]>([]);
  const [hydrated, setHydrated] = useState(false); // supaya tidak nulis ke LS saat tahap load
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  /* ---------- Get userId dan hydrate data ---------- */
  useEffect(() => {
    let mounted = true;
    
    (async () => {
      try {
        console.log("Starting hydration...");
        
        // Get current user ID
        const userId = await getCurrentUserId();
        if (mounted) {
          setCurrentUserId(userId);
        }
        
        if (!userId) {
          console.log("No user logged in, skipping hydration");
          if (mounted) {
            setDocuments([]);
            setRecentQueries([]);
            setHydrated(true);
          }
          return;
        }

        // load docs (metadata) dari LS dengan key yang terikat userId
        const docsKey = getStorageKey("rag_docs_v1", userId);
        const metaJson = localStorage.getItem(docsKey);
        const metas: DocMeta[] = metaJson ? JSON.parse(metaJson) : [];
        console.log("Loaded metadata for user", userId, ":", metas.length, "documents");

        // gabungkan dengan file Blob dari IndexedDB
        const restored: DocRow[] = await Promise.all(
          metas.map(async (m) => {
            let file: File | undefined;
            try {
              const blob = await idbGetFile(m.id, userId);
              if (blob) {
                file = new File([blob], m.name, { type: mimeFromExt(m.type) });
              }
            } catch (error) {
              console.warn("Failed to load file from IndexedDB:", m.id, error);
              // jika gagal ambil file, biarkan undefined
            }
            return { ...m, file };
          }),
        );
        
        if (mounted) {
          setDocuments(restored);
          console.log("Documents restored:", restored.length);
        }

        // load recent queries dengan key yang terikat userId
        const queriesKey = getStorageKey("rag_recent_queries_v1", userId);
        const rqJson = localStorage.getItem(queriesKey);
        const rq: RecentQuery[] = rqJson ? JSON.parse(rqJson) : [];
        
        if (mounted) {
          setRecentQueries(rq);
          console.log("Queries restored:", rq.length);
        }
      } catch (e) {
        console.error("Gagal hydrate:", e);
      } finally {
        if (mounted) {
          console.log("Hydration completed");
          setHydrated(true);
        }
      }
    })();
    
    return () => {
      mounted = false;
    };
  }, []);

  /* ---------- Monitor perubahan user (login/logout) ---------- */
  useEffect(() => {
    const supabase = createClient();
    
    // Listen untuk perubahan auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event, session?.user?.id);
      
      if (event === "SIGNED_OUT" || !session) {
        // User logout: clear data
        setDocuments([]);
        setRecentQueries([]);
        setCurrentUserId(null);
        setHydrated(true);
      } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        // User login atau token refresh: reload data untuk user baru
        const userId = session.user.id;
        setCurrentUserId(userId);
        
        // Reload data untuk user ini
        try {
          const docsKey = getStorageKey("rag_docs_v1", userId);
          const queriesKey = getStorageKey("rag_recent_queries_v1", userId);
          
          const metaJson = localStorage.getItem(docsKey);
          const metas: DocMeta[] = metaJson ? JSON.parse(metaJson) : [];
          
          const restored: DocRow[] = await Promise.all(
            metas.map(async (m) => {
              let file: File | undefined;
              try {
                const blob = await idbGetFile(m.id, userId);
                if (blob) {
                  file = new File([blob], m.name, { type: mimeFromExt(m.type) });
                }
              } catch (error) {
                console.warn("Failed to load file:", m.id, error);
              }
              return { ...m, file };
            }),
          );
          
          setDocuments(restored);
          
          const rqJson = localStorage.getItem(queriesKey);
          const rq: RecentQuery[] = rqJson ? JSON.parse(rqJson) : [];
          setRecentQueries(rq);
        } catch (e) {
          console.error("Gagal reload data:", e);
        }
      }
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  /* ---------- Persist otomatis saat state berubah ---------- */
  useEffect(() => {
    if (!hydrated || !currentUserId) return;
    const metas: DocMeta[] = documents.map(({ file, ...meta }) => meta);
    const docsKey = getStorageKey("rag_docs_v1", currentUserId);
    localStorage.setItem(docsKey, JSON.stringify(metas));
  }, [documents, hydrated, currentUserId]);

  useEffect(() => {
    if (!hydrated || !currentUserId) return;
    const queriesKey = getStorageKey("rag_recent_queries_v1", currentUserId);
    localStorage.setItem(queriesKey, JSON.stringify(recentQueries));
  }, [recentQueries, hydrated, currentUserId]);

  /* ---------- Actions ---------- */

  const addFromFiles = async (files: File[]) => {
    if (!currentUserId) {
      console.warn("Cannot add files: user not logged in");
      return;
    }

    if (!files || files.length === 0) {
      console.warn("No files provided");
      return;
    }

    const today = new Date().toISOString().slice(0, 10);

    // Buat dokumen untuk setiap file
    const rows: DocRow[] = files.map((f) => {
      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`;
      return {
        id,
        name: f.name,
        type: (f.name.split(".").pop() || "").toUpperCase(),
        size: formatBytes(f.size),
        uploadDate: today,
        status: "Processing",
        file: f,
        uploadedBy: currentUserId,
      };
    });

    // Update UI dulu - tampilkan semua file sekaligus
    setDocuments((prev) => [...rows, ...prev]);

    // Simpan semua file ke IndexedDB (async, paralel)
    const savePromises = rows.map((r) => {
      if (r.file) {
        return idbPutFile(r.id, r.file, currentUserId).catch((e) => {
          console.error(`Gagal simpan file ${r.name} ke IDB:`, e);
          return null;
        });
      }
      return Promise.resolve(null);
    });

    // Proses ingestion untuk semua file secara paralel
    const ingestPromises = rows.map(async (row) => {
      if (!row.file) return;

      try {
        // Ingest ke RAG system
        const formData = new FormData();
        formData.append("file", row.file);

        const response = await fetch("/api/rag/ingest", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Ingest gagal");
        }

        const data = await response.json();
        const parsedBlocks = data.parsedBlocks || [];
        
        // Gabungkan semua parsed blocks menjadi satu teks untuk preview
        const parsedText = parsedBlocks
          .map((block: { content?: string; label?: string }) => {
            // Gunakan content jika ada, jika tidak gunakan label sebagai fallback
            if (block.content) return block.content;
            if (block.label) return block.label;
            return "";
          })
          .filter((text: string) => text.trim().length > 0)
          .join("\n\n");

        // Build index untuk dokumen ini
        if (parsedBlocks.length > 0 && currentUserId) {
          try {
            const { buildIndexForDocument } = await import("@/lib/ragLocal");
            await buildIndexForDocument(row.id, parsedBlocks, currentUserId);
            console.log(`✅ Indexed ${parsedBlocks.length} blocks for: ${row.name}`);
          } catch (indexError: any) {
            console.error(`⚠️ Failed to index ${row.name}:`, indexError);
            // Tetap lanjutkan meskipun indexing gagal
          }
        } else {
          console.warn(`⚠️ No parsed blocks for ${row.name} (${parsedBlocks.length} blocks)`);
        }

        // Update status menjadi "Processed" setelah berhasil
        setDocuments((prev) => {
          const updated = prev.map((d) => {
            if (d.id === row.id) {
              const newStatus = parsedBlocks.length > 0 ? ("Processed" as const) : ("Processing" as const);
              console.log(`📝 Updating status for ${row.name}: ${d.status} → ${newStatus}`);
              return { 
                ...d, 
                status: newStatus,
                parsedText: parsedText || d.parsedText,
                uploadedBy: currentUserId || d.uploadedBy,
              };
            }
            return d;
          });

          // Track activity setelah berhasil diproses
          if (currentUserId) {
            const activities = loadActivities(currentUserId);
            const doc = updated.find((d) => d.id === row.id);
            if (doc && doc.status === "Processed") {
              const exists = activities.some(
                (a) =>
                  a.type === "document_upload" &&
                  a.metadata?.documentId === doc.id
              );
              if (!exists) {
                addActivity(
                  currentUserId,
                  "document_upload",
                  `Processed document "${doc.name}"`,
                  {
                    documentId: doc.id,
                    documentName: doc.name,
                  }
                );
              }
            }
          }

          return updated;
        });

        console.log(`✅ Successfully processed: ${row.name} (${parsedBlocks.length} blocks)`);
      } catch (error: any) {
        console.error(`❌ Failed to process ${row.name}:`, error);
        // Update status tetap "Processing" atau bisa ditambahkan status "Failed"
        setDocuments((prev) =>
          prev.map((d) =>
            d.id === row.id ? { ...d, status: "Processing" as const } : d
          )
        );
      }
    });

    // Tunggu semua proses selesai
    await Promise.all([...savePromises, ...ingestPromises]);

    console.log(`📄 Processed ${files.length} file(s): ${files.map((f) => f.name).join(", ")}`);
  };

  const removeDocument = (id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    if (currentUserId) {
      idbDeleteFile(id, currentUserId).catch((e) => console.error("Gagal hapus file di IDB:", e));
      deleteIndexForDocument(id, currentUserId).catch((e) => console.error("Gagal hapus index RAG:", e));
    }
  };

  const addQuery = (text: string) => {
    const q: RecentQuery = {
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`,
      text,
      at: Date.now(),
    };
    setRecentQueries((prev) => [q, ...prev].slice(0, 50)); // simpan maksimal 50
    
    // Track activity
    if (currentUserId) {
      addActivity(currentUserId, 'query', `Asked query about "${text}"`, {
        queryId: q.id,
        queryText: text
      });
    }
  };

  const removeQuery = (id: string) => {
    setRecentQueries((prev) => prev.filter((q) => q.id !== id));
  };

  const clearQueries = () => {
    setRecentQueries([]);
  };

  const value = useMemo(
    () => ({
      documents,
      addFromFiles,
      removeDocument,
      recentQueries,
      addQuery,
      removeQuery,
      clearQueries,
    }),
    [documents, recentQueries],
  );

  return <DocumentsCtx.Provider value={value}>{children}</DocumentsCtx.Provider>;
}

export function useDocuments() {
  const ctx = useContext(DocumentsCtx);
  if (!ctx) throw new Error("useDocuments must be used within <DocumentsProvider />");
  return ctx;
}
