"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import {
  Briefcase,
  Download,
  Eye,
  FileText,
  Grid3X3,
  List,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useDocuments } from "@/components/documents-context";
import FileUploadButton from "@/components/file-upload-button";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/components/language-provider";

type FilterType = "all" | "CV" | "JD";
type ViewMode = "table" | "grid";

function isCvDoc(name: string) {
  const n = name.toLowerCase();
  return n.includes("cv") || n.includes("resume") || n.includes("curriculum");
}

function isJdDoc(name: string) {
  const n = name.toLowerCase();
  return (
    n.includes("jd") ||
    n.includes("job") ||
    n.includes("description") ||
    n.includes("requirement") ||
    n.includes("kriteria")
  );
}

function matchFilter(doc: { name: string }, filter: FilterType) {
  if (filter === "all") return true;
  if (filter === "CV") return isCvDoc(doc.name);
  return isJdDoc(doc.name);
}

export function DocumentsManager() {
  const { documents, removeDocument, addFromFiles } = useDocuments();
  const { t } = useLanguage();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [selectedDoc, setSelectedDoc] = useState<(typeof documents)[0] | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  const stats = useMemo(
    () => ({
      total: documents.length,
      cv: documents.filter((d) => isCvDoc(d.name)).length,
      jd: documents.filter((d) => isJdDoc(d.name)).length,
      processed: documents.filter((d) => d.status === "Processed").length,
    }),
    [documents]
  );

  const filteredDocuments = useMemo(() => {
    let filtered = documents.filter((d) => matchFilter(d, filterType));
    const q = searchQuery.trim().toLowerCase();
    if (q) filtered = filtered.filter((d) => d.name.toLowerCase().includes(q));
    return filtered;
  }, [documents, searchQuery, filterType]);

  const downloadFile = (file?: File) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleViewDetail = (doc: (typeof documents)[0]) => {
    setSelectedDoc(doc);
    setShowDetailDialog(true);
  };

  const filters: { id: FilterType; label: string; count: number }[] = [
    { id: "all", label: t("documents.filterAll"), count: documents.length },
    { id: "CV", label: t("documents.filterCV"), count: stats.cv },
    { id: "JD", label: t("documents.filterJD"), count: stats.jd },
  ];

  return (
    <main className="flex-1 overflow-auto hr-page-bg">
      <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 hr-fade-in">
          <div>
            <div className="flex items-center gap-2 text-primary mb-1">
              <FileText className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">HR Workspace</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-semibold">{t("documents.manage")}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Upload, preview, dan kelola CV serta dokumen rekrutmen.
            </p>
          </div>
          <FileUploadButton
            onSelectFiles={addFromFiles}
            label="Upload Document"
            variant="default"
            size="sm"
            className="gap-2 btn-figma border-0 admin-action-btn shrink-0"
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <MiniStat icon={FileText} label="Total" value={stats.total} />
          <MiniStat icon={Briefcase} label="CV" value={stats.cv} />
          <MiniStat icon={Upload} label="Diproses" value={stats.processed} />
        </div>

        {/* Toolbar */}
        <Card className="bg-card/60 glass border backdrop-blur-sm">
          <CardContent className="pt-5 space-y-3">
            <div className="flex flex-col lg:flex-row gap-3">
              <div className="relative flex-1 admin-search-focus rounded-lg border border-border bg-background transition-all">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  type="text"
                  placeholder={t("documents.search")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-9 border-0 bg-transparent focus-visible:ring-0"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label="Hapus pencarian"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1 p-1 rounded-lg border border-border bg-muted/20 shrink-0">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "p-2 rounded-md transition-all admin-action-btn",
                    viewMode === "grid" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
                  )}
                  title="Tampilan grid"
                >
                  <Grid3X3 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={cn(
                    "p-2 rounded-md transition-all admin-action-btn",
                    viewMode === "table" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
                  )}
                  title="Tampilan tabel"
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {filters.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilterType(f.id)}
                  className={cn(
                    "text-xs px-3 py-1.5 rounded-full border transition-all admin-action-btn inline-flex items-center gap-1.5",
                    filterType === f.id
                      ? "hr-filter-pill-active font-medium"
                      : "border-border text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  {f.label}
                  <span className="opacity-70">({f.count})</span>
                </button>
              ))}
              <span className="text-xs text-muted-foreground ml-auto">
                {filteredDocuments.length} dokumen ditampilkan
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Content */}
        {filteredDocuments.length === 0 ? (
          <EmptyDocuments
            hasDocs={documents.length > 0}
            onReset={() => {
              setSearchQuery("");
              setFilterType("all");
            }}
            onUpload={addFromFiles}
          />
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {filteredDocuments.map((doc) => (
              <DocGridCard
                key={doc.id}
                doc={doc}
                onView={() => handleViewDetail(doc)}
                onDownload={() => downloadFile(doc.file)}
                onDelete={() => removeDocument(doc.id)}
              />
            ))}
          </div>
        ) : (
          <Card className="bg-card/70 glass soft-shadow border overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/20">
                      <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Name
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Type
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Size
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Upload
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Status
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDocuments.map((doc) => (
                      <tr key={doc.id} className="hr-doc-row border-b border-border/50 hover:bg-muted/15">
                        <td className="py-3 px-4 text-sm font-medium max-w-[200px] truncate">{doc.name}</td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="text-[10px]">
                            {doc.type}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">{doc.size}</td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">{doc.uploadDate}</td>
                        <td className="py-3 px-4">
                          <StatusBadge status={doc.status} />
                        </td>
                        <td className="py-3 px-4">
                          <DocActions
                            onView={() => handleViewDetail(doc)}
                            onDownload={() => downloadFile(doc.file)}
                            onDelete={() => removeDocument(doc.id)}
                            canDownload={!!doc.file}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Detail dialog */}
      <Dialog
        open={showDetailDialog}
        onOpenChange={setShowDetailDialog}
        title="Detail & Pratinjau Dokumen"
        className="max-w-5xl"
      >
        {selectedDoc && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 rounded-lg border border-border bg-muted/10 p-4">
              <MetaField label="Nama Dokumen" value={selectedDoc.name} />
              <MetaField label="Tipe File" value={selectedDoc.type} />
              <MetaField label="Ukuran" value={selectedDoc.size} />
              <MetaField label="Tanggal Upload" value={selectedDoc.uploadDate} />
              <div>
                <label className="text-xs font-medium text-muted-foreground">Status</label>
                <div className="mt-1">
                  <StatusBadge status={selectedDoc.status} />
                </div>
              </div>
              <MetaField label="ID" value={selectedDoc.id} mono />
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-2">Pratinjau Teks (Hasil Ekstraksi AI)</h3>
              {selectedDoc.parsedText ? (
                <>
                  <Textarea
                    value={selectedDoc.parsedText}
                    readOnly
                    className="min-h-[320px] font-mono text-xs bg-muted/30 resize-none"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    {selectedDoc.parsedText.length.toLocaleString("id-ID")} karakter
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground p-4 rounded-lg border border-dashed">
                  {selectedDoc.status === "Processing"
                    ? "Dokumen sedang diproses..."
                    : "Pratinjau teks tidak tersedia."}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button variant="outline" onClick={() => setShowDetailDialog(false)} className="admin-action-btn">
                Tutup
              </Button>
              <Button
                onClick={() => selectedDoc.file && downloadFile(selectedDoc.file)}
                disabled={!selectedDoc.file}
                className="btn-figma border-0 admin-action-btn gap-2"
              >
                <Download className="h-4 w-4" />
                Download
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </main>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof FileText;
  label: string;
  value: number;
}) {
  return (
    <Card className="hr-stat-card bg-card/70 glass border py-3 gap-0">
      <CardContent className="p-3 flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="text-xl font-bold leading-none">{value}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function DocGridCard({
  doc,
  onView,
  onDownload,
  onDelete,
}: {
  doc: {
    id: string;
    name: string;
    type: string;
    size: string;
    uploadDate: string;
    status: "Processing" | "Processed";
    file?: File;
  };
  onView: () => void;
  onDownload: () => void;
  onDelete: () => void;
}) {
  const cv = isCvDoc(doc.name);

  return (
    <Card className="hr-doc-card bg-card/70 glass border group overflow-hidden py-0 gap-0">
      <div className="flex h-full">
        <div
          className={cn(
            "w-1 shrink-0",
            cv ? "bg-gradient-to-b from-emerald-400 to-emerald-600" : "bg-gradient-to-b from-[#6fb7ff] to-[#1d45f3]"
          )}
        />
        <CardContent className="p-4 flex flex-col flex-1 min-w-0">
          <div className="flex items-start gap-3 mb-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm truncate" title={doc.name}>
                {doc.name}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {doc.uploadDate} · {doc.size}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 mb-4">
            <Badge variant="outline" className="text-[10px]">
              {doc.type}
            </Badge>
            {cv && (
              <Badge className="text-[10px] bg-emerald-500/15 text-emerald-600 border-emerald-500/30">CV</Badge>
            )}
            <StatusBadge status={doc.status} />
          </div>
          <DocActions
            onView={onView}
            onDownload={onDownload}
            onDelete={onDelete}
            canDownload={!!doc.file}
            className="mt-auto"
          />
        </CardContent>
      </div>
    </Card>
  );
}

function DocActions({
  onView,
  onDownload,
  onDelete,
  canDownload,
  className,
}: {
  onView: () => void;
  onDownload: () => void;
  onDelete: () => void;
  canDownload: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex gap-1", className)}>
      <Button
        variant="outline"
        size="sm"
        className="flex-1 admin-action-btn gap-1 text-xs h-8 hover:border-[#6fb7ff]/40 hover:bg-[#6fb7ff]/10"
        onClick={onView}
      >
        <Eye className="h-3.5 w-3.5" />
        Detail
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="admin-action-btn h-8 w-8 p-0 hover:border-blue-500/40 hover:bg-blue-500/10"
        onClick={onDownload}
        disabled={!canDownload}
        title="Download"
      >
        <Download className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="admin-action-btn h-8 w-8 p-0 text-destructive hover:border-destructive/40 hover:bg-destructive/10"
        onClick={onDelete}
        title="Hapus"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function StatusBadge({ status }: { status: "Processing" | "Processed" }) {
  return (
    <Badge
      variant={status === "Processed" ? "default" : "secondary"}
      className={cn("text-[10px]", status === "Processed" && "btn-gradient border-0")}
    >
      {status}
    </Badge>
  );
}

function MetaField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <p className={cn("text-sm mt-0.5 break-all", mono && "font-mono text-xs")}>{value}</p>
    </div>
  );
}

function EmptyDocuments({
  hasDocs,
  onReset,
  onUpload,
}: {
  hasDocs: boolean;
  onReset: () => void;
  onUpload: (files: File[]) => Promise<void>;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card/30 py-16 px-6 text-center">
      <Upload className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
      <p className="font-medium">
        {hasDocs ? "Tidak ada dokumen sesuai filter" : "Belum ada dokumen diunggah"}
      </p>
      <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
        {hasDocs
          ? "Coba ubah kata kunci atau reset filter pencarian."
          : "Upload CV kandidat untuk memulai proses screening di AI Assistant."}
      </p>
      <div className="flex justify-center gap-2 mt-6 flex-wrap">
        {hasDocs && (
          <Button variant="outline" onClick={onReset} className="admin-action-btn">
            Reset filter
          </Button>
        )}
        <FileUploadButton
          onSelectFiles={onUpload}
          label="Upload Document"
          className="btn-figma border-0 admin-action-btn gap-2"
        />
        <Link href="/assistant-workspace">
          <Button variant="outline" className="admin-action-btn gap-2">
            Buka AI Assistant
          </Button>
        </Link>
      </div>
    </div>
  );
}
