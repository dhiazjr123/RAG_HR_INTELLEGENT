"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Briefcase,
  Building2,
  CheckCircle2,
  ChevronRight,
  MapPin,
  RefreshCw,
  Search,
} from "lucide-react";
import {
  PARTNER_NAME,
  type PartnerJobCriteria,
} from "@/lib/partner-jd-criteria";

type Props = {
  selectedId: string | null;
  onSelect: (id: string) => void;
  criteriaList: PartnerJobCriteria[];
  onRefresh?: () => void;
};

export function JdCriteriaPanel({ selectedId, onSelect, criteriaList, onRefresh }: Props) {
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState<string>("all");

  const departments = useMemo(() => {
    const set = new Set(criteriaList.map((c) => c.department));
    return ["all", ...Array.from(set).sort()];
  }, [criteriaList]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return criteriaList.filter((c) => {
      if (deptFilter !== "all" && c.department !== deptFilter) return false;
      if (!q) return true;
      return (
        c.title.toLowerCase().includes(q) ||
        c.department.toLowerCase().includes(q) ||
        c.summary.toLowerCase().includes(q)
      );
    });
  }, [criteriaList, search, deptFilter]);

  const selected = criteriaList.find((c) => c.id === selectedId);

  return (
    <div className="flex flex-col h-full bg-card/30">
      <div className="p-3 pb-2 border-b border-border bg-card/60 shrink-0">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2.5">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Kriteria Rekrutmen
            </p>
            <h2 className="text-sm font-semibold truncate">{PARTNER_NAME}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Pilih bagian/posisi - sistem memakai kriteria ini saat screening CV
            </p>
          </div>
          {onRefresh && (
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 h-8 w-8 p-0"
              onClick={onRefresh}
              title="Muat ulang kriteria"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="mt-3 relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="search"
            placeholder="Cari posisi atau departemen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {departments.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDeptFilter(d)}
              className={`text-[11px] px-3.5 py-1.5 rounded-full border transition-all duration-200 ${
                deptFilter === d
                  ? "bg-gradient-to-r from-[#0ea5e9] to-[#0d9488] text-white border-0 font-semibold shadow-md shadow-[#0ea5e9]/10"
                  : "border-slate-100 text-slate-500 bg-slate-50 hover:bg-slate-100 hover:text-slate-800"
              }`}
            >
              {d === "all" ? "Semua" : d}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex min-h-0 overflow-hidden">
        <div className="w-[42%] min-w-[140px] border-r border-border overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground p-4 text-center">Tidak ada posisi ditemukan.</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {filtered.map((c) => {
                const active = c.id === selectedId;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(c.id)}
                      className={`w-full text-left px-4 py-3.5 transition-all duration-300 border-l-2 ${
                        active
                          ? "bg-slate-50 border-l-[#0ea5e9] shadow-inner"
                          : "border-l-transparent hover:bg-slate-50/50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="min-w-0">
                          <p className={`text-xs font-semibold leading-snug line-clamp-2 transition-colors ${
                            active ? "text-[#0ea5e9]" : "text-slate-700"
                          }`}>{c.title}</p>
                          <p className="text-[10px] text-slate-400 mt-1 font-medium truncate">{c.department}</p>
                        </div>
                        {active ? (
                          <CheckCircle2 className="h-4 w-4 text-[#0ea5e9] shrink-0 mt-0.5" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 text-slate-300 shrink-0 mt-0.5" />
                        )}
                      </div>
                      {c.level && (
                        <Badge variant="outline" className="text-[9px] mt-2 h-4 px-1.5 font-medium border-slate-200 bg-white text-slate-500">
                          {c.level}
                        </Badge>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {!selected ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground px-4">
              <Briefcase className="h-12 w-12 mb-3 opacity-40" />
              <p className="text-sm font-medium">Belum ada kriteria dipilih</p>
              <p className="text-xs mt-2 opacity-80">
                Klik salah satu posisi di daftar kiri. Kriteria akan otomatis dipakai AI saat Anda chat.
              </p>
            </div>
          ) : (
            <CriteriaDetail criteria={selected} />
          )}
        </div>
      </div>
    </div>
  );
}

function CriteriaDetail({ criteria }: { criteria: PartnerJobCriteria }) {
  return (
    <div className="space-y-4">
      <div>
        <Badge className="mb-2 bg-gradient-to-r from-[#0ea5e9] to-[#0d9488] border-0 text-white shadow-sm">{criteria.department}</Badge>
        <h3 className="text-lg font-bold leading-tight text-slate-800">{criteria.title}</h3>
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {criteria.location}
          </span>
          <span>{criteria.level}</span>
          <span>{criteria.employmentType}</span>
        </div>
      </div>

      <section>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
          Ringkasan
        </h4>
        <p className="text-sm leading-relaxed">{criteria.summary}</p>
      </section>

      <section>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
          Persyaratan utama
        </h4>
        <ul className="text-sm space-y-1 list-disc list-inside text-foreground/90">
          {criteria.requirements.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </section>

      <section>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
          Tanggung jawab
        </h4>
        <ul className="text-sm space-y-1 list-disc list-inside text-foreground/90">
          {criteria.responsibilities.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </section>

      {criteria.niceToHave.length > 0 && (
        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
            Nice to have
          </h4>
          <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
            {criteria.niceToHave.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-[11px] text-muted-foreground pt-2 border-t border-border/60">
        Kriteria dimuat dari database mitra - diperbarui oleh Admin PT Sosro.
      </p>
    </div>
  );
}
