"use client";

import { useEffect, useState, useCallback } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────
type Chunk = {
  id: string;
  docId: string;
  start: number;
  end: number;
  text: string;
};

type VectorEntry = {
  chunk: Chunk;
  vector: number[];
  norm: number;
  dimension: number;
  stats: {
    min: number;
    max: number;
    mean: number;
    nonZero: number;
    magnitudeCheck: number;
    norm: number;
  };
};

// ─── IndexedDB helpers ───────────────────────────────────────────────────────
const DB_NAME = "rag-idx-db-shared";
const DB_VERSION = 1;

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getAllChunks(): Promise<Chunk[]> {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("chunks", "readonly");
    const req = tx.objectStore("chunks").getAll();
    req.onsuccess = () => resolve(req.result as Chunk[]);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

async function getVecBlob(chunkId: string): Promise<Blob | null> {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("vecs", "readonly");
    const req = tx.objectStore("vecs").get(chunkId);
    req.onsuccess = () => resolve((req.result as Blob) || null);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

async function getAllMeta(): Promise<Record<string, any>> {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("meta", "readonly");
    const results: Record<string, any> = {};
    const store = tx.objectStore("meta");
    const req = store.openCursor();
    req.onsuccess = (e: any) => {
      const cursor = e.target.result;
      if (!cursor) return;
      results[String(cursor.key)] = cursor.value;
      cursor.continue();
    };
    tx.oncomplete = () => { db.close(); resolve(results); };
    tx.onerror = () => reject(tx.error);
  });
}

function blobToFloat32(blob: Blob): Promise<Float32Array> {
  return blob.arrayBuffer().then((buf) => new Float32Array(buf));
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function vecStats(v: number[]) {
  const min = Math.min(...v);
  const max = Math.max(...v);
  const mean = v.reduce((s, x) => s + x, 0) / v.length;
  const nonZero = v.filter((x) => Math.abs(x) > 1e-6).length;
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
  return { min, max, mean, nonZero, magnitudeCheck: norm, norm };
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function VectorInspectorPage() {
  const [entries, setEntries] = useState<VectorEntry[]>([]);
  const [meta, setMeta] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [showAllDims, setShowAllDims] = useState(false);
  const [filterDocId, setFilterDocId] = useState("all");
  const [compareIdxA, setCompareIdxA] = useState<number | null>(null);
  const [compareIdxB, setCompareIdxB] = useState<number | null>(null);
  const [cosScore, setCosScore] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "detail" | "compare" | "metadata">("overview");
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setProgress("Membuka IndexedDB...");
    try {
      const chunks = await getAllChunks();
      const metaData = await getAllMeta();
      setMeta(metaData);

      if (chunks.length === 0) {
        setError("IndexedDB kosong. Silakan upload CV/dokumen terlebih dahulu di halaman utama.");
        setLoading(false);
        return;
      }

      const result: VectorEntry[] = [];
      for (let i = 0; i < chunks.length; i++) {
        setProgress(`Memuat vektor ${i + 1} / ${chunks.length}...`);
        const chunk = chunks[i];
        const blob = await getVecBlob(chunk.id);
        if (!blob) continue;
        const f32 = await blobToFloat32(blob);
        const vector = Array.from(f32);
        const stats = vecStats(vector);
        result.push({
          chunk,
          vector,
          norm: stats.norm,
          dimension: vector.length,
          stats,
        });
        if (i % 5 === 0) await new Promise((r) => setTimeout(r, 0));
      }
      setEntries(result);
      setProgress(`Selesai — ${result.length} chunk termuat.`);
    } catch (e: any) {
      setError(e?.message || "Gagal membaca IndexedDB.");
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const docIds = Array.from(new Set(entries.map((e) => e.chunk.docId)));
  const filtered = filterDocId === "all" ? entries : entries.filter((e) => e.chunk.docId === filterDocId);
  const selected = selectedIdx !== null ? entries[selectedIdx] : null;

  function handleCompare() {
    if (compareIdxA === null || compareIdxB === null) return;
    const score = cosineSimilarity(entries[compareIdxA].vector, entries[compareIdxB].vector);
    setCosScore(score);
  }

  const DIMS_PREVIEW = 24;

  function dimColor(val: number): string {
    const abs = Math.abs(val);
    if (abs > 0.12) return val > 0 ? "#4ade80" : "#f87171";
    if (abs > 0.06) return val > 0 ? "#86efac" : "#fca5a5";
    return "#94a3b8";
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)", fontFamily: "'Inter', 'Segoe UI', sans-serif", color: "#e2e8f0" }}>

      {/* ─── Header ─────────────────────────────────────────────────── */}
      <div style={{ borderBottom: "1px solid rgba(139,92,246,0.3)", background: "rgba(15,23,42,0.9)", backdropFilter: "blur(16px)", padding: "20px 32px", display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg,#7c3aed,#3b82f6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🔬</div>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, background: "linear-gradient(90deg,#a78bfa,#60a5fa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Vector Embedding Inspector
          </h1>
          <p style={{ margin: 0, fontSize: 12, color: "#94a3b8" }}>
            Model: <code style={{ color: "#a78bfa" }}>Xenova/all-MiniLM-L6-v2</code> · Dimensi: <code style={{ color: "#60a5fa" }}>384</code> · Store: IndexedDB (<code style={{ color: "#34d399" }}>{DB_NAME}</code>)
          </p>
        </div>
        <button onClick={loadData} disabled={loading} style={{ marginLeft: "auto", padding: "8px 20px", borderRadius: 8, border: "1px solid rgba(139,92,246,0.4)", background: loading ? "rgba(139,92,246,0.1)" : "rgba(139,92,246,0.25)", color: "#c4b5fd", cursor: loading ? "not-allowed" : "pointer", fontWeight: 600, fontSize: 13 }}>
          {loading ? "⏳ Memuat..." : "🔄 Refresh"}
        </button>
      </div>

      {/* ─── Progress / Error ────────────────────────────────────────── */}
      {loading && (
        <div style={{ margin: "16px 32px", padding: "12px 16px", borderRadius: 8, background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.3)", color: "#93c5fd", fontSize: 13 }}>
          ⏳ {progress}
        </div>
      )}
      {error && (
        <div style={{ margin: "16px 32px", padding: "14px 16px", borderRadius: 8, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5", fontSize: 13 }}>
          ⚠️ {error}
        </div>
      )}

      {/* ─── Stats Bar ──────────────────────────────────────────────── */}
      {entries.length > 0 && (
        <div style={{ display: "flex", gap: 12, padding: "16px 32px", flexWrap: "wrap" }}>
          {[
            { label: "Total Chunks", value: entries.length, icon: "📦", color: "#a78bfa" },
            { label: "Dimensi Vektor", value: entries[0]?.dimension ?? 384, icon: "📐", color: "#60a5fa" },
            { label: "Total Dokumen", value: docIds.length, icon: "📄", color: "#34d399" },
            { label: "Model Embedding", value: "all-MiniLM-L6-v2", icon: "🤖", color: "#f59e0b" },
            { label: "Similarity Metric", value: "Cosine Similarity", icon: "📊", color: "#f472b6" },
            { label: "Storage", value: "IndexedDB (Browser)", icon: "💾", color: "#818cf8" },
          ].map((s) => (
            <div key={s.label} style={{ flex: "1 1 160px", minWidth: 160, background: "rgba(30,27,75,0.6)", border: `1px solid ${s.color}33`, borderRadius: 10, padding: "12px 16px" }}>
              <div style={{ fontSize: 20 }}>{s.icon}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{String(s.value)}</div>
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Tabs ───────────────────────────────────────────────────── */}
      {entries.length > 0 && (
        <>
          <div style={{ display: "flex", gap: 4, padding: "0 32px 0", borderBottom: "1px solid rgba(139,92,246,0.2)" }}>
            {(["overview", "detail", "compare", "metadata"] as const).map((t) => (
              <button key={t} onClick={() => setActiveTab(t)} style={{ padding: "10px 20px", background: activeTab === t ? "rgba(139,92,246,0.2)" : "transparent", border: "none", borderBottom: activeTab === t ? "2px solid #7c3aed" : "2px solid transparent", color: activeTab === t ? "#a78bfa" : "#64748b", fontWeight: activeTab === t ? 700 : 400, cursor: "pointer", fontSize: 14 }}>
                {t === "overview" ? "📋 Overview" : t === "detail" ? "🔍 Detail Vektor" : t === "compare" ? "⚖️ Cosine Similarity" : "🗂️ Metadata"}
              </button>
            ))}
          </div>

          <div style={{ padding: "24px 32px" }}>

            {/* ═══ TAB: OVERVIEW ══════════════════════════════════════ */}
            {activeTab === "overview" && (
              <div>
                <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontSize: 13, color: "#94a3b8" }}>Filter Dokumen:</span>
                  {["all", ...docIds].map((id) => (
                    <button key={id} onClick={() => setFilterDocId(id)} style={{ padding: "5px 14px", borderRadius: 20, border: `1px solid ${filterDocId === id ? "#7c3aed" : "rgba(100,116,139,0.3)"}`, background: filterDocId === id ? "rgba(124,58,237,0.2)" : "transparent", color: filterDocId === id ? "#a78bfa" : "#64748b", fontSize: 12, cursor: "pointer" }}>
                      {id === "all" ? "Semua" : id}
                    </button>
                  ))}
                </div>

                <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid rgba(139,92,246,0.2)" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: "rgba(30,27,75,0.8)" }}>
                        {["#", "Chunk ID", "Doc ID", "Teks (preview)", "Chars", "Dimensi", "Norm ‖v‖", `V[0..${DIMS_PREVIEW - 1}] (${DIMS_PREVIEW} dim awal)`].map((h) => (
                          <th key={h} style={{ padding: "10px 12px", textAlign: "left", color: "#94a3b8", fontWeight: 600, borderBottom: "1px solid rgba(139,92,246,0.2)", whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((e, i) => (
                        <tr key={e.chunk.id} onClick={() => { setSelectedIdx(entries.indexOf(e)); setActiveTab("detail"); }} style={{ cursor: "pointer", borderBottom: "1px solid rgba(100,116,139,0.1)", background: i % 2 === 0 ? "rgba(15,23,42,0.4)" : "transparent" }}>
                          <td style={{ padding: "9px 12px", color: "#64748b" }}>{entries.indexOf(e) + 1}</td>
                          <td style={{ padding: "9px 12px", color: "#818cf8", fontFamily: "monospace", fontSize: 11, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.chunk.id}</td>
                          <td style={{ padding: "9px 12px", color: "#34d399", fontSize: 11, maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.chunk.docId}</td>
                          <td style={{ padding: "9px 12px", color: "#cbd5e1", maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.chunk.text}</td>
                          <td style={{ padding: "9px 12px", color: "#94a3b8", textAlign: "right" }}>{e.chunk.text.length}</td>
                          <td style={{ padding: "9px 12px", color: "#60a5fa", textAlign: "center", fontWeight: 700 }}>{e.dimension}</td>
                          <td style={{ padding: "9px 12px", color: "#f59e0b", textAlign: "right" }}>{e.stats.magnitudeCheck.toFixed(5)}</td>
                          <td style={{ padding: "9px 12px" }}>
                            <div style={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                              {e.vector.slice(0, DIMS_PREVIEW).map((v, di) => (
                                <span key={di} title={`dim[${di}]=${v.toFixed(6)}`} style={{ fontSize: 9, fontFamily: "monospace", color: dimColor(v), background: "rgba(0,0,0,0.3)", borderRadius: 3, padding: "1px 3px", whiteSpace: "nowrap" }}>
                                  {v.toFixed(3)}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p style={{ fontSize: 12, color: "#475569", marginTop: 8 }}>💡 Klik baris untuk melihat detail lengkap 384 dimensi vektor</p>
              </div>
            )}

            {/* ═══ TAB: DETAIL ════════════════════════════════════════ */}
            {activeTab === "detail" && (
              <div>
                <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontSize: 13, color: "#94a3b8" }}>Pilih Chunk:</span>
                  <select value={selectedIdx ?? ""} onChange={(e) => setSelectedIdx(Number(e.target.value))} style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(139,92,246,0.3)", background: "rgba(30,27,75,0.8)", color: "#e2e8f0", fontSize: 13 }}>
                    <option value="">-- Pilih --</option>
                    {entries.map((e, i) => (
                      <option key={i} value={i}>#{i + 1} — {e.chunk.id.slice(0, 48)}</option>
                    ))}
                  </select>
                </div>

                {selected && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    {/* Left: Chunk Info */}
                    <div style={{ background: "rgba(30,27,75,0.6)", border: "1px solid rgba(139,92,246,0.25)", borderRadius: 10, padding: 20 }}>
                      <h3 style={{ margin: "0 0 14px", color: "#a78bfa", fontSize: 14, fontWeight: 700 }}>📦 Informasi Chunk & Metadata</h3>
                      {[
                        ["Chunk ID", selected.chunk.id],
                        ["Doc ID", selected.chunk.docId],
                        ["Start (char offset)", String(selected.chunk.start)],
                        ["End (char offset)", String(selected.chunk.end)],
                        ["Panjang Teks", `${selected.chunk.text.length} karakter`],
                        ["Dimensi Vektor", String(selected.dimension)],
                        ["Norm ‖v‖ (magnitude)", selected.stats.norm.toFixed(8)],
                        ["Min nilai dimensi", selected.stats.min.toFixed(8)],
                        ["Max nilai dimensi", selected.stats.max.toFixed(8)],
                        ["Mean nilai dimensi", selected.stats.mean.toFixed(8)],
                        ["Non-zero dimensi", `${selected.stats.nonZero} / ${selected.dimension}`],
                      ].map(([k, v]) => (
                        <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(100,116,139,0.1)", fontSize: 12 }}>
                          <span style={{ color: "#94a3b8" }}>{k}</span>
                          <span style={{ color: "#e2e8f0", fontFamily: "monospace", maxWidth: 240, wordBreak: "break-all", textAlign: "right" }}>{v}</span>
                        </div>
                      ))}
                      <div style={{ marginTop: 14 }}>
                        <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 6 }}>Teks Chunk (raw):</div>
                        <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 6, padding: 10, fontSize: 12, color: "#cbd5e1", lineHeight: 1.5, maxHeight: 140, overflowY: "auto", border: "1px solid rgba(100,116,139,0.15)", whiteSpace: "pre-wrap" }}>
                          {selected.chunk.text}
                        </div>
                      </div>
                    </div>

                    {/* Right: Vector Values */}
                    <div style={{ background: "rgba(30,27,75,0.6)", border: "1px solid rgba(96,165,250,0.25)", borderRadius: 10, padding: 20 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                        <h3 style={{ margin: 0, color: "#60a5fa", fontSize: 14, fontWeight: 700 }}>📐 Representasi Vektor ({selected.dimension} dimensi)</h3>
                        <button onClick={() => setShowAllDims(!showAllDims)} style={{ padding: "4px 12px", borderRadius: 6, border: "1px solid rgba(96,165,250,0.3)", background: "rgba(59,130,246,0.1)", color: "#93c5fd", fontSize: 11, cursor: "pointer" }}>
                          {showAllDims ? "Ringkas (96 dim)" : "Tampilkan Semua 384"}
                        </button>
                      </div>

                      {/* Mini bar visualization */}
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>Distribusi nilai — mini bar chart ({showAllDims ? 384 : 64} dim ditampilkan):</div>
                        <div style={{ display: "flex", alignItems: "flex-end", gap: 1, height: 40, background: "rgba(0,0,0,0.3)", borderRadius: 6, padding: "4px 6px" }}>
                          {selected.vector.slice(0, showAllDims ? 384 : 64).map((v, di) => {
                            const h = Math.min(Math.abs(v) * 180, 36);
                            return (
                              <div key={di} title={`dim[${di}]=${v.toFixed(6)}`} style={{ flex: 1, height: h, background: v > 0 ? "#4ade80" : "#f87171", borderRadius: "2px 2px 0 0", minWidth: 2, opacity: 0.8 }} />
                            );
                          })}
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#475569", marginTop: 2 }}>
                          <span>dim[0]</span>
                          <span style={{ color: "#4ade80" }}>■ positif</span>
                          <span style={{ color: "#f87171" }}>■ negatif</span>
                          <span>dim[{showAllDims ? 383 : 63}]</span>
                        </div>
                      </div>

                      {/* Numerical values grid */}
                      <div style={{ overflowY: "auto", maxHeight: 340 }}>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(115px, 1fr))", gap: 3 }}>
                          {(showAllDims ? selected.vector : selected.vector.slice(0, 96)).map((v, di) => (
                            <div key={di} style={{ background: "rgba(0,0,0,0.25)", border: `1px solid ${Math.abs(v) > 0.08 ? (v > 0 ? "rgba(74,222,128,0.3)" : "rgba(248,113,113,0.3)") : "rgba(100,116,139,0.1)"}`, borderRadius: 4, padding: "3px 6px", display: "flex", justifyContent: "space-between" }}>
                              <span style={{ fontSize: 9, color: "#475569" }}>d{di}</span>
                              <span style={{ fontSize: 10, fontFamily: "monospace", color: dimColor(v), fontWeight: Math.abs(v) > 0.08 ? 700 : 400 }}>{v.toFixed(5)}</span>
                            </div>
                          ))}
                        </div>
                        {!showAllDims && selected.dimension > 96 && (
                          <p style={{ fontSize: 11, color: "#475569", textAlign: "center", marginTop: 8 }}>
                            ... dan {selected.dimension - 96} dimensi lainnya. Klik tombol untuk tampilkan semua.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {!selected && (
                  <div style={{ textAlign: "center", padding: "40px", color: "#475569" }}>
                    ← Pilih chunk dari dropdown di atas, atau klik baris di tab Overview
                  </div>
                )}
              </div>
            )}

            {/* ═══ TAB: COSINE SIMILARITY ════════════════════════════ */}
            {activeTab === "compare" && (
              <div>
                <p style={{ color: "#94a3b8", fontSize: 13, marginTop: 0 }}>
                  Pilih dua chunk untuk menghitung <strong style={{ color: "#a78bfa" }}>Cosine Similarity</strong> antara vektor embedding-nya.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                  {([["A", compareIdxA, setCompareIdxA], ["B", compareIdxB, setCompareIdxB]] as any[]).map(([label, val, setter]) => (
                    <div key={label} style={{ background: "rgba(30,27,75,0.6)", border: "1px solid rgba(139,92,246,0.25)", borderRadius: 10, padding: 16 }}>
                      <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 8 }}>Vektor {label}:</div>
                      <select value={val ?? ""} onChange={(e) => setter(Number(e.target.value))} style={{ width: "100%", padding: "7px 12px", borderRadius: 8, border: "1px solid rgba(139,92,246,0.3)", background: "rgba(15,23,42,0.8)", color: "#e2e8f0", fontSize: 12, marginBottom: 10 }}>
                        <option value="">-- Pilih Chunk --</option>
                        {entries.map((e, i) => (
                          <option key={i} value={i}>#{i + 1} — {e.chunk.id.slice(0, 50)}</option>
                        ))}
                      </select>
                      {val !== null && entries[val] && (
                        <div style={{ fontSize: 11, color: "#64748b", background: "rgba(0,0,0,0.3)", borderRadius: 6, padding: 8, lineHeight: 1.5 }}>
                          <div style={{ color: "#818cf8" }}>{entries[val].chunk.id}</div>
                          <div style={{ color: "#94a3b8", marginTop: 4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" } as any}>{entries[val].chunk.text}</div>
                          <div style={{ marginTop: 4, color: "#60a5fa" }}>Dim: {entries[val].dimension} · Norm: {entries[val].stats.norm.toFixed(5)}</div>
                          <div style={{ marginTop: 4, fontSize: 10, color: "#64748b" }}>
                            V[0..5] = [{entries[val].vector.slice(0, 6).map((v) => v.toFixed(4)).join(", ")}...]
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div style={{ textAlign: "center", marginBottom: 20 }}>
                  <button onClick={handleCompare} disabled={compareIdxA === null || compareIdxB === null} style={{ padding: "12px 32px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#7c3aed,#3b82f6)", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", opacity: compareIdxA === null || compareIdxB === null ? 0.5 : 1 }}>
                    ⚖️ Hitung Cosine Similarity
                  </button>
                </div>

                {cosScore !== null && (
                  <div style={{ background: "rgba(30,27,75,0.8)", border: "2px solid rgba(167,139,250,0.4)", borderRadius: 12, padding: 24, textAlign: "center" }}>
                    <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 8 }}>Hasil Cosine Similarity Score</div>
                    <div style={{ fontSize: 52, fontWeight: 900, background: "linear-gradient(90deg,#a78bfa,#60a5fa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                      {cosScore.toFixed(6)}
                    </div>
                    <div style={{ marginTop: 12, padding: "8px 20px", borderRadius: 8, display: "inline-block", background: cosScore > 0.8 ? "rgba(74,222,128,0.15)" : cosScore > 0.5 ? "rgba(251,191,36,0.15)" : "rgba(248,113,113,0.15)", border: `1px solid ${cosScore > 0.8 ? "rgba(74,222,128,0.4)" : cosScore > 0.5 ? "rgba(251,191,36,0.4)" : "rgba(248,113,113,0.4)"}`, color: cosScore > 0.8 ? "#4ade80" : cosScore > 0.5 ? "#fbbf24" : "#f87171", fontSize: 13, fontWeight: 600 }}>
                      {cosScore > 0.8 ? "🟢 Sangat Mirip (Highly Similar)" : cosScore > 0.5 ? "🟡 Cukup Mirip (Moderate)" : "🔴 Kurang Mirip (Low Similarity)"}
                    </div>
                    <div style={{ marginTop: 12, fontSize: 12, color: "#64748b" }}>
                      Formula: cos(θ) = (A · B) / (‖A‖ × ‖B‖) · Rentang nilai: −1 hingga +1
                    </div>
                    <div style={{ marginTop: 12, height: 8, borderRadius: 99, background: "rgba(100,116,139,0.2)", overflow: "hidden" }}>
                      <div style={{ width: `${((cosScore + 1) / 2) * 100}%`, height: "100%", background: "linear-gradient(90deg,#7c3aed,#3b82f6,#4ade80)", borderRadius: 99 }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#475569", marginTop: 3 }}>
                      <span>−1 (berlawanan)</span><span>0 (ortogonal)</span><span>+1 (identik)</span>
                    </div>
                  </div>
                )}

                <div style={{ marginTop: 20, background: "rgba(15,23,42,0.6)", border: "1px solid rgba(96,165,250,0.2)", borderRadius: 10, padding: 16 }}>
                  <h4 style={{ margin: "0 0 10px", color: "#60a5fa", fontSize: 13 }}>📚 Penjelasan untuk Laporan Skripsi</h4>
                  <p style={{ margin: 0, fontSize: 12, color: "#94a3b8", lineHeight: 1.7 }}>
                    Cosine Similarity mengukur kedekatan semantik antara dua vektor embedding dengan menghitung cosinus sudut di antara keduanya.
                    Nilai mendekati <strong style={{ color: "#4ade80" }}>1.0</strong> menandakan teks sangat relevan secara semantik,
                    nilai <strong style={{ color: "#f59e0b" }}>0</strong> menandakan tidak berkaitan, dan nilai
                    <strong style={{ color: "#f87171" }}> −1</strong> menandakan berlawanan makna.
                    Dalam sistem RAG ini, setiap chunk CV di-embed menjadi vektor berdimensi <strong style={{ color: "#a78bfa" }}>384</strong> menggunakan model
                    <code style={{ color: "#60a5fa" }}> Xenova/all-MiniLM-L6-v2</code> dan disimpan dalam <strong style={{ color: "#34d399" }}>IndexedDB</strong> browser.
                  </p>
                </div>
              </div>
            )}

            {/* ═══ TAB: METADATA ══════════════════════════════════════ */}
            {activeTab === "metadata" && (
              <div>
                <h3 style={{ margin: "0 0 16px", color: "#34d399", fontSize: 15 }}>🗂️ Document-Level Metadata (Object Store: meta)</h3>
                {Object.keys(meta).length === 0 ? (
                  <div style={{ color: "#475569", fontSize: 13 }}>Tidak ada metadata dokumen tersimpan.</div>
                ) : (
                  Object.entries(meta).map(([docId, val]) => (
                    <div key={docId} style={{ background: "rgba(30,27,75,0.6)", border: "1px solid rgba(52,211,153,0.2)", borderRadius: 10, padding: 16, marginBottom: 12 }}>
                      <div style={{ fontSize: 13, color: "#34d399", fontWeight: 700, marginBottom: 8 }}>Doc ID: {docId}</div>
                      <pre style={{ margin: 0, fontSize: 11, color: "#94a3b8", background: "rgba(0,0,0,0.3)", borderRadius: 6, padding: 10, overflowX: "auto" }}>
                        {JSON.stringify(val, null, 2)}
                      </pre>
                    </div>
                  ))
                )}

                <div style={{ marginTop: 20, background: "rgba(15,23,42,0.6)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: 10, padding: 16 }}>
                  <h4 style={{ margin: "0 0 12px", color: "#a78bfa", fontSize: 13 }}>🗄️ Skema IndexedDB — Vector Store</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                    {[
                      { store: "chunks", key: "chunkId", value: "Chunk { id, docId, start, end, text }", color: "#818cf8" },
                      { store: "vecs", key: "chunkId", value: "Blob → Float32Array × 384 dims", color: "#60a5fa" },
                      { store: "meta", key: "docId", value: "Object { info, metadata, ... }", color: "#34d399" },
                    ].map((s) => (
                      <div key={s.store} style={{ background: "rgba(0,0,0,0.3)", borderRadius: 8, padding: 12, border: `1px solid ${s.color}33` }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: s.color, marginBottom: 6 }}>Object Store: <code>{s.store}</code></div>
                        <div style={{ fontSize: 11, color: "#64748b" }}>Key: <code style={{ color: "#94a3b8" }}>{s.key}</code></div>
                        <div style={{ fontSize: 11, color: "#64748b", marginTop: 3 }}>Value: <code style={{ color: "#94a3b8" }}>{s.value}</code></div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 12, fontSize: 12, color: "#64748b" }}>
                    DB Name: <code style={{ color: "#a78bfa" }}>{DB_NAME}</code> · Version: <code style={{ color: "#60a5fa" }}>1</code> · Scope: Browser-local (tidak dikirim ke server)
                  </div>
                </div>
              </div>
            )}

          </div>
        </>
      )}

      {/* Footer */}
      <div style={{ borderTop: "1px solid rgba(139,92,246,0.15)", padding: "12px 32px", display: "flex", justifyContent: "space-between", color: "#334155", fontSize: 11 }}>
        <span>RAG HR Intelligent · Vector Inspector · Xenova/all-MiniLM-L6-v2</span>
        <span>Data tersimpan lokal di browser (IndexedDB) — tidak dikirim ke server</span>
      </div>
    </div>
  );
}
