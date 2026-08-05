"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import {
  Briefcase,
  ChevronDown,
  ChevronUp,
  Download,
  Eye,
  File,
  FileImage,
  FileSpreadsheet,
  FileText,
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

// ─── Types ───────────────────────────────────────────────────────────────────

type FilterType = "all" | "CV" | "JD";

type DocItem = {
  id: string;
  name: string;
  type: string;
  size: string;
  uploadDate: string;
  status: "Processing" | "Processed";
  file?: File;
  parsedText?: string;
};

type FileTypeConfig = {
  key: string;
  label: string;
  extensions: string[];
  Icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  iconBg: string;
  iconColor: string;
  borderActive: string;
};

// ─── File type definitions ────────────────────────────────────────────────────

const FILE_TYPE_CONFIGS: FileTypeConfig[] = [
  {
    key: "pdf",
    label: "PDF",
    extensions: ["pdf"],
    Icon: FileText,
    gradient: "from-rose-400 to-red-600",
    iconBg: "bg-rose-500/15",
    iconColor: "text-rose-500",
    borderActive: "border-rose-500/40",
  },
  {
    key: "word",
    label: "Word",
    extensions: ["doc", "docx"],
    Icon: FileText,
    gradient: "from-blue-400 to-blue-700",
    iconBg: "bg-blue-500/15",
    iconColor: "text-blue-500",
    borderActive: "border-blue-500/40",
  },
  {
    key: "excel",
    label: "Excel",
    extensions: ["xls", "xlsx", "csv"],
    Icon: FileSpreadsheet,
    gradient: "from-sky-400 to-blue-600",
    iconBg: "bg-sky-500/15",
    iconColor: "text-sky-500",
    borderActive: "border-sky-500/40",
  },
  {
    key: "image",
    label: "Gambar",
    extensions: ["jpg", "jpeg", "png", "gif", "webp", "svg"],
    Icon: FileImage,
    gradient: "from-purple-400 to-violet-600",
    iconBg: "bg-purple-500/15",
    iconColor: "text-purple-500",
    borderActive: "border-purple-500/40",
  },
  {
    key: "other",
    label: "Lainnya",
    extensions: [],
    Icon: File,
    gradient: "from-slate-400 to-slate-600",
    iconBg: "bg-slate-500/15",
    iconColor: "text-slate-400",
    borderActive: "border-slate-500/40",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getFileExtension(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

function getFileTypeConfig(name: string): FileTypeConfig {
  const ext = getFileExtension(name);
  const known = FILE_TYPE_CONFIGS.slice(0, -1).find((c) =>
    c.extensions.includes(ext)
  );
  return known ?? FILE_TYPE_CONFIGS[FILE_TYPE_CONFIGS.length - 1];
}

function isCvDoc(name: string) {
  return !isJdDoc(name);
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

// ─── Main Component ───────────────────────────────────────────────────────────

export function DocumentsManager() {
  const { documents, removeDocument, addFromFiles } = useDocuments();
  const { t } = useLanguage();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [activeTypeKey, setActiveTypeKey] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<DocItem | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  // Stats
  const stats = useMemo(
    () => ({
      total: documents.length,
      cv: documents.filter((d) => isCvDoc(d.name)).length,
      jd: documents.filter((d) => isJdDoc(d.name)).length,
      processed: documents.filter((d) => d.status === "Processed").length,
    }),
    [documents]
  );

  // Filter by CV/JD first
  const baseFiltered = useMemo(
    () => documents.filter((d) => matchFilter(d, filterType)),
    [documents, filterType]
  );

  // Group by file type (only groups with docs)
  const typeGroups = useMemo(() => {
    return FILE_TYPE_CONFIGS.map((config) => {
      const isOther = config.key === "other";
      const knownExtensions = FILE_TYPE_CONFIGS.slice(0, -1).flatMap(
        (c) => c.extensions
      );
      const docs = baseFiltered.filter((d) => {
        const ext = getFileExtension(d.name);
        return isOther
          ? !knownExtensions.includes(ext)
          : config.extensions.includes(ext);
      });
      return { ...config, docs };
    }).filter((g) => g.docs.length > 0);
  }, [baseFiltered]);

  // Docs in active type, filtered by search
  const activeTypeDocs = useMemo(() => {
    if (!activeTypeKey) return [];
    const group = typeGroups.find((g) => g.key === activeTypeKey);
    if (!group) return [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return group.docs;
    return group.docs.filter((d) => d.name.toLowerCase().includes(q));
  }, [typeGroups, activeTypeKey, searchQuery]);

  // Auto-close accordion if active type no longer exists after filter change
  useEffect(() => {
    if (activeTypeKey && !typeGroups.find((g) => g.key === activeTypeKey)) {
      setActiveTypeKey(null);
    }
  }, [typeGroups, activeTypeKey]);

  const downloadFile = (file?: File) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleViewDetail = (doc: DocItem) => {
    setSelectedDoc(doc);
    setShowDetailDialog(true);
  };

  const filters: { id: FilterType; label: string; count: number }[] = [
    { id: "all", label: t("documents.filterAll"), count: documents.length },
    { id: "CV", label: t("documents.filterCV"), count: stats.cv },
    { id: "JD", label: t("documents.filterJD"), count: stats.jd },
  ];

  const activeTypeConfig = typeGroups.find((g) => g.key === activeTypeKey);

  return (
    <main className="flex-1 overflow-auto bg-slate-50/50">
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 hr-fade-in">
          <div>
            <div className="flex items-center gap-2 text-primary mb-1">
              <FileText className="h-4 w-4 text-[#0ea5e9]" />
              <span className="text-xs font-semibold uppercase tracking-wider text-[#0d9488]">
                HR Workspace
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight">
              {t("documents.manage")}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Upload, preview, dan kelola CV serta dokumen rekrutmen.
            </p>
          </div>
          <FileUploadButton
            onSelectFiles={addFromFiles}
            label="Upload Document"
            variant="default"
            size="sm"
            className="gap-2 bg-gradient-to-r from-[#0ea5e9] to-[#0d9488] hover:scale-102 hover:shadow-md hover:shadow-[#0ea5e9]/10 text-white rounded-full font-semibold border-0 shrink-0 shadow-sm"
          />
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-3 gap-3">
          <MiniStat
            icon={FileText}
            label="Total"
            value={stats.total}
            gradient="linear-gradient(135deg, #ff7eb3 0%, #ff758c 100%)"
          />
          <MiniStat
            icon={Briefcase}
            label="CV"
            value={stats.cv}
            gradient="linear-gradient(135deg, #70a1ff 0%, #5352ed 100%)"
          />
          <MiniStat
            icon={Upload}
            label="Diproses"
            value={stats.processed}
            gradient="linear-gradient(135deg, #ffb347 0%, #ffcc33 100%)"
          />
        </div>

        {/* ── Toolbar ── */}
        <Card className="bg-white border border-slate-200 shadow-sm">
          <CardContent className="pt-5 space-y-3">
            <div className="relative admin-search-focus rounded-lg border border-slate-300 bg-white transition-all shadow-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
              <Input
                type="text"
                placeholder={t("documents.search")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-9 border-0 bg-transparent focus-visible:ring-0 text-slate-800 font-semibold placeholder:text-slate-600"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-900"
                  aria-label="Hapus pencarian"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {filters.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilterType(f.id)}
                  className={cn(
                    "text-xs px-3.5 py-1.5 rounded-full border transition-all inline-flex items-center gap-1.5 shadow-sm font-bold",
                    filterType === f.id
                      ? "bg-slate-900 border-slate-900 text-white"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-400"
                  )}
                >
                  {f.label}
                  <span className="opacity-90">({f.count})</span>
                </button>
              ))}
              <span className="text-xs text-slate-700 font-bold ml-auto">
                {baseFiltered.length} dokumen ditampilkan
              </span>
            </div>
          </CardContent>
        </Card>

        {/* ── Content ── */}
        {documents.length === 0 ? (
          <EmptyDocuments
            hasDocs={false}
            onReset={() => {
              setSearchQuery("");
              setFilterType("all");
            }}
            onUpload={addFromFiles}
          />
        ) : baseFiltered.length === 0 ? (
          <EmptyDocuments
            hasDocs={true}
            onReset={() => {
              setSearchQuery("");
              setFilterType("all");
            }}
            onUpload={addFromFiles}
          />
        ) : (
          <div className="space-y-4">
            {/* Type Cards */}
            <div
              className={cn(
                "grid gap-3",
                typeGroups.length === 1
                  ? "grid-cols-1 max-w-xs"
                  : typeGroups.length === 2
                  ? "grid-cols-2 max-w-md"
                  : typeGroups.length === 3
                  ? "grid-cols-3"
                  : "grid-cols-2 sm:grid-cols-4"
              )}
            >
              {typeGroups.map((group) => (
                <TypeCard
                  key={group.key}
                  config={group}
                  count={group.docs.length}
                  isActive={activeTypeKey === group.key}
                  onClick={() =>
                    setActiveTypeKey(
                      activeTypeKey === group.key ? null : group.key
                    )
                  }
                />
              ))}
            </div>

            {/* Accordion Panel */}
            {activeTypeKey && activeTypeConfig && (
              <AccordionPanel
                config={activeTypeConfig}
                docs={activeTypeDocs}
                totalCount={activeTypeConfig.docs.length}
                onClose={() => setActiveTypeKey(null)}
                onView={handleViewDetail}
                onDownload={(doc) => downloadFile(doc.file)}
                onDelete={(doc) => removeDocument(doc.id)}
                searchQuery={searchQuery}
              />
            )}
          </div>
        )}
      </div>

      {/* ── Detail Dialog ── */}
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
                <label className="text-xs font-medium text-muted-foreground">
                  Status
                </label>
                <div className="mt-1">
                  <StatusBadge status={selectedDoc.status} />
                </div>
              </div>
              <MetaField label="ID" value={selectedDoc.id} mono />
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-2">
                Pratinjau Teks (Hasil Ekstraksi AI)
              </h3>
              {selectedDoc.parsedText ? (
                <>
                  <Textarea
                    value={selectedDoc.parsedText}
                    readOnly
                    className="min-h-[320px] font-mono text-xs bg-muted/30 resize-none"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    {selectedDoc.parsedText.length.toLocaleString("id-ID")}{" "}
                    karakter
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
              <Button
                variant="outline"
                onClick={() => setShowDetailDialog(false)}
                className="admin-action-btn"
              >
                Tutup
              </Button>
              <Button
                onClick={() =>
                  selectedDoc.file && downloadFile(selectedDoc.file)
                }
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

// ─── TypeCard ─────────────────────────────────────────────────────────────────

function TypeCard({
  config,
  count,
  isActive,
  onClick,
}: {
  config: FileTypeConfig;
  count: number;
  isActive: boolean;
  onClick: () => void;
}) {
  const { Icon, label, gradient, iconBg, iconColor, borderActive } = config;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative rounded-2xl border bg-white p-5 text-left transition-all duration-200 shadow-sm",
        "hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-primary/30",
        isActive
          ? cn("shadow-md -translate-y-0.5 border-slate-400", borderActive)
          : "border-slate-200 hover:border-slate-350"
      )}
      aria-pressed={isActive}
    >
      {/* Gradient accent bar */}
      <div
        className={cn(
          "absolute top-0 left-0 right-0 h-1.5 rounded-t-2xl bg-gradient-to-r transition-opacity",
          gradient,
          isActive ? "opacity-100" : "opacity-0 group-hover:opacity-70"
        )}
      />

      {/* Icon */}
      <div
        className={cn(
          "h-11 w-11 rounded-xl flex items-center justify-center mb-3 transition-transform group-hover:scale-105",
          iconBg
        )}
      >
        <Icon className={cn("h-5 w-5", iconColor)} />
      </div>

      {/* Label */}
      <p className="text-sm font-extrabold text-slate-800 leading-none mb-1.5">{label}</p>

      {/* Count */}
      <p className="text-xs text-slate-700 font-bold">
        {count} {count === 1 ? "file" : "file"}
      </p>

      {/* Active indicator */}
      {isActive && (
        <div className="absolute bottom-3 right-3">
          <ChevronUp className={cn("h-4 w-4", iconColor)} />
        </div>
      )}
      {!isActive && (
        <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-60 transition-opacity">
          <ChevronDown className="h-4 w-4 text-slate-500" />
        </div>
      )}
    </button>
  );
}

// ─── AccordionPanel ───────────────────────────────────────────────────────────

function AccordionPanel({
  config,
  docs,
  totalCount,
  onClose,
  onView,
  onDownload,
  onDelete,
  searchQuery,
}: {
  config: FileTypeConfig;
  docs: DocItem[];
  totalCount: number;
  onClose: () => void;
  onView: (doc: DocItem) => void;
  onDownload: (doc: DocItem) => void;
  onDelete: (doc: DocItem) => void;
  searchQuery: string;
}) {
  const { Icon, label, gradient, iconColor } = config;
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const handleDeleteAll = () => {
    // Delete all documents shown in the current list
    docs.forEach((doc) => onDelete(doc));
    setIsConfirmingDelete(false);
    onClose();
  };

  return (
    <div
      className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-md"
      style={{
        animation: "accordionDown 0.25s ease-out",
      }}
    >
      {/* Panel Header */}
      <div
        className={cn(
          "flex items-center justify-between px-5 py-4 bg-gradient-to-r border-b border-slate-200",
          "from-slate-50 to-transparent"
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "h-8 w-8 rounded-lg flex items-center justify-center",
              config.iconBg
            )}
          >
            <Icon className={cn("h-4 w-4", iconColor)} />
          </div>
          <div>
            <p className="font-extrabold text-sm text-slate-800 leading-none">{label}</p>
            <p className="text-xs text-slate-700 font-semibold mt-1">
              {docs.length === totalCount
                ? `${totalCount} dokumen`
                : `${docs.length} dari ${totalCount} dokumen`}
              {searchQuery && ` · filter: "${searchQuery}"`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {docs.length > 0 && (
            <>
              {isConfirmingDelete ? (
                <div className="flex items-center gap-1.5 animation-fade-in">
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-8 text-xs font-semibold px-3"
                    onClick={handleDeleteAll}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Yakin Hapus {docs.length} File?
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs font-medium px-2.5 text-foreground hover:bg-muted"
                    onClick={() => setIsConfirmingDelete(false)}
                  >
                    Batal
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20 hover:border-destructive/30 px-3 flex items-center gap-1.5 transition-all"
                  onClick={() => setIsConfirmingDelete(true)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Hapus Semua
                </Button>
              )}
            </>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
            aria-label="Tutup panel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Document List */}
      {docs.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          Tidak ada dokumen yang cocok dengan pencarian.
        </div>
      ) : (
        <div className="divide-y divide-border/50">
          {docs.map((doc, i) => (
            <DocListRow
              key={doc.id}
              doc={doc}
              index={i}
              config={getFileTypeConfig(doc.name)}
              onView={() => onView(doc)}
              onDownload={() => onDownload(doc)}
              onDelete={() => onDelete(doc)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── DocListRow ───────────────────────────────────────────────────────────────

function DocListRow({
  doc,
  index,
  config,
  onView,
  onDownload,
  onDelete,
}: {
  doc: DocItem;
  index: number;
  config: FileTypeConfig;
  onView: () => void;
  onDownload: () => void;
  onDelete: () => void;
}) {
  const { Icon, iconBg, iconColor } = config;
  const cv = isCvDoc(doc.name);

  return (
    <div
      className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/15 transition-colors group"
      style={{ animationDelay: `${index * 30}ms` }}
    >
      {/* Left accent */}
      <div
        className={cn(
          "w-0.5 h-8 rounded-full shrink-0",
          cv
            ? "bg-sky-400"
            : "bg-gradient-to-b from-[#6fb7ff] to-[#1d45f3]"
        )}
      />

      {/* File icon */}
      <div
        className={cn(
          "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
          iconBg
        )}
      >
        <Icon className={cn("h-4 w-4", iconColor)} />
      </div>

      {/* Name & Meta */}
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-extrabold text-slate-800 truncate leading-none mb-1.5"
          title={doc.name}
        >
          {doc.name}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-600 font-semibold">{doc.uploadDate}</span>
          <span className="text-slate-400 font-bold text-xs">·</span>
          <span className="text-xs text-slate-600 font-semibold">{doc.size}</span>
        </div>
      </div>

      {/* Badges */}
      <div className="hidden sm:flex items-center gap-1.5 shrink-0">
        <Badge variant="outline" className="text-[10px]">
          {doc.type}
        </Badge>
        {cv && (
          <Badge className="text-[10px] bg-sky-500/15 text-sky-600 border-sky-500/30">
            CV
          </Badge>
        )}
        <StatusBadge status={doc.status} />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0 opacity-90 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2.5 gap-1 text-xs admin-action-btn hover:bg-[#6fb7ff]/10 hover:text-[#6fb7ff]"
          onClick={onView}
        >
          <Eye className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Detail</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 admin-action-btn hover:bg-blue-500/10 hover:text-blue-500"
          onClick={onDownload}
          disabled={!doc.file}
          title="Download"
        >
          <Download className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 admin-action-btn text-destructive/60 hover:text-destructive hover:bg-destructive/10"
          onClick={onDelete}
          title="Hapus"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MiniStat({
  icon: Icon,
  label,
  value,
  gradient,
}: {
  icon: typeof FileText;
  label: string;
  value: number;
  gradient: string;
}) {
  return (
    <Card
      className="border-0 text-white relative overflow-hidden rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.01]"
      style={{
        background: gradient,
      }}
    >
      {/* Texture overlay */}
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent pointer-events-none" />

      <CardContent className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 h-full relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
            <Icon className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-xl md:text-2xl font-black tracking-tight leading-none text-white">{value}</p>
            <p className="text-[9px] text-white/80 font-black tracking-wider uppercase mt-1">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: "Processing" | "Processed" }) {
  return (
    <Badge
      variant={status === "Processed" ? "default" : "secondary"}
      className={cn(
        "text-[10px]",
        status === "Processed" && "btn-gradient border-0"
      )}
    >
      {status}
    </Badge>
  );
}

function MetaField({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <p className={cn("text-sm mt-0.5 break-all", mono && "font-mono text-xs")}>
        {value}
      </p>
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
        {hasDocs
          ? "Tidak ada dokumen sesuai filter"
          : "Belum ada dokumen diunggah"}
      </p>
      <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
        {hasDocs
          ? "Coba ubah kata kunci atau reset filter pencarian."
          : "Upload CV kandidat untuk memulai proses screening di AI Assistant."}
      </p>
      <div className="flex justify-center gap-2 mt-6 flex-wrap">
        {hasDocs && (
          <Button
            variant="outline"
            onClick={onReset}
            className="admin-action-btn"
          >
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
