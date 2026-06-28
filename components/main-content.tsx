"use client";

import { useMemo, useState } from "react";
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
} from "lucide-react";
import { useDocuments } from "@/components/documents-context";
import { PARTNER_NAME } from "@/lib/partner-jd-criteria";
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

function isCvDoc(name: string) {
  const n = name.toLowerCase();
  return n.includes("cv") || n.includes("resume") || n.includes("curriculum");
}

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
    <main className="flex-1 overflow-auto hr-page-bg">
      <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
        {/* Welcome */}
        <div className="hr-fade-in">
          <div className="flex items-center gap-2 text-primary mb-1">
            <Sparkles className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">HR Workspace</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold">Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Dashboard rekrutmen {PARTNER_NAME} — pantau dokumen & aktivitas screening.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <StatCard icon={FileText} label="Total Dokumen" value={stats.total} delay={0} />
          <StatCard icon={TrendingUp} label="Sudah Diproses" value={stats.processed} delay={50} />
          <StatCard icon={Briefcase} label="CV Terupload" value={stats.cvCount} delay={100} />
          <StatCard icon={MessageSquare} label="Total Query" value={stats.queries} delay={150} />
        </div>

        {/* Quick actions */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Aksi Cepat
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link key={action.title} href={action.href} className="block group">
                  <Card
                    className={cn(
                      "hr-quick-action h-full bg-gradient-to-br border py-4 gap-2",
                      action.accent
                    )}
                  >
                    <CardContent className="p-4 pt-0 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{action.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{action.desc}</p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent queries */}
          <Card className="bg-card/70 glass soft-shadow border hr-fade-in">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-5 w-5 text-primary" />
                Recent Queries
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs admin-action-btn"
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
                        "hr-query-item flex items-start justify-between gap-3 p-3 rounded-lg border border-transparent",
                        hoveredQuery === q.id && "border-primary/20"
                      )}
                      onMouseEnter={() => setHoveredQuery(q.id)}
                      onMouseLeave={() => setHoveredQuery(null)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground line-clamp-2">{q.text}</p>
                        <p className="text-xs text-muted-foreground mt-1">{timeAgo(q.at)}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0 h-8 w-8 p-0 opacity-60 hover:opacity-100 hover:text-destructive hover:bg-destructive/10 admin-action-btn"
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
          <Card className="bg-card/70 glass soft-shadow border hr-fade-in">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-5 w-5 text-primary" />
                Dokumen Terbaru
              </CardTitle>
              <Link href="/documents">
                <Button variant="ghost" size="sm" className="text-xs gap-1 admin-action-btn">
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
                      className="hr-query-item flex items-center gap-3 p-3 rounded-lg border border-transparent hover:border-primary/20 group"
                    >
                      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{doc.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {doc.uploadDate} · {doc.size}
                        </p>
                      </div>
                      <Badge
                        variant={doc.status === "Processed" ? "default" : "secondary"}
                        className={cn("text-[10px] shrink-0", doc.status === "Processed" && "btn-gradient border-0")}
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
}: {
  icon: typeof FileText;
  label: string;
  value: number;
  delay: number;
}) {
  return (
    <Card
      className="hr-stat-card bg-card/70 glass border py-4 gap-2"
      style={{ animationDelay: `${delay}ms` }}
    >
      <CardContent className="p-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#6fb7ff]/25 to-[#1d45f3]/15 flex items-center justify-center shrink-0">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-2xl font-bold leading-none">{value}</p>
          <p className="text-[11px] text-muted-foreground mt-1">{label}</p>
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
    <div className="py-8 px-4 text-center rounded-lg border border-dashed border-border bg-muted/10">
      <Icon className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">{desc}</p>
      <Link href={actionHref}>
        <Button size="sm" className="mt-4 btn-figma border-0 admin-action-btn gap-2">
          {actionLabel}
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </Link>
    </div>
  );
}
