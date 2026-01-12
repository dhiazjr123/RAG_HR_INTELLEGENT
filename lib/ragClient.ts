// lib/ragClient.ts
export type Doc = {
    id: string | number;
    name: string;
    mime: string;
    size: number;              // bytes
    path?: string;             // e.g. "/uploads/xxx.pdf" (jika API mengembalikan)
    status: "Processing" | "Processed";
    createdAt: string;         // ISO
  };
  
  export type QueryItem = {
    id: string | number;
    text: string;
    answer?: string;
    createdAt: string;         // ISO
  };
  
  async function jsonOk<T>(res: Response): Promise<T> {
    if (!res.ok) {
      const msg = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status} ${msg}`);
    }
    return res.json() as Promise<T>;
  }
  
  export async function listDocs(): Promise<Doc[]> {
    const r = await fetch("/api/rag?resource=documents", { cache: "no-store" });
    return jsonOk<Doc[]>(r);
  }
  
  export async function listQueries(): Promise<QueryItem[]> {
    const r = await fetch("/api/rag?resource=queries", { cache: "no-store" });
    return jsonOk<QueryItem[]>(r);
  }
  
  export async function uploadDoc(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    const r = await fetch("/api/rag", { method: "POST", body: fd });
    return jsonOk<{ ok: true }>(r);
  }
  
  export async function deleteDoc(id: string | number) {
    const r = await fetch("/api/rag", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "deleteDoc", id }),
    });
    return jsonOk<{ ok: true }>(r);
  }
  
  export async function clearQueries() {
    const r = await fetch("/api/rag", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "clearQueries" }),
    });
    return jsonOk<{ ok: true }>(r);
  }
  
  export async function askRag(question: string, topK = 6) {
    const r = await fetch("/api/rag", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "ask", question, topK }),
    });
    return jsonOk<{ answer: string; sources: any[] }>(r);
  }
  