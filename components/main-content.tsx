"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
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
  GraduationCap
} from "lucide-react";
import { useDocuments } from "@/components/documents-context";
import { PARTNER_NAME, PARTNER_JD_CRITERIA } from "@/lib/partner-jd-criteria";
import { cn } from "@/lib/utils";

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

function OverviewRankingPanel() {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"tech" | "worker">("tech");

  const loadSubmissions = () => {
    const subsStr = localStorage.getItem("rag_applicant_submissions");
    if (subsStr) {
      try {
        setSubmissions(JSON.parse(subsStr));
      } catch (e) {}
    } else {
      setSubmissions([]);
    }
  };

  useEffect(() => {
    loadSubmissions();

    const handleStorageChange = () => {
      loadSubmissions();
    };

    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const getRankedList = (jdTitle: string) => {
    const targetTitle = jdTitle.toLowerCase().trim();
    const isTech = targetTitle.includes("technition") || targetTitle.includes("technician");
    
    const filtered = submissions.filter((s) => {
      const sTitle = (s.jdTitle || "").toLowerCase().trim();
      if (isTech) {
        return sTitle.includes("technition") || sTitle.includes("technician");
      }
      return sTitle === targetTitle;
    });

    return filtered.sort((a, b) => {
      const scoreA = a.suitabilityScore ?? 50;
      const scoreB = b.suitabilityScore ?? 50;
      return scoreB - scoreA;
    });
  };

  const techRankedAll = useMemo(() => getRankedList("Modern Packaging Technition PBK"), [submissions]);
  const workerRankedAll = useMemo(() => getRankedList("Modern Packaging Worker PBK"), [submissions]);

  // Lolos: Skor >= 50
  const techRanked = useMemo(() => techRankedAll.filter((s) => (s.suitabilityScore ?? 50) >= 50), [techRankedAll]);
  const workerRanked = useMemo(() => workerRankedAll.filter((s) => (s.suitabilityScore ?? 50) >= 50), [workerRankedAll]);

  // Tereliminasi: Skor < 50
  const techEliminatedCount = useMemo(() => techRankedAll.filter((s) => (s.suitabilityScore ?? 50) < 50).length, [techRankedAll]);
  const workerEliminatedCount = useMemo(() => workerRankedAll.filter((s) => (s.suitabilityScore ?? 50) < 50).length, [workerRankedAll]);

  const selectedList = activeTab === "tech" ? techRanked : workerRanked;
  const totalCount = activeTab === "tech" ? techRankedAll.length : workerRankedAll.length;
  const eliminatedCount = activeTab === "tech" ? techEliminatedCount : workerEliminatedCount;

  return (
    <div className="space-y-4 pt-2">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
        <Award className="h-5 w-5 text-emerald-500 animate-pulse" />
        <h2 className="text-base font-bold text-slate-800 uppercase tracking-wide">Peringkat & Hasil Screening Pelamar PBK</h2>
      </div>

      {/* Position Tab Selectors */}
      <div className="flex flex-wrap gap-2 border-b border-slate-100 pb-3 mb-4">
        <Button
          variant={activeTab === "tech" ? "default" : "outline"}
          onClick={() => setActiveTab("tech")}
          className={`text-xs font-bold flex items-center gap-1.5 h-9 ${
            activeTab === "tech" ? "bg-primary text-white" : "border-slate-200 text-slate-700 hover:bg-slate-50"
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
          onClick={() => setActiveTab("worker")}
          className={`text-xs font-bold flex items-center gap-1.5 h-9 ${
            activeTab === "worker" ? "bg-primary text-white" : "border-slate-200 text-slate-700 hover:bg-slate-50"
          }`}
        >
          <UserCheck className="h-4 w-4" />
          Modern Packaging Worker PBK
          <Badge variant="secondary" className="ml-1.5 text-[9px] font-bold bg-slate-100 text-slate-800">
            {workerRanked.length} Lolos
          </Badge>
        </Button>
      </div>

      {/* AI Screening Stats Panel */}
      <div className="p-4 bg-sky-50/50 border border-sky-100/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 shadow-sm">
        <div>
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-sky-600 animate-spin" style={{ animationDuration: '4s' }} />
            Statistik Hasil Seleksi Berkas
          </h3>
          <p className="text-[10px] sm:text-[11px] text-slate-500 mt-1 max-w-xl leading-normal">
            Informasi ringkasan berkas pelamar dan tingkat kesesuaian berdasarkan hasil evaluasi kriteria posisi jabatan yang dilamar.
          </p>
        </div>
        <div className="flex gap-3.5 sm:self-center shrink-0">
          <div className="text-center px-4 py-1.5 bg-white border border-slate-100 rounded-lg shadow-sm">
            <span className="text-slate-400 block text-[8px] uppercase font-extrabold tracking-wider">Total Pelamar</span>
            <span className="text-sm font-black text-slate-800">{totalCount}</span>
          </div>
          <div className="text-center px-4 py-1.5 bg-emerald-50 border border-emerald-100 rounded-lg shadow-sm">
            <span className="text-emerald-600 block text-[8px] uppercase font-extrabold tracking-wider">Lolos (&ge; 50%)</span>
            <span className="text-sm font-black text-emerald-700">{selectedList.length}</span>
          </div>
          <div className="text-center px-4 py-1.5 bg-rose-50 border border-rose-100 rounded-lg shadow-sm">
            <span className="text-rose-600 block text-[8px] uppercase font-extrabold tracking-wider">Tereliminasi</span>
            <span className="text-sm font-black text-rose-700">{eliminatedCount}</span>
          </div>
        </div>
      </div>

      {selectedList.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Grafik Batang (Takes 2 columns in lg grid) */}
          <Card className="lg:col-span-2 border border-slate-100 bg-white shadow-sm p-4">
            <CardHeader className="p-0 pb-3 border-b border-slate-100 mb-4">
              <CardTitle className="text-xs font-extrabold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                Visualisasi Grafik Skor
              </CardTitle>
            </CardHeader>
            <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
              {selectedList.map((cand, idx) => (
                <div key={cand.id} className="space-y-1.5 p-2 bg-slate-50/50 rounded-lg border border-slate-100/50">
                  <div className="flex justify-between text-xs items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">#{idx + 1}</span>
                      <span className="font-extrabold text-slate-700 truncate max-w-[150px]">{cand.applicantName}</span>
                    </div>
                    <span className="font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-[11px]">{cand.suitabilityScore}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500 shadow-inner" 
                      style={{ width: `${cand.suitabilityScore}%` }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Tabel Ranking Detail (Takes 3 columns in lg grid) */}
          <Card className="lg:col-span-3 border border-slate-100 bg-white shadow-sm p-4 overflow-hidden flex flex-col">
            <CardHeader className="p-0 pb-3 border-b border-slate-100 mb-4">
              <CardTitle className="text-xs font-extrabold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-blue-500" />
                Tabel Ranking Detail Pelamar
              </CardTitle>
            </CardHeader>
            
            <div className="overflow-x-auto flex-1 max-h-[420px]">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="border-b border-slate-100 text-[9px] uppercase font-bold text-slate-400 tracking-wider">
                    <th className="py-2.5 px-3 text-center w-12">Rank</th>
                    <th className="py-2.5 px-3">Nama & Kontak</th>
                    <th className="py-2.5 px-3">Pendidikan</th>
                    <th className="py-2.5 px-3 text-center w-16">Skor</th>
                    <th className="py-2.5 px-3">Alasan Lolos (AI Reasoning)</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedList.map((cand, idx) => (
                    <tr key={cand.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-3 text-center font-black text-slate-400 bg-slate-50/30">
                        #{idx + 1}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-extrabold text-slate-800 text-xs">{cand.applicantName}</div>
                        <div className="text-[9px] text-slate-400 flex flex-col gap-0.5 mt-1 font-medium">
                          <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {cand.profileEmail || "-"}</span>
                          {cand.profilePhone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {cand.profilePhone}</span>}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-600 font-medium">
                        {cand.profileEducation ? (
                          <div>
                            <span className="font-extrabold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">{cand.profileEducation}</span>
                            <span className="block text-[10px] text-slate-400 mt-1 font-normal truncate max-w-[120px]">{cand.profileMajor || "-"}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200/50 text-[10px] font-black px-2 py-0.5 rounded">
                          {cand.suitabilityScore}%
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-slate-500 max-w-[220px] leading-relaxed font-medium">
                        {cand.alasanLolos || "Memenuhi syarat kualifikasi dasar dan kriteria khusus yang ditentukan."}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : (
        <div className="py-20 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
          <FileSearch className="h-10 w-10 mx-auto text-slate-350 mb-3" />
          <p className="text-xs font-bold text-slate-400">Belum ada pelamar terdaftar di posisi ini.</p>
        </div>
      )}
    </div>
  );
}

/* ================== Main Content ================== */
export function MainContent() {
  const { documents, recentQueries, removeQuery, clearQueries } = useDocuments();
  const [hoveredQuery, setHoveredQuery] = useState<string | null>(null);

  const stats = useMemo(() => {
    const processed = documents.filter((d) => d.status === "Processed").length;
    const cvCount = documents.filter((d) => isCvDoc(d.name)).length;
    return {
      total: documents.length,
      processed,
      queries: recentQueries.length,
      cvCount,
    };
  }, [documents, recentQueries]);

  const recentDocs = useMemo(
    () =>
      [...documents]
        .sort((a, b) => b.uploadDate.localeCompare(a.uploadDate))
        .slice(0, 5),
    [documents]
  );

  const quickActions = [
    {
      href: "/assistant-workspace",
      icon: Bot,
      title: "AI Assistant",
      desc: "Screening CV vs kriteria JD",
      accent: "from-[#6fb7ff]/20 to-[#1d45f3]/10",
    },
    {
      href: "/documents",
      icon: FileText,
      title: "Manage Documents",
      desc: "Lihat, preview, unduh file",
      accent: "from-violet-500/15 to-violet-500/5",
    },
  ];

  return (
    <main className="flex-1 overflow-auto bg-slate-50/50">
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
        {/* Welcome */}
        <div className="hr-fade-in">
          <div className="flex items-center gap-2 text-primary mb-1">
            <Sparkles className="h-4 w-4 text-[#0ea5e9]" />
            <span className="text-xs font-semibold uppercase tracking-wider text-[#0d9488]">HR Workspace</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight">Overview</h1>
          <p className="text-sm text-slate-500 mt-1">
            Dashboard rekrutmen {PARTNER_NAME} — pantau dokumen & aktivitas screening.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          <StatCard
            icon={FileText}
            label="Total Dokumen"
            value={stats.total}
            delay={0}
            gradient="linear-gradient(135deg, #ff7eb3 0%, #ff758c 100%)"
            badgeText="▲ 8%"
            badgeColorClass="text-emerald-200"
          />
          <StatCard
            icon={TrendingUp}
            label="Sudah Diproses"
            value={stats.processed}
            delay={50}
            gradient="linear-gradient(135deg, #ffb347 0%, #ffcc33 100%)"
            badgeText="▼ 10.5%"
            badgeColorClass="text-rose-200"
          />
          <StatCard
            icon={Briefcase}
            label="CV Terupload"
            value={stats.cvCount}
            delay={100}
            gradient="linear-gradient(135deg, #70a1ff 0%, #5352ed 100%)"
            badgeText="▲ 2.5%"
            badgeColorClass="text-emerald-200"
          />
          <StatCard
            icon={MessageSquare}
            label="Total Query"
            value={stats.queries}
            delay={150}
            gradient="linear-gradient(135deg, #2ed573 0%, #1abc9c 100%)"
            badgeText="▼ 10.5%"
            badgeColorClass="text-rose-200"
          />
        </div>

        {/* Quick actions */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Aksi Cepat
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              const bgGradient = index === 0
                ? "bg-gradient-to-br from-sky-50 to-sky-100/30 border-sky-100/80 hover:border-sky-200"
                : "bg-gradient-to-br from-purple-50 to-purple-100/30 border-purple-100/80 hover:border-purple-200";
              const iconColor = index === 0 ? "text-sky-600 bg-sky-100/60" : "text-purple-600 bg-purple-100/60";
              return (
                <Link key={action.title} href={action.href} className="block group">
                  <Card className={cn("hr-quick-action h-full border py-4 gap-2 shadow-sm transition-all duration-300", bgGradient)}>
                    <CardContent className="p-4 pt-0 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform", iconColor)}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <ArrowRight className="h-4 w-4 text-slate-400 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-slate-800">{action.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{action.desc}</p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>

        {/* ================== HASIL SCREENING & RANKING ================== */}
        <OverviewRankingPanel />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent queries */}
          <Card className="bg-white shadow-sm border border-slate-100 rounded-2xl p-2">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="flex items-center gap-2 text-base text-slate-800">
                <Clock className="h-5 w-5 text-sky-500" />
                Recent Queries
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-full"
                disabled={recentQueries.length === 0}
                onClick={() => {
                  if (recentQueries.length === 0) return;
                  if (window.confirm("Hapus semua recent queries?")) clearQueries();
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
                        "hr-query-item flex items-start justify-between gap-3 p-3 rounded-lg border border-transparent hover:bg-slate-50",
                        hoveredQuery === q.id && "border-slate-100"
                      )}
                      onMouseEnter={() => setHoveredQuery(q.id)}
                      onMouseLeave={() => setHoveredQuery(null)}
                    >
                      <div className="flex-1 min-w-0 text-slate-700">
                        <p className="text-sm font-semibold line-clamp-2">{q.text}</p>
                        <p className="text-[11px] text-slate-400 mt-1">{timeAgo(q.at)}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0 h-8 w-8 p-0 opacity-60 hover:opacity-100 hover:text-rose-600 hover:bg-rose-50 rounded-full"
                        onClick={() => removeQuery(q.id)}
                        aria-label="Hapus query"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <EmptyBlock
                    icon={MessageSquare}
                    title="Belum ada query"
                    desc='Buka AI Assistant, pilih kriteria JD, lalu tanyakan "siapa paling cocok?"'
                    actionHref="/assistant-workspace"
                    actionLabel="Buka AI Assistant"
                  />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent documents */}
          <Card className="bg-white shadow-sm border border-slate-100 rounded-2xl p-2">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="flex items-center gap-2 text-base text-slate-800">
                <FileText className="h-5 w-5 text-emerald-500" />
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
                      <div className="h-9 w-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <FileText className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div className="flex-1 min-w-0 text-slate-700">
                        <p className="text-sm font-semibold truncate">{doc.name}</p>
                        <p className="text-[11px] text-slate-400">
                          {doc.uploadDate} · {doc.size}
                        </p>
                      </div>
                      <Badge
                        variant={doc.status === "Processed" ? "default" : "secondary"}
                        className={cn(
                          "text-[10px] shrink-0 font-semibold px-2 py-0.5",
                          doc.status === "Processed"
                            ? "bg-emerald-100 text-emerald-800 border-0"
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
  delay,
  gradient,
  badgeText,
  badgeColorClass,
}: {
  icon: typeof FileText;
  label: string;
  value: number;
  delay: number;
  gradient: string;
  badgeText: string;
  badgeColorClass: string;
}) {
  return (
    <Card
      className="hr-stat-card border-0 py-4 gap-2 text-white relative overflow-hidden rounded-2xl shadow-md transition-all duration-300 hover:scale-102 hover:shadow-lg"
      style={{
        animationDelay: `${delay}ms`,
        background: gradient,
      }}
    >
      {/* Texture overlay */}
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent pointer-events-none" />
      
      <CardContent className="p-4 flex flex-col justify-between h-full relative z-10">
        <div className="flex items-center justify-between w-full mb-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
              <Icon className="h-4 w-4 text-white" />
            </div>
            <p className="text-xs font-semibold text-white/90">{label}</p>
          </div>
          <Badge className={cn("text-[9px] font-bold px-1.5 py-0 border-0 bg-white/20", badgeColorClass)}>
            {badgeText}
          </Badge>
        </div>
        <div>
          <p className="text-3xl font-extrabold tracking-tight leading-none text-white">{value}</p>
          <p className="text-[10px] text-white/70 mt-2 font-medium">Real-time update</p>
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
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">{desc}</p>
      <Link href={actionHref}>
        <Button size="sm" className="mt-4 bg-[#0ea5e9] hover:bg-[#0ea5e9]/90 text-white rounded-full font-semibold border-0 gap-1.5 shadow-md shadow-[#0ea5e9]/10">
          {actionLabel}
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </Link>
    </div>
  );
}
