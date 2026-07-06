"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { PartnerJobCriteria } from "@/lib/partner-jd-criteria";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog } from "@/components/ui/dialog";
import {
  criteriaToForm,
  formToCriteria,
  slugifyId,
  useJdCriteria,
  type JdFormState,
} from "@/lib/jd-criteria-client";
import { cn } from "@/lib/utils";
import {
  Briefcase,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";

type Toast = { type: "success" | "error"; message: string };

export function JdCriteriaManager() {
  const { criteria, updatedAt, loading, error, refresh } = useJdCriteria();
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<JdFormState>(() => criteriaToForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PartnerJobCriteria | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  const showToast = useCallback((type: Toast["type"], message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const departments = useMemo(() => {
    const set = new Set(criteria.map((c) => c.department));
    return ["all", ...Array.from(set).sort()];
  }, [criteria]);

  const stats = useMemo(() => {
    const official = criteria.filter((c) => c.fullText.includes("URAIAN & KUALIFIKASI JABATAN")).length;
    return {
      total: criteria.length,
      departments: departments.length - 1,
      official,
    };
  }, [criteria, departments]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return criteria.filter((c) => {
      if (deptFilter !== "all" && c.department !== deptFilter) return false;
      if (!q) return true;
      return (
        c.title.toLowerCase().includes(q) ||
        c.department.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        c.summary.toLowerCase().includes(q) ||
        c.location.toLowerCase().includes(q)
      );
    });
  }, [criteria, search, deptFilter]);

  const openCreate = () => {
    setEditingId(null);
    setForm(criteriaToForm());
    setFormError(null);
    setEditorOpen(true);
  };

  const openEdit = (c: PartnerJobCriteria) => {
    setEditingId(c.id);
    setForm(criteriaToForm(c));
    setFormError(null);
    setEditorOpen(true);
  };

  const patchForm = (patch: Partial<JdFormState>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  };

  const rebuildFullText = () => {
    const item = formToCriteria(form);
    patchForm({ fullText: item.fullText });
    showToast("success", "fullText berhasil di-generate ulang.");
  };

  const save = async () => {
    setFormError(null);
    setSaving(true);
    try {
      const item = formToCriteria(form);
      if (!item.id || !item.title || !item.fullText) {
        throw new Error("ID, judul posisi, dan dokumen JD wajib diisi.");
      }

      const url = editingId
        ? `/api/admin/jd-criteria/${encodeURIComponent(editingId)}`
        : "/api/admin/jd-criteria";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan");

      setEditorOpen(false);
      await refresh();
      showToast("success", editingId ? `"${item.title}" berhasil diperbarui.` : `"${item.title}" berhasil ditambahkan.`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Gagal menyimpan";
      setFormError(msg);
      showToast("error", msg);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (target: PartnerJobCriteria) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/jd-criteria/${encodeURIComponent(target.id)}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Gagal menghapus");
      setDeleteTarget(null);
      if (expandedId === target.id) setExpandedId(null);
      await refresh();
      showToast("success", `"${target.title}" berhasil dihapus.`);
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Gagal menghapus");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        document.getElementById("admin-jd-search")?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="bg-white min-h-full">
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-primary mb-1">
              <FileText className="h-5 w-5" />
              <span className="text-xs font-semibold uppercase tracking-wider">Admin PT Sosro</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight">Kelola JD & Kriteria</h1>
            <p className="text-sm text-slate-500 mt-1 max-w-xl font-medium">
              Perubahan langsung tersinkron ke panel kriteria di AI Assistant HR.
            </p>
            {updatedAt && (
              <p className="text-xs text-slate-400 mt-1 font-medium">
                Terakhir diperbarui: {new Date(updatedAt).toLocaleString("id-ID")}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refresh}
              disabled={loading}
              className="admin-action-btn gap-2 rounded-full"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              Refresh
            </Button>
            <Button size="sm" onClick={openCreate} className="admin-action-btn gap-2 btn-figma border-0 rounded-full">
              <Plus className="h-4 w-4" />
              Tambah JD
            </Button>
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <div
            className={cn(
              "admin-toast-enter flex items-center gap-2 rounded-lg border px-4 py-3 text-sm",
              toast.type === "success"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
                : "border-red-500/30 bg-red-500/10 text-red-500"
            )}
          >
            {toast.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <X className="h-4 w-4 shrink-0" />
            )}
            {toast.message}
          </div>
        )}

        {error && (
          <div className="text-sm text-red-500 border border-red-500/30 bg-red-500/10 rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            icon={Briefcase}
            label="Total Posisi"
            value={stats.total}
            gradient="linear-gradient(135deg, #70a1ff 0%, #5352ed 100%)"
          />
          <StatCard
            icon={Building2}
            label="Departemen"
            value={stats.departments}
            gradient="linear-gradient(135deg, #ffb347 0%, #ffcc33 100%)"
          />
          <StatCard
            icon={FileText}
            label="Dokumen Resmi U&KJ"
            value={stats.official}
            gradient="linear-gradient(135deg, #2ed573 0%, #1abc9c 100%)"
          />
        </div>

        {/* Search & filter toolbar */}
        <div className="space-y-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 rounded-xl border border-slate-200 bg-slate-50/50 transition-all focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <Input
                id="admin-jd-search"
                placeholder="Cari posisi, departemen, ID, lokasi..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-9 border-0 bg-transparent focus-visible:ring-0 text-slate-800 text-sm"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label="Hapus pencarian"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="text-xs text-slate-400 font-semibold flex items-center shrink-0 px-1 uppercase tracking-wider">
              {filtered.length} / {criteria.length} posisi
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {departments.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDeptFilter(d)}
                className={cn(
                  "text-xs px-3.5 py-1.5 rounded-full border transition-all duration-200",
                  deptFilter === d
                    ? "bg-gradient-to-r from-[#0ea5e9] to-[#0d9488] text-white border-0 font-semibold shadow-md shadow-[#0ea5e9]/10"
                    : "border-slate-100 text-slate-500 bg-slate-50 hover:bg-slate-100 hover:text-slate-800"
                )}
              >
                {d === "all" ? "Semua departemen" : d}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Tip: tekan Ctrl+K untuk fokus ke pencarian</p>
        </div>

        {/* List */}
        {loading && criteria.length === 0 ? (
          <div className="grid gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 rounded-xl border border-border bg-muted/20 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            hasCriteria={criteria.length > 0}
            onClear={() => {
              setSearch("");
              setDeptFilter("all");
            }}
            onAdd={openCreate}
          />
        ) : (
          <div className="grid gap-3">
            {filtered.map((c) => (
              <JdCard
                key={c.id}
                item={c}
                expanded={expandedId === c.id}
                onToggle={() => setExpandedId((id) => (id === c.id ? null : c.id))}
                onEdit={() => openEdit(c)}
                onDelete={() => setDeleteTarget(c)}
                highlight={search.trim()}
              />
            ))}
          </div>
        )}
      </div>

      {/* Editor dialog */}
      <Dialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        title={editingId ? "Edit JD & Kriteria" : "Tambah JD & Kriteria"}
        className="max-w-3xl"
      >
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="ID (unik, slug)">
              <Input
                value={form.id}
                onChange={(e) => patchForm({ id: e.target.value })}
                placeholder="sgs-pbk-modern-packaging-worker"
                disabled={!!editingId}
              />
            </Field>
            <Field label="Departemen / Bagian">
              <Input
                value={form.department}
                onChange={(e) => patchForm({ department: e.target.value })}
                placeholder="Produksi & Packaging (PBK)"
              />
            </Field>
          </div>

          <Field label="Nama Jabatan / Posisi">
            <Input
              value={form.title}
              onChange={(e) => {
                const title = e.target.value;
                patchForm({
                  title,
                  id: !editingId && !form.id ? slugifyId(title) : form.id,
                });
              }}
              placeholder="Modern Packaging Worker PBK"
            />
          </Field>

          <div className="grid sm:grid-cols-3 gap-3">
            <Field label="Level">
              <Input value={form.level} onChange={(e) => patchForm({ level: e.target.value })} />
            </Field>
            <Field label="Lokasi">
              <Input value={form.location} onChange={(e) => patchForm({ location: e.target.value })} />
            </Field>
            <Field label="Tipe">
              <Input
                value={form.employmentType}
                onChange={(e) => patchForm({ employmentType: e.target.value })}
              />
            </Field>
          </div>

          <Field label="Ringkasan (panel HR)">
            <Textarea rows={2} value={form.summary} onChange={(e) => patchForm({ summary: e.target.value })} />
          </Field>

          <div className="flex gap-2 border-b border-border pb-2">
            {(["standard", "official"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                className={cn(
                  "text-sm px-3 py-1.5 rounded-md transition-all admin-action-btn",
                  form.formMode === mode
                    ? "btn-figma border-0"
                    : "text-muted-foreground hover:bg-muted"
                )}
                onClick={() => patchForm({ formMode: mode })}
              >
                {mode === "standard" ? "Format Standar" : "Dokumen Resmi U&KJ"}
              </button>
            ))}
          </div>

          {form.formMode === "standard" ? (
            <>
              <Field label="Tanggung jawab (satu per baris)">
                <Textarea
                  rows={4}
                  value={form.responsibilitiesText}
                  onChange={(e) => patchForm({ responsibilitiesText: e.target.value })}
                />
              </Field>
              <Field label="Persyaratan (satu per baris)">
                <Textarea
                  rows={4}
                  value={form.requirementsText}
                  onChange={(e) => patchForm({ requirementsText: e.target.value })}
                />
              </Field>
              <Field label="Nice to have (satu per baris)">
                <Textarea
                  rows={2}
                  value={form.niceToHaveText}
                  onChange={(e) => patchForm({ niceToHaveText: e.target.value })}
                />
              </Field>
            </>
          ) : (
            <Field label="Isi dokumen URAIAN & KUALIFIKASI JABATAN">
              <Textarea
                rows={16}
                className="font-mono text-xs"
                value={form.officialBody}
                onChange={(e) => patchForm({ officialBody: e.target.value })}
              />
            </Field>
          )}

          <Field label="Dokumen lengkap (fullText — dipakai AI/RAG)">
            <Textarea
              rows={6}
              className="font-mono text-xs"
              value={form.fullText}
              onChange={(e) => patchForm({ fullText: e.target.value })}
            />
          </Field>
          <Button type="button" variant="outline" size="sm" onClick={rebuildFullText} className="admin-action-btn">
            Generate ulang fullText dari form
          </Button>

          {formError && (
            <div className="text-sm text-red-500 border border-red-500/30 bg-red-500/10 rounded-md px-3 py-2">
              {formError}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setEditorOpen(false)} className="admin-action-btn">
              Batal
            </Button>
            <Button onClick={save} disabled={saving} className="admin-action-btn btn-figma border-0">
              {saving ? "Menyimpan..." : "Simpan"}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Delete dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        title="Hapus kriteria?"
        className="max-w-md"
      >
        {deleteTarget && (
          <>
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 mb-4">
              <p className="font-medium text-sm">{deleteTarget.title}</p>
              <p className="text-xs text-muted-foreground mt-1 font-mono">{deleteTarget.id}</p>
              <p className="text-xs text-muted-foreground mt-2">{deleteTarget.department}</p>
            </div>
            <p className="text-sm text-muted-foreground">
              JD ini akan dihapus permanen dari knowledge base dan tidak lagi muncul di panel HR.
            </p>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setDeleteTarget(null)} className="admin-action-btn">
                Batal
              </Button>
              <Button
                variant="destructive"
                disabled={saving}
                onClick={() => remove(deleteTarget)}
                className="admin-action-btn gap-2"
              >
                <Trash2 className="h-4 w-4" />
                {saving ? "Menghapus..." : "Hapus permanen"}
              </Button>
            </div>
          </>
        )}
      </Dialog>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  gradient,
}: {
  icon: typeof Briefcase;
  label: string;
  value: number;
  gradient: string;
}) {
  return (
    <Card
      className="border-0 p-4 py-5 flex items-center gap-4 text-white relative overflow-hidden rounded-2xl shadow-md transition-all duration-300 hover:scale-102 hover:shadow-lg"
      style={{ background: gradient }}
    >
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent pointer-events-none" />
      <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div>
        <p className="text-2xl font-extrabold leading-none">{value}</p>
        <p className="text-xs text-white/80 mt-1.5 font-medium">{label}</p>
      </div>
    </Card>
  );
}

function JdCard({
  item,
  expanded,
  onToggle,
  onEdit,
  onDelete,
  highlight,
}: {
  item: PartnerJobCriteria;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  highlight: string;
}) {
  const isOfficial = item.fullText.includes("URAIAN & KUALIFIKASI JABATAN");

  return (
    <Card
      className={cn(
        "admin-jd-card overflow-hidden border py-0 gap-0",
        expanded && "admin-jd-card-expanded"
      )}
    >
      <div className="flex">
        <div className="w-1 shrink-0 bg-gradient-to-b from-[#6fb7ff] to-[#1d45f3]" aria-hidden />
        <div className="flex-1 p-4 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-start gap-3">
            <button
              type="button"
              onClick={onToggle}
              className="flex-1 min-w-0 text-left group"
            >
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h3 className="font-semibold group-hover:text-primary transition-colors">
                  <HighlightText text={item.title} query={highlight} />
                </h3>
                <Badge variant="outline">{item.department}</Badge>
                <Badge variant="outline" className="text-[10px]">
                  {item.level}
                </Badge>
                {isOfficial && (
                  <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-[10px]">
                    U&KJ Resmi
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground font-mono">{item.id}</p>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {item.location}
                </span>
                <span>{item.employmentType}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                <HighlightText text={item.summary} query={highlight} />
              </p>
              <span className="inline-flex items-center gap-1 text-xs text-primary mt-2 opacity-80 group-hover:opacity-100">
                {expanded ? (
                  <>
                    <ChevronUp className="h-3.5 w-3.5" /> Sembunyikan detail
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3.5 w-3.5" /> Lihat detail
                  </>
                )}
              </span>
            </button>

            <div className="flex gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={onEdit}
                className="admin-action-btn gap-1.5 hover:border-[#6fb7ff]/50 hover:bg-[#6fb7ff]/10"
              >
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onDelete}
                className="admin-action-btn text-destructive hover:text-destructive hover:border-destructive/40 hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {expanded && (
            <div className="mt-4 pt-4 border-t border-border space-y-3 admin-toast-enter">
              <DetailSection title="Persyaratan utama" items={item.requirements} />
              <DetailSection title="Tanggung jawab" items={item.responsibilities} />
              {item.niceToHave.length > 0 && (
                <DetailSection title="Nice to have" items={item.niceToHave} muted />
              )}
              <p className="text-[11px] text-muted-foreground">
                {item.fullText.length.toLocaleString("id-ID")} karakter dokumen lengkap (RAG)
              </p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function DetailSection({
  title,
  items,
  muted,
}: {
  title: string;
  items: string[];
  muted?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">{title}</p>
      <ul className={cn("text-sm space-y-0.5 list-disc list-inside", muted && "text-muted-foreground")}>
        {items.slice(0, 5).map((r) => (
          <li key={r}>{r}</li>
        ))}
        {items.length > 5 && (
          <li className="list-none text-xs text-muted-foreground">+{items.length - 5} lainnya...</li>
        )}
      </ul>
    </div>
  );
}

function HighlightText({ text, query }: { text: string; query: string }) {
  const q = query.trim().toLowerCase();
  if (!q || !text.toLowerCase().includes(q)) return <>{text}</>;

  const idx = text.toLowerCase().indexOf(q);
  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + q.length);
  const after = text.slice(idx + q.length);

  return (
    <>
      {before}
      <mark className="bg-[#6fb7ff]/30 text-foreground rounded px-0.5">{match}</mark>
      {after}
    </>
  );
}

function EmptyState({
  hasCriteria,
  onClear,
  onAdd,
}: {
  hasCriteria: boolean;
  onClear: () => void;
  onAdd: () => void;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card/30 py-16 px-6 text-center">
      <FileText className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
      <p className="font-medium">
        {hasCriteria ? "Tidak ada posisi yang cocok dengan filter" : "Belum ada JD & kriteria"}
      </p>
      <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
        {hasCriteria
          ? "Coba ubah kata kunci pencarian atau pilih departemen lain."
          : "Mulai dengan menambahkan job description pertama untuk PT Sosro Gunung Slamet."}
      </p>
      <div className="flex justify-center gap-2 mt-6">
        {hasCriteria ? (
          <Button variant="outline" onClick={onClear} className="admin-action-btn">
            Reset filter
          </Button>
        ) : null}
        <Button onClick={onAdd} className="admin-action-btn gap-2 btn-figma border-0">
          <Plus className="h-4 w-4" />
          Tambah JD
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="text-xs font-medium text-muted-foreground mb-1 block">{label}</label>
      {children}
    </div>
  );
}
