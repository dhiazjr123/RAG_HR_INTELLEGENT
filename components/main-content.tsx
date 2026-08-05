"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import {
  ArrowRight,
  Bell,
  Bot,
  Briefcase,
  Clock,
  FileText,
  MessageSquare,
  Sparkles,
  Trash2,
  TrendingUp,
  Upload,
  Award,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  UserCheck,
  FileSearch,
  User,
  Mail,
  Phone,
  GraduationCap,
  Play,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Calendar,
  MapPin,
  ExternalLink,
  PieChart,
  Check,
  X,
  XCircle,
} from "lucide-react";
import { useDocuments } from "@/components/documents-context";
import { PARTNER_NAME, PARTNER_JD_CRITERIA } from "@/lib/partner-jd-criteria";
import { cn } from "@/lib/utils";

/* ========= Pipeline Status Types & Config ========= */
export type PipelineStatus =
  | "Menunggu Review"
  | "Rekomendasi Interview"
  | "Pertimbangkan Ulang"
  | "Tidak Lolos Berkas";

export function normalizeStatus(st?: string): PipelineStatus {
  if (!st || st === "Screening" || st === "Menunggu Review") return "Menunggu Review";
  if (st === "Interview" || st === "Hired" || st === "Rekomendasi Interview") return "Rekomendasi Interview";
  if (st === "Hold" || st === "Pertimbangkan Ulang") return "Pertimbangkan Ulang";
  if (st === "Ditolak" || st === "Tidak Lolos Berkas") return "Tidak Lolos Berkas";
  return "Menunggu Review";
}

export const PIPELINE_CONFIG: Record<
  PipelineStatus,
  { label: string; bg: string; text: string; border: string; dot: string }
> = {
  "Menunggu Review": { label: "Menunggu Review", bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-200", dot: "bg-slate-400" },
  "Rekomendasi Interview": { label: "Rekomendasi Interview", bg: "bg-emerald-50", text: "text-emerald-800", border: "border-emerald-200", dot: "bg-emerald-500" },
  "Pertimbangkan Ulang": { label: "Pertimbangkan Ulang", bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-200", dot: "bg-amber-500" },
  "Tidak Lolos Berkas": { label: "Tidak Lolos Berkas", bg: "bg-rose-50", text: "text-rose-800", border: "border-rose-200", dot: "bg-rose-500" },
};

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s} detik lalu`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} menit lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.floor(h / 24);
  return `${d} hari lalu`;
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

function isCvDoc(name: string) {
  return !isJdDoc(name);
}

/* ========= Helper Functions for WhatsApp ========= */
function formatPhoneForWA(phoneStr?: string): string | null {
  if (!phoneStr) return null;
  let cleaned = phoneStr.replace(/\D/g, "");
  if (cleaned.startsWith("0")) {
    cleaned = "62" + cleaned.slice(1);
  } else if (cleaned.startsWith("8")) {
    cleaned = "62" + cleaned;
  }
  return cleaned.length >= 10 ? cleaned : null;
}

function buildWAMessage(status: PipelineStatus, name: string, position: string): string {
  const company = "PT Sinar Sosro Gunung Slamet";
  if (status === "Rekomendasi Interview") {
    return `Yth. ${name},\n\nKami dari ${company} ingin menyampaikan bahwa Anda dinyatakan *LOLOS* pada tahap seleksi berkas untuk posisi *${position}*.\n\nSelamat! Anda akan segera dihubungi kembali mengenai jadwal wawancara.\n\nTerima kasih atas ketertarikan Anda bergabung bersama kami.\n\n_${company}_`;
  }
  if (status === "Pertimbangkan Ulang") {
    return `Yth. ${name},\n\nKami dari ${company} ingin menyampaikan bahwa berkas lamaran Anda untuk posisi *${position}* masih dalam tahap pertimbangan lebih lanjut.\n\nHarap menunggu informasi selanjutnya dari kami.\n\nTerima kasih atas kesabaran dan ketertarikan Anda.\n\n_${company}_`;
  }
  if (status === "Tidak Lolos Berkas") {
    return `Yth. ${name},\n\nKami dari ${company} mengucapkan terima kasih atas lamaran Anda untuk posisi *${position}*.\n\nSetelah melalui proses seleksi berkas, kami mohon maaf untuk menyampaikan bahwa Anda belum dapat melanjutkan ke tahap berikutnya pada kesempatan ini.\n\nKami mendoakan yang terbaik untuk perjalanan karir Anda ke depan.\n\n_${company}_`;
  }
  return "";
}

/* ========= Candidate Detail Modal Component ========= */
function CandidateDetailModal({
  candidate,
  open,
  onOpenChange,
  pipelineStatus,
  onUpdatePipeline,
  onDeleteCandidate,
}: {
  candidate: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pipelineStatus: PipelineStatus;
  onUpdatePipeline: (candId: string, status: PipelineStatus) => void;
  onDeleteCandidate: (candId: string) => void;
}) {
  if (!candidate) return null;

  const initials = (candidate.applicantName || "P")
    .split(/\s+/)
    .map((w: string) => w[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  const score = candidate.suitabilityScore ?? 50;
  const isEliminated = score < 50;
  const waPhone = formatPhoneForWA(candidate.profilePhone);

  useEffect(() => {
    if (isEliminated && pipelineStatus !== "Tidak Lolos Berkas") {
      onUpdatePipeline(candidate.id, "Tidak Lolos Berkas");
    }
  }, [isEliminated, candidate.id, pipelineStatus, onUpdatePipeline]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={`Detail Pelamar: ${candidate.applicantName}`}>
      <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
        {/* Banner Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-gradient-to-r from-sky-50 via-slate-50 to-teal-50/50 border border-sky-100 shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-sky-500 to-teal-600 text-white font-black text-lg flex items-center justify-center shadow-md shadow-sky-500/20 shrink-0">
              {initials}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-800">{candidate.applicantName}</h2>
                {candidate.profileGender && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] font-bold px-1.5 py-0.2",
                      candidate.profileGender === "Laki-laki"
                        ? "bg-sky-50 text-sky-700 border-sky-200"
                        : "bg-rose-50 text-rose-700 border-rose-200"
                    )}
                  >
                    {candidate.profileGender}
                  </Badge>
                )}
              </div>
              <p className="text-xs font-semibold text-sky-700 mt-0.5 flex items-center gap-1">
                <Briefcase className="h-3.5 w-3.5" />
                {candidate.jdTitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-center">
            <div className="text-right">
              <span className="text-[9px] uppercase font-extrabold text-slate-400 block tracking-wider">Skor Kesesuaian</span>
              <Badge
                className={cn(
                  "text-xs font-black px-2.5 py-1 mt-0.5",
                  score >= 80
                    ? "bg-teal-500 text-white"
                    : score >= 65
                    ? "bg-sky-500 text-white"
                    : score >= 50
                    ? "bg-amber-500 text-white"
                    : "bg-rose-500 text-white"
                )}
              >
                {score}% {score >= 80 ? "Sangat Sesuai" : score >= 65 ? "Sesuai" : score >= 50 ? "Cukup Sesuai" : "Tereliminasi"}
              </Badge>
            </div>
          </div>
        </div>

        {/* Status Pipeline Selector */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2 shadow-sm">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 text-sky-600" />
            Status Rekomendasi Screening CV
          </label>
          {isEliminated ? (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-rose-600 shrink-0" />
                <div>
                  <span className="text-xs font-black text-rose-800 uppercase tracking-wider block">Tidak Lolos Berkas</span>
                  <span className="text-[11px] text-rose-600 font-medium">Pelamar tereliminasi (skor &lt; 50%). Status otomatis terkunci.</span>
                </div>
              </div>
              <Badge className="bg-rose-600 text-white text-[10px] font-bold shrink-0">Status Terkunci</Badge>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 pt-1">
              {(
                [
                  "Menunggu Review",
                  "Rekomendasi Interview",
                  "Pertimbangkan Ulang",
                  "Tidak Lolos Berkas",
                ] as PipelineStatus[]
              ).map((st) => {
                const cfg = PIPELINE_CONFIG[st];
                const isSelected = pipelineStatus === st;
                return (
                  <Button
                    key={st}
                    type="button"
                    size="sm"
                    variant={isSelected ? "default" : "outline"}
                    onClick={() => onUpdatePipeline(candidate.id, st)}
                    className={cn(
                      "text-xs font-bold gap-1.5 transition-all duration-200 rounded-lg h-8",
                      isSelected
                        ? `${cfg.bg} ${cfg.text} ${cfg.border} border-2 shadow-sm font-black scale-105`
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <span className={cn("h-2 w-2 rounded-full", cfg.dot)} />
                    {st}
                    {isSelected && <Check className="h-3.5 w-3.5 ml-0.5" />}
                  </Button>
                );
              })}
            </div>
          )}
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Kontak & Biografi */}
          <div className="p-4 border border-slate-100 rounded-xl bg-slate-50/50 space-y-3">
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
              <User className="h-4 w-4 text-sky-600" />
              Kontak & Data Diri
            </h3>
            <div className="space-y-2 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span className="font-semibold text-slate-700">{candidate.profileEmail || "-"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span className="font-semibold text-slate-700">{candidate.profilePhone || "-"}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span>
                  Lahir: <strong className="text-slate-700">{candidate.profileBirthPlace || "-"}</strong>
                  {candidate.profileBirthDate
                    ? `, ${new Date(candidate.profileBirthDate).toLocaleDateString("id-ID")}`
                    : ""}
                </span>
              </div>
            </div>
          </div>

          {/* Pendidikan */}
          <div className="p-4 border border-slate-100 rounded-xl bg-slate-50/50 space-y-3">
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
              <GraduationCap className="h-4 w-4 text-purple-600" />
              Latar Belakang Pendidikan
            </h3>
            <div className="space-y-1.5 text-xs text-slate-600">
              <p className="font-extrabold text-slate-800 text-sm">{candidate.profileEducation || "-"}</p>
              <p className="text-slate-500 font-medium">Jurusan: {candidate.profileMajor || "-"}</p>
              {candidate.profileSchool && (
                <p className="text-slate-400 text-[11px]">Institusi: {candidate.profileSchool}</p>
              )}
            </div>
          </div>
        </div>

        {/* AI Screening Reasoning */}
        <div className="p-4 bg-sky-50/60 border border-sky-100 rounded-xl space-y-2">
          <h3 className="text-xs font-black text-sky-900 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-sky-600" />
            Analisis Rekomendasi AI
          </h3>
          <p className="text-xs text-slate-700 leading-relaxed font-medium">
            {candidate.alasanLolos || "Pelamar memenuhi syarat kualifikasi dasar dan kriteria khusus yang ditentukan."}
          </p>
        </div>

        {/* Action Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              if (window.confirm(`Hapus berkas pelamar ${candidate.applicantName}?`)) {
                onDeleteCandidate(candidate.id);
                onOpenChange(false);
              }
            }}
            className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 gap-1.5"
          >
            <Trash2 className="h-4 w-4" />
            Hapus Berkas
          </Button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs rounded-xl flex-1 sm:flex-none"
            >
              Tutup
            </Button>
            {waPhone && pipelineStatus !== "Menunggu Review" && (
              <a
                href={`https://wa.me/${waPhone}?text=${encodeURIComponent(
                  buildWAMessage(pipelineStatus, candidate.applicantName, candidate.jdTitle)
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 sm:flex-none"
              >
                <Button
                  type="button"
                  size="sm"
                  className="w-full text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-1.5 shadow-md border-0"
                >
                  <MessageSquare className="h-4 w-4" />
                  Kirim Info via WA
                </Button>
              </a>
            )}
            <Link
              href={`/assistant-workspace?q=${encodeURIComponent(
                `Berikan analisis kecocokan mendalam untuk pelamar ${candidate.applicantName} di posisi ${candidate.jdTitle}`
              )}`}
              className="flex-1 sm:flex-none"
            >
              <Button
                type="button"
                size="sm"
                className="w-full text-xs font-bold btn-figma border-0 text-white rounded-xl gap-1.5 shadow-md"
              >
                <Bot className="h-4 w-4" />
                Tanya AI Assistant
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </Dialog>
  );
}

/* ========= Score Distribution Donut Chart ========= */
function ScoreDistributionDonut({
  list,
  onSelectTier,
  selectedTier,
}: {
  list: any[];
  onSelectTier: (tier: string | null) => void;
  selectedTier: string | null;
}) {
  const total = list.length;
  const counts = useMemo(() => {
    let sangatsesuai = 0;
    let sesuai = 0;
    let cukup = 0;
    let kurang = 0;
    list.forEach((c) => {
      const s = c.suitabilityScore ?? 50;
      if (s >= 80) sangatsesuai++;
      else if (s >= 65) sesuai++;
      else if (s >= 50) cukup++;
      else kurang++;
    });
    return { sangatsesuai, sesuai, cukup, kurang };
  }, [list]);

  if (total === 0) return null;

  const pctSangat = Math.round((counts.sangatsesuai / total) * 100);
  const pctSesuai = Math.round((counts.sesuai / total) * 100);
  const pctCukup = Math.round((counts.cukup / total) * 100);
  const pctKurang = Math.max(0, 100 - pctSangat - pctSesuai - pctCukup);

  // Conic gradient stops
  const stop1 = pctSangat;
  const stop2 = stop1 + pctSesuai;
  const stop3 = stop2 + pctCukup;

  const conicStyle = {
    background: `conic-gradient(#0d9488 0% ${stop1}%, #0ea5e9 ${stop1}% ${stop2}%, #f59e0b ${stop2}% ${stop3}%, #f43f5e ${stop3}% 100%)`,
  };

  const legend = [
    { key: "sangatsesuai", label: "Sangat Sesuai (≥80%)", count: counts.sangatsesuai, color: "bg-[#0d9488]" },
    { key: "sesuai", label: "Sesuai (65-79%)", count: counts.sesuai, color: "bg-[#0ea5e9]" },
    { key: "cukup", label: "Cukup Sesuai (50-64%)", count: counts.cukup, color: "bg-[#f59e0b]" },
    { key: "kurang", label: "Tereliminasi (<50%)", count: counts.kurang, color: "bg-[#f43f5e]" },
  ];

  return (
    <div className="flex flex-col sm:flex-row items-center gap-5 p-3 bg-slate-50/50 rounded-xl border border-slate-100">
      {/* Donut Circle */}
      <div className="relative shrink-0 flex items-center justify-center">
        <div className="h-28 w-28 rounded-full shadow-inner transition-transform duration-300 hover:scale-105" style={conicStyle} />
        <div className="absolute h-16 w-16 bg-white rounded-full flex flex-col items-center justify-center shadow-md">
          <span className="text-lg font-black text-slate-800 leading-none">{total}</span>
          <span className="text-[8px] uppercase font-extrabold text-slate-400">Pelamar</span>
        </div>
      </div>

      {/* Legend & Filter */}
      <div className="flex-1 space-y-1.5 w-full">
        <div className="flex justify-between items-center text-[10px] uppercase font-extrabold text-slate-400 mb-1">
          <span>Distribusi Skor AI</span>
          {selectedTier && (
            <button
              onClick={() => onSelectTier(null)}
              className="text-sky-600 hover:underline text-[9px] font-bold"
            >
              Reset Filter
            </button>
          )}
        </div>
        {legend.map((item) => {
          const isSelected = selectedTier === item.key;
          const pct = Math.round((item.count / total) * 100);
          return (
            <div
              key={item.key}
              onClick={() => onSelectTier(isSelected ? null : item.key)}
              className={cn(
                "flex items-center justify-between text-xs p-1.5 rounded-lg cursor-pointer transition-all duration-150",
                isSelected
                  ? "bg-white shadow-sm border border-slate-200 font-bold scale-102"
                  : "hover:bg-white/80"
              )}
            >
              <div className="flex items-center gap-2">
                <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", item.color)} />
                <span className="text-slate-700 font-medium text-[11px]">{item.label}</span>
              </div>
              <span className="text-[11px] font-black text-slate-800">
                {item.count} <span className="text-slate-400 font-normal">({pct}%)</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ================== Overview Ranking Panel ================== */
function OverviewRankingPanel() {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"tech" | "worker">("tech");

  // Pipeline Status Map from localStorage
  const [pipelineMap, setPipelineMap] = useState<Record<string, PipelineStatus>>({});
  const [selectedCandidate, setSelectedCandidate] = useState<any | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Sorting & Filtering
  const [filterPipeline, setFilterPipeline] = useState<string>("all");
  const [tierFilter, setTierFilter] = useState<string | null>(null);
  const [sortField, setSortField] = useState<"score" | "name" | "education" | "status">("score");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Admin Criteria Approval State
  const [allCriteria, setAllCriteria] = useState<any[]>([]);
  const [pendingReasonMap, setPendingReasonMap] = useState<Record<string, string>>({});
  const [approvalLoadingMap, setApprovalLoadingMap] = useState<Record<string, boolean>>({});

  const fetchCriteria = useCallback(async () => {
    try {
      const res = await fetch("/api/jd-criteria");
      if (res.ok) {
        const data = await res.json();
        setAllCriteria(data.criteria || []);
      }
    } catch (e) {
      console.warn("Gagal memuat kriteria JD:", e);
    }
  }, []);

  const loadData = () => {
    if (typeof window === "undefined") return;
    try {
      const subsStr = localStorage.getItem("rag_applicant_submissions");
      setSubmissions(subsStr ? JSON.parse(subsStr) : []);

      const pipeStr = localStorage.getItem("rag_pipeline_status");
      setPipelineMap(pipeStr ? JSON.parse(pipeStr) : {});
    } catch (e) {
      console.warn("Gagal memuat data dashboard:", e);
    }
  };

  useEffect(() => {
    loadData();
    fetchCriteria();

    const handleStorageChange = () => {
      loadData();
      fetchCriteria();
    };

    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [fetchCriteria]);

  const pendingCriteria = useMemo(
    () => allCriteria.filter((c) => c.approvalStatus === "pending"),
    [allCriteria]
  );

  const handleApproval = async (id: string, approve: boolean) => {
    setApprovalLoadingMap((prev) => ({ ...prev, [id]: true }));
    try {
      const reason = pendingReasonMap[id] || "Menunggu konfirmasi atasan / divisi";
      const res = await fetch(`/api/jd-criteria/approval/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approve, reason }),
      });
      if (res.ok) {
        await fetchCriteria();
      }
    } catch (e) {
      console.error("Gagal memperbarui status persetujuan", e);
    } finally {
      setApprovalLoadingMap((prev) => ({ ...prev, [id]: false }));
    }
  };

  const updatePipeline = (candId: string, status: PipelineStatus) => {
    const updated = { ...pipelineMap, [candId]: status };
    setPipelineMap(updated);
    try {
      localStorage.setItem("rag_pipeline_status", JSON.stringify(updated));
    } catch (e) {
      console.warn("Gagal menyimpan status pipeline:", e);
    }
  };

  const deleteCandidate = (candId: string) => {
    const updated = submissions.filter((s) => s.id !== candId);
    setSubmissions(updated);
    try {
      localStorage.setItem("rag_applicant_submissions", JSON.stringify(updated));
    } catch (e) {
      console.warn("Gagal menghapus berkas:", e);
    }
  };

  const getRankedList = (jdTitle: string) => {
    const targetTitle = jdTitle.toLowerCase().trim();
    const isTech = targetTitle.includes("technition") || targetTitle.includes("technician");

    return submissions.filter((s) => {
      const sTitle = (s.jdTitle || "").toLowerCase().trim();
      if (isTech) {
        return sTitle.includes("technition") || sTitle.includes("technician");
      }
      return sTitle === targetTitle;
    });
  };

  const techRankedAll = useMemo(() => getRankedList("Modern Packaging Technition PBK"), [submissions]);
  const workerRankedAll = useMemo(() => getRankedList("Modern Packaging Worker PBK"), [submissions]);

  // Lolos & Tereliminasi
  const techRanked = useMemo(() => techRankedAll.filter((s) => (s.suitabilityScore ?? 50) >= 50), [techRankedAll]);
  const workerRanked = useMemo(() => workerRankedAll.filter((s) => (s.suitabilityScore ?? 50) >= 50), [workerRankedAll]);

  const activeAll = activeTab === "tech" ? techRankedAll : workerRankedAll;
  const activeLolos = activeTab === "tech" ? techRanked : workerRanked;

  // Apply filters and sorting
  const processedList = useMemo(() => {
    // Secara bawaan, tabel ranking hanya menampilkan pelamar yang lolos (skor >= 50%)
    // Pelamar tereliminasi (<50%) hanya muncul jika filter "eliminated" / tier "kurang" dipilih
    let result = (filterPipeline === "eliminated" || tierFilter === "kurang")
      ? [...activeAll]
      : [...activeLolos];

    // Filter by Pipeline status chip
    if (filterPipeline !== "all") {
      if (filterPipeline === "eliminated") {
        result = result.filter((c) => (c.suitabilityScore ?? 50) < 50);
      } else {
        result = result.filter((c) => {
          const st = normalizeStatus(pipelineMap[c.id]);
          return st === filterPipeline;
        });
      }
    }

    // Filter by Donut Chart Score Tier
    if (tierFilter) {
      result = result.filter((c) => {
        const s = c.suitabilityScore ?? 50;
        if (tierFilter === "sangatsesuai") return s >= 80;
        if (tierFilter === "sesuai") return s >= 65 && s < 80;
        if (tierFilter === "cukup") return s >= 50 && s < 65;
        if (tierFilter === "kurang") return s < 50;
        return true;
      });
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === "score") {
        cmp = (b.suitabilityScore ?? 50) - (a.suitabilityScore ?? 50);
      } else if (sortField === "name") {
        cmp = (a.applicantName || "").localeCompare(b.applicantName || "");
      } else if (sortField === "education") {
        cmp = (a.profileEducation || "").localeCompare(b.profileEducation || "");
      } else if (sortField === "status") {
        const stA = normalizeStatus(pipelineMap[a.id]);
        const stB = normalizeStatus(pipelineMap[b.id]);
        cmp = stA.localeCompare(stB);
      }
      return sortOrder === "desc" ? cmp : -cmp;
    });

    return result;
  }, [activeAll, activeLolos, filterPipeline, tierFilter, sortField, sortOrder, pipelineMap]);

  const toggleSort = (field: "score" | "name" | "education" | "status") => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"));
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const openCandidateDetail = (cand: any) => {
    setSelectedCandidate(cand);
    setModalOpen(true);
  };

  return (
    <div className="space-y-4 pt-2">
      <CandidateDetailModal
        candidate={selectedCandidate}
        open={modalOpen}
        onOpenChange={setModalOpen}
        pipelineStatus={selectedCandidate ? normalizeStatus(pipelineMap[selectedCandidate.id]) : "Menunggu Review"}
        onUpdatePipeline={(id, status) => {
          updatePipeline(id, status);
          if (selectedCandidate && selectedCandidate.id === id) {
            setSelectedCandidate({ ...selectedCandidate });
          }
        }}
        onDeleteCandidate={deleteCandidate}
      />

      {/* Banner & Card Notifikasi Persetujuan Kriteria JD dari Admin */}
      {pendingCriteria.length > 0 && (
        <div className="space-y-3 p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-amber-900">
              <Bell className="h-5 w-5 text-amber-600 animate-bounce" />
              <div>
                <h3 className="text-sm font-extrabold tracking-wide uppercase">
                  Konfirmasi Kriteria JD Dari Admin
                </h3>
                <p className="text-xs font-medium text-amber-700">
                  Terdapat {pendingCriteria.length} perubahan/kriteria baru dari Admin yang memerlukan peninjauan HR.
                </p>
              </div>
            </div>
            <Badge className="bg-amber-600 text-white font-black text-xs px-2.5 py-1 shrink-0">
              {pendingCriteria.length} Menunggu Konfirmasi
            </Badge>
          </div>

          <div className="grid grid-cols-1 gap-3 pt-1">
            {pendingCriteria.map((c) => {
              const selectedReason = pendingReasonMap[c.id] || "Menunggu konfirmasi atasan";
              const isLoading = approvalLoadingMap[c.id];

              return (
                <div
                  key={c.id}
                  className="p-4 bg-white border border-amber-200/90 rounded-xl space-y-3 shadow-xs transition-all hover:shadow-md"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-100 pb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-800">{c.title}</span>
                        <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-600 border-slate-200 font-bold">
                          {c.department}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                        Diajukan oleh Admin pada:{" "}
                        <strong>{c.pendingAt ? new Date(c.pendingAt).toLocaleString("id-ID") : "Baru saja"}</strong>
                      </p>
                    </div>
                    {c.pendingReason && (
                      <Badge variant="secondary" className="bg-amber-100 text-amber-800 text-[10px] font-bold self-start sm:self-center">
                        Alasan Pending: {c.pendingReason}
                      </Badge>
                    )}
                  </div>

                  <div className="text-xs text-slate-600 space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <p className="font-semibold text-slate-700">Ringkasan Kriteria:</p>
                    <p className="line-clamp-2 text-slate-600">{c.summary || c.fullText?.slice(0, 150) + "..."}</p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                    <div className="flex items-center gap-2 flex-1">
                      <label className="text-[11px] font-bold text-slate-600 shrink-0">Alasan jika Pending:</label>
                      <select
                        value={selectedReason}
                        onChange={(e) => setPendingReasonMap((prev) => ({ ...prev, [c.id]: e.target.value }))}
                        className="text-xs font-semibold border border-slate-200 rounded-lg p-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500 flex-1"
                      >
                        <option value="Menunggu konfirmasi atasan">Menunggu konfirmasi atasan</option>
                        <option value="Masih dalam diskusi divisi terkait">Masih dalam diskusi divisi terkait</option>
                        <option value="Perlu peninjauan kualifikasi lebih lanjut">Perlu peninjauan kualifikasi lebih lanjut</option>
                        <option value="Menunggu persetujuan anggaran posisi">Menunggu persetujuan anggaran posisi</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isLoading}
                        onClick={() => handleApproval(c.id, false)}
                        className="text-xs font-bold border-amber-300 text-amber-800 hover:bg-amber-100 rounded-lg gap-1.5 h-8"
                      >
                        <Clock className="h-3.5 w-3.5" />
                        ⏳ Pending
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        disabled={isLoading}
                        onClick={() => handleApproval(c.id, true)}
                        className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg gap-1.5 h-8 border-0 shadow-sm"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        ✅ Setuju (Aktifkan)
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <div className="flex items-center gap-2">
          <Award className="h-5 w-5 text-sky-500 animate-pulse" />
          <h2 className="text-base font-bold text-slate-800 uppercase tracking-wide">
            Peringkat & Hasil Screening Pelamar PBK
          </h2>
        </div>
      </div>

      {/* Position Tab Selectors */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-2">
        <div className="flex flex-wrap gap-2">
          <Button
            variant={activeTab === "tech" ? "default" : "outline"}
            onClick={() => {
              setActiveTab("tech");
              setTierFilter(null);
            }}
            className={`text-xs font-bold flex items-center gap-1.5 h-9 ${
              activeTab === "tech"
                ? "btn-figma border-0 text-white shadow-md scale-[1.02]"
                : "border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            <Briefcase className="h-4 w-4" />
            Modern Packaging Technition PBK
            <Badge variant="secondary" className="ml-1.5 text-[9px] font-bold bg-slate-100 text-slate-800">
              {techRanked.length} Lolos
            </Badge>
          </Button>
          <Button
            variant={activeTab === "worker" ? "default" : "outline"}
            onClick={() => {
              setActiveTab("worker");
              setTierFilter(null);
            }}
            className={`text-xs font-bold flex items-center gap-1.5 h-9 ${
              activeTab === "worker"
                ? "btn-figma border-0 text-white shadow-md scale-[1.02]"
                : "border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            <UserCheck className="h-4 w-4" />
            Modern Packaging Worker PBK
            <Badge variant="secondary" className="ml-1.5 text-[9px] font-bold bg-slate-100 text-slate-800">
              {workerRanked.length} Lolos
            </Badge>
          </Button>
        </div>
      </div>

      {/* Filter Chips Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <span className="text-[10px] uppercase font-extrabold text-slate-400 mr-1 flex items-center gap-1 shrink-0">
          <Filter className="h-3 w-3" /> Filter:
        </span>
        {[
          { key: "all", label: "Semua Lolos", count: activeLolos.length },
          { key: "Menunggu Review", label: "Menunggu Review", count: activeAll.filter((c) => normalizeStatus(pipelineMap[c.id]) === "Menunggu Review").length },
          { key: "Rekomendasi Interview", label: "Rekomendasi Interview", count: activeAll.filter((c) => normalizeStatus(pipelineMap[c.id]) === "Rekomendasi Interview").length },
          { key: "Pertimbangkan Ulang", label: "Pertimbangkan Ulang", count: activeAll.filter((c) => normalizeStatus(pipelineMap[c.id]) === "Pertimbangkan Ulang").length },
          { key: "Tidak Lolos Berkas", label: "Tidak Lolos Berkas", count: activeAll.filter((c) => normalizeStatus(pipelineMap[c.id]) === "Tidak Lolos Berkas").length },
          { key: "eliminated", label: "Tereliminasi (<50%)", count: activeAll.filter((c) => (c.suitabilityScore ?? 50) < 50).length },
        ].map((f) => (
          <Button
            key={f.key}
            variant="ghost"
            size="sm"
            onClick={() => setFilterPipeline(f.key)}
            className={cn(
              "h-7 text-[11px] font-bold rounded-full px-3 transition-all shrink-0",
              filterPipeline === f.key
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-slate-100/80 text-slate-600 hover:bg-slate-200"
            )}
          >
            {f.label} ({f.count})
          </Button>
        ))}
      </div>

      {activeAll.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Donut Chart & Score Bars (2 columns) */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="border border-slate-100 bg-white shadow-sm p-4">
              <CardHeader className="p-0 pb-3 border-b border-slate-100 mb-3">
                <CardTitle className="text-xs font-extrabold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                  <PieChart className="h-4 w-4 text-teal-600" />
                  Grafik Komposisi Skor Pelamar
                </CardTitle>
              </CardHeader>
              <ScoreDistributionDonut
                list={activeAll}
                onSelectTier={setTierFilter}
                selectedTier={tierFilter}
              />
            </Card>

            <Card className="border border-slate-100 bg-white shadow-sm p-4">
              <CardHeader className="p-0 pb-3 border-b border-slate-100 mb-3 flex flex-row justify-between items-center">
                <CardTitle className="text-xs font-extrabold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-sky-500" />
                  Visualisasi Progress Skor
                </CardTitle>
                <span className="text-[10px] text-slate-400 font-semibold">(Klik kandidat untuk detail)</span>
              </CardHeader>
              <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                {processedList.map((cand, idx) => (
                  <div
                    key={cand.id}
                    onClick={() => openCandidateDetail(cand)}
                    className="space-y-1.5 p-2 bg-slate-50/70 hover:bg-sky-50/60 rounded-lg border border-slate-100/80 cursor-pointer transition-all duration-150 group"
                  >
                    <div className="flex justify-between text-xs items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-200/60 px-1.5 py-0.5 rounded">
                          #{idx + 1}
                        </span>
                        <span className="font-extrabold text-slate-800 group-hover:text-sky-600 truncate max-w-[140px]">
                          {cand.applicantName}
                        </span>
                      </div>
                      <span className="font-black text-sky-700 bg-sky-50 px-2 py-0.5 rounded text-[11px]">
                        {cand.suitabilityScore}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-200/60 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-sky-500 h-full rounded-full transition-all duration-500 shadow-inner"
                        style={{ width: `${cand.suitabilityScore}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Tabel Ranking Detail (3 columns) */}
          <Card className="lg:col-span-3 border border-slate-100 bg-white shadow-sm p-4 overflow-hidden flex flex-col">
            <CardHeader className="p-0 pb-3 border-b border-slate-100 mb-4 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-extrabold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-blue-500" />
                Tabel Ranking & Pipeline Pelamar ({processedList.length})
              </CardTitle>
              <span className="text-[10px] font-semibold text-slate-400">💡 Klik baris mana saja untuk opsi detail</span>
            </CardHeader>

            <div className="overflow-x-auto flex-1 max-h-[500px]">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="border-b border-slate-100 text-[9px] uppercase font-bold text-slate-400 tracking-wider">
                    <th className="py-2.5 px-3 text-center w-12 cursor-pointer hover:text-slate-700" onClick={() => toggleSort("score")}>
                      <span className="inline-flex items-center gap-0.5">
                        Rank {sortField === "score" ? (sortOrder === "desc" ? <ArrowDown className="h-3 w-3 text-sky-600" /> : <ArrowUp className="h-3 w-3 text-sky-600" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                      </span>
                    </th>
                    <th className="py-2.5 px-3 cursor-pointer hover:text-slate-700" onClick={() => toggleSort("name")}>
                      <span className="inline-flex items-center gap-0.5">
                        Nama &amp; Kontak {sortField === "name" ? (sortOrder === "desc" ? <ArrowDown className="h-3 w-3 text-sky-600" /> : <ArrowUp className="h-3 w-3 text-sky-600" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                      </span>
                    </th>
                    <th className="py-2.5 px-3 cursor-pointer hover:text-slate-700" onClick={() => toggleSort("education")}>
                      <span className="inline-flex items-center gap-0.5">
                        Pendidikan {sortField === "education" ? (sortOrder === "desc" ? <ArrowDown className="h-3 w-3 text-sky-600" /> : <ArrowUp className="h-3 w-3 text-sky-600" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                      </span>
                    </th>
                    <th className="py-2.5 px-3 text-center w-24 cursor-pointer hover:text-slate-700" onClick={() => toggleSort("status")}>
                      <span className="inline-flex items-center gap-0.5">
                        Status {sortField === "status" ? (sortOrder === "desc" ? <ArrowDown className="h-3 w-3 text-sky-600" /> : <ArrowUp className="h-3 w-3 text-sky-600" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                      </span>
                    </th>
                    <th className="py-2.5 px-3">Alasan Lolos AI</th>
                  </tr>
                </thead>
                <tbody>
                  {processedList.map((cand, idx) => {
                    const st = normalizeStatus(pipelineMap[cand.id]);
                    const cfg = PIPELINE_CONFIG[st];

                    return (
                      <tr
                        key={cand.id}
                        onClick={() => openCandidateDetail(cand)}
                        className="border-b border-slate-100 hover:bg-sky-50/40 transition-colors cursor-pointer group"
                      >
                        <td className="py-3 px-3 text-center font-black text-slate-400 bg-slate-50/30 group-hover:bg-transparent">
                          #{idx + 1}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5">
                            <div className="font-extrabold text-slate-800 text-xs group-hover:text-sky-600">
                              {cand.applicantName}
                            </div>
                            {cand.profileGender && (
                              <span
                                className={`text-[8px] font-black px-1 py-0.5 rounded border leading-none ${
                                  cand.profileGender === "Laki-laki"
                                    ? "bg-sky-50 text-sky-600 border-sky-100/80"
                                    : "bg-rose-50 text-rose-600 border-rose-100/80"
                                }`}
                              >
                                {cand.profileGender === "Laki-laki" ? "L" : "P"}
                              </span>
                            )}
                          </div>
                          <div className="text-[9px] text-slate-400 flex flex-col gap-0.5 mt-1 font-medium">
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3 text-slate-350" /> {cand.profileEmail || "-"}
                            </span>
                            {cand.profilePhone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3 text-slate-350" /> {cand.profilePhone}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-slate-600 font-medium">
                          {cand.profileEducation ? (
                            <div>
                              <span className="font-extrabold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                                {cand.profileEducation}
                              </span>
                              <span className="block text-[10px] text-slate-400 mt-1 font-normal truncate max-w-[120px]">
                                {cand.profileMajor || "-"}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <Badge className={cn("text-[9px] font-bold px-2 py-0.5 rounded border", cfg.bg, cfg.text, cfg.border)}>
                            <span className={cn("h-1.5 w-1.5 rounded-full mr-1 inline-block", cfg.dot)} />
                            {st}
                          </Badge>
                          <span className="block text-[9px] font-black text-sky-700 mt-1">
                            {cand.suitabilityScore}%
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-500 max-w-[200px] leading-relaxed font-medium">
                          <p className="line-clamp-2">{cand.alasanLolos || "Memenuhi kualifikasi dasar."}</p>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : (
        <div className="py-16 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
          <FileSearch className="h-10 w-10 mx-auto text-slate-300 mb-3" />
          <p className="text-xs font-bold text-slate-500">Tidak ada pelamar sesuai filter yang dipilih.</p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setFilterPipeline("all");
              setTierFilter(null);
            }}
            className="mt-3 text-xs rounded-full"
          >
            Reset Filter
          </Button>
        </div>
      )}
    </div>
  );
}

/* ================== Main Content ================== */
export function MainContent() {
  const { documents, recentQueries, removeQuery, clearQueries } = useDocuments();
  const [hoveredQuery, setHoveredQuery] = useState<string | null>(null);

  const [submissions, setSubmissions] = useState<any[]>([]);
  const [pipelineMap, setPipelineMap] = useState<Record<string, PipelineStatus>>({});

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const subsStr = localStorage.getItem("rag_applicant_submissions");
      setSubmissions(subsStr ? JSON.parse(subsStr) : []);

      const pipeStr = localStorage.getItem("rag_pipeline_status");
      setPipelineMap(pipeStr ? JSON.parse(pipeStr) : {});
    } catch (e) {
      /* ignore */
    }
  }, []);

  const stats = useMemo(() => {
    const processed = documents.filter((d) => d.status === "Processed").length;
    const cvCount = documents.filter((d) => isCvDoc(d.name)).length;
    const jdCount = documents.filter((d) => isJdDoc(d.name)).length;

    const totalSubmissions = submissions.length;
    const passedSubmissions = submissions.filter((s) => (s.suitabilityScore ?? 50) >= 50).length;
    const recommendedInterviewCount = submissions.filter((s) => {
      const st = normalizeStatus(pipelineMap[s.id]);
      return st === "Rekomendasi Interview";
    }).length;

    return {
      totalDocs: documents.length,
      processed,
      queries: recentQueries.length,
      cvCount,
      jdCount,
      totalSubmissions,
      passedSubmissions,
      recommendedInterviewCount,
    };
  }, [documents, recentQueries, submissions, pipelineMap]);

  const recentDocs = useMemo(
    () =>
      [...documents]
        .sort((a, b) => b.uploadDate.localeCompare(a.uploadDate))
        .slice(0, 5),
    [documents]
  );

  return (
    <main className="flex-1 overflow-auto bg-slate-50/50">
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
        {/* Welcome Header */}
        <div className="hr-fade-in">
          <div className="flex items-center gap-2 text-primary mb-1">
            <Sparkles className="h-4 w-4 text-[#0ea5e9]" />
            <span className="text-xs font-semibold uppercase tracking-wider text-[#0d9488]">
              HR Recruitment Dashboard
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight">Overview</h1>
          <p className="text-sm text-slate-500 mt-1">
            Dashboard rekrutmen {PARTNER_NAME} — pantau dokumen, hasil screening AI, &amp; status screening CV.
          </p>
        </div>

        {/* Real Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          <StatCard
            icon={FileText}
            label="Total Dokumen"
            value={stats.totalDocs}
            subLabel={`${stats.cvCount} CV · ${stats.jdCount} JD`}
            delay={0}
            gradient="linear-gradient(135deg, #ff7eb3 0%, #ff758c 100%)"
          />
          <StatCard
            icon={UserCheck}
            label="Pelamar Terdaftar"
            value={stats.totalSubmissions}
            subLabel="Total berkas masuk"
            delay={50}
            gradient="linear-gradient(135deg, #70a1ff 0%, #5352ed 100%)"
          />
          <StatCard
            icon={Award}
            label="Lolos Seleksi AI"
            value={stats.passedSubmissions}
            subLabel="Skor kesesuaian ≥ 50%"
            delay={100}
            gradient="linear-gradient(135deg, #ffb347 0%, #ffcc33 100%)"
          />
          <StatCard
            icon={TrendingUp}
            label="Rekomendasi Interview"
            value={stats.recommendedInterviewCount}
            subLabel="Direkomendasikan ke wawancara"
            delay={150}
            gradient="linear-gradient(135deg, #2ed573 0%, #1abc9c 100%)"
          />
        </div>

        {/* Hasil Screening & Pipeline Section */}
        <OverviewRankingPanel />

        {/* Recent Queries & Documents Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Queries with Replay */}
          <Card className="bg-white shadow-sm border border-slate-100 rounded-2xl p-2">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="flex items-center gap-2 text-base text-slate-800">
                <Clock className="h-5 w-5 text-sky-500" />
                Recent Queries HR
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-full"
                disabled={recentQueries.length === 0}
                onClick={() => {
                  if (recentQueries.length === 0) return;
                  if (window.confirm("Hapus semua riwayat query?")) clearQueries();
                }}
              >
                Clear All
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                {recentQueries.length > 0 ? (
                  recentQueries.map((q) => (
                    <div
                      key={q.id}
                      className={cn(
                        "hr-query-item flex items-center justify-between gap-3 p-3 rounded-lg border border-transparent hover:bg-slate-50 transition-all",
                        hoveredQuery === q.id && "border-slate-100 bg-slate-50/50"
                      )}
                      onMouseEnter={() => setHoveredQuery(q.id)}
                      onMouseLeave={() => setHoveredQuery(null)}
                    >
                      <div className="flex-1 min-w-0 text-slate-700">
                        <p className="text-xs font-bold line-clamp-2">{q.text}</p>
                        <p className="text-[10px] text-slate-400 mt-1">{timeAgo(q.at)}</p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Link href={`/assistant-workspace?q=${encodeURIComponent(q.text)}`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2.5 text-[11px] font-bold text-sky-600 hover:text-sky-700 hover:bg-sky-50 rounded-full gap-1"
                            title="Jalankan ulang di AI Assistant"
                          >
                            <Play className="h-3 w-3 fill-current" />
                            Replay
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 opacity-50 hover:opacity-100 hover:text-rose-600 hover:bg-rose-50 rounded-full"
                          onClick={() => removeQuery(q.id)}
                          aria-label="Hapus query"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyBlock
                    icon={MessageSquare}
                    title="Belum ada riwayat query"
                    desc='Buka AI Assistant Workspace, pilih kriteria JD, lalu ajukan pertanyaan.'
                    actionHref="/assistant-workspace"
                    actionLabel="Buka AI Assistant"
                  />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Documents */}
          <Card className="bg-white shadow-sm border border-slate-100 rounded-2xl p-2">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="flex items-center gap-2 text-base text-slate-800">
                <FileText className="h-5 w-5 text-sky-500" />
                Dokumen Terbaru
              </CardTitle>
              <Link href="/documents">
                <Button variant="ghost" size="sm" className="text-xs gap-1 text-slate-500 hover:text-slate-900 rounded-full">
                  Lihat semua
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                {recentDocs.length > 0 ? (
                  recentDocs.map((doc) => (
                    <Link
                      key={doc.id}
                      href="/documents"
                      className="hr-query-item flex items-center gap-3 p-3 rounded-lg border border-transparent hover:bg-slate-50 group"
                    >
                      <div className="h-9 w-9 rounded-lg bg-sky-50 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <FileText className="h-4 w-4 text-sky-600" />
                      </div>
                      <div className="flex-1 min-w-0 text-slate-700">
                        <p className="text-xs font-bold truncate">{doc.name}</p>
                        <p className="text-[10px] text-slate-400">
                          {doc.uploadDate} · {doc.size}
                        </p>
                      </div>
                      <Badge
                        variant={doc.status === "Processed" ? "default" : "secondary"}
                        className={cn(
                          "text-[10px] shrink-0 font-semibold px-2 py-0.5",
                          doc.status === "Processed"
                            ? "bg-sky-100 text-sky-850 border-0 font-bold"
                            : "bg-slate-100 text-slate-700 border-0"
                        )}
                      >
                        {doc.status}
                      </Badge>
                    </Link>
                  ))
                ) : (
                  <EmptyBlock
                    icon={Upload}
                    title="Belum ada dokumen"
                    desc="Upload CV kandidat untuk memulai screening di AI Assistant"
                    actionHref="/documents"
                    actionLabel="Kelola Dokumen"
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  subLabel,
  delay,
  gradient,
}: {
  icon: typeof FileText;
  label: string;
  value: number;
  subLabel: string;
  delay: number;
  gradient: string;
}) {
  return (
    <Card
      className="hr-stat-card border-0 py-4 gap-2 text-white relative overflow-hidden rounded-2xl shadow-md transition-all duration-300 hover:scale-102 hover:shadow-lg"
      style={{
        animationDelay: `${delay}ms`,
        background: gradient,
      }}
    >
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent pointer-events-none" />

      <CardContent className="p-4 flex flex-col justify-between h-full relative z-10">
        <div className="flex items-center justify-between w-full mb-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
              <Icon className="h-4 w-4 text-white" />
            </div>
            <p className="text-xs font-bold text-white/95">{label}</p>
          </div>
        </div>
        <div>
          <p className="text-3xl font-black tracking-tight leading-none text-white">{value}</p>
          <p className="text-[10px] text-white/80 mt-2 font-semibold">{subLabel}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyBlock({
  icon: Icon,
  title,
  desc,
  actionHref,
  actionLabel,
}: {
  icon: typeof FileText;
  title: string;
  desc: string;
  actionHref: string;
  actionLabel: string;
}) {
  return (
    <div className="py-8 px-4 text-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50">
      <Icon className="h-8 w-8 mx-auto text-slate-400 mb-3" />
      <p className="text-xs font-bold text-slate-800">{title}</p>
      <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">{desc}</p>
      <Link href={actionHref}>
        <Button size="sm" className="mt-4 bg-[#0ea5e9] hover:bg-[#0ea5e9]/90 text-white rounded-full font-bold text-xs border-0 gap-1.5 shadow-md shadow-[#0ea5e9]/10">
          {actionLabel}
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </Link>
    </div>
  );
}
