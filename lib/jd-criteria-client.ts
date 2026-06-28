"use client";

import { useCallback, useEffect, useState } from "react";
import type { PartnerJobCriteria } from "@/lib/partner-jd-criteria";
import { buildFullText, buildOfficialFullText, PARTNER_NAME } from "@/lib/partner-jd-criteria";

export function useJdCriteria() {
  const [criteria, setCriteria] = useState<PartnerJobCriteria[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/jd-criteria", { cache: "no-store" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setCriteria(data.criteria ?? []);
      setUpdatedAt(data.updatedAt ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat kriteria JD");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  return { criteria, updatedAt, loading, error, refresh };
}

export type JdFormMode = "standard" | "official";

export type JdFormState = {
  id: string;
  department: string;
  title: string;
  level: string;
  location: string;
  employmentType: string;
  summary: string;
  responsibilitiesText: string;
  requirementsText: string;
  niceToHaveText: string;
  formMode: JdFormMode;
  officialBody: string;
  fullText: string;
};

export function criteriaToForm(c?: PartnerJobCriteria | null): JdFormState {
  if (!c) {
    return {
      id: "",
      department: "",
      title: "",
      level: "Staff",
      location: "Pabrik Sosro — Tegal",
      employmentType: "Full-time",
      summary: "",
      responsibilitiesText: "",
      requirementsText: "",
      niceToHaveText: "",
      formMode: "standard",
      officialBody: "",
      fullText: "",
    };
  }

  const isOfficial = c.fullText.includes("URAIAN & KUALIFIKASI JABATAN");
  let officialBody = "";
  if (isOfficial) {
    const idx = c.fullText.indexOf("URAIAN & KUALIFIKASI JABATAN");
    officialBody = idx >= 0 ? c.fullText.slice(idx) : c.fullText;
  }

  return {
    id: c.id,
    department: c.department,
    title: c.title,
    level: c.level,
    location: c.location,
    employmentType: c.employmentType,
    summary: c.summary,
    responsibilitiesText: c.responsibilities.join("\n"),
    requirementsText: c.requirements.join("\n"),
    niceToHaveText: c.niceToHave.join("\n"),
    formMode: isOfficial ? "official" : "standard",
    officialBody,
    fullText: c.fullText,
  };
}

export function formToCriteria(form: JdFormState): PartnerJobCriteria {
  const base = {
    id: form.id.trim(),
    department: form.department.trim(),
    title: form.title.trim(),
    level: form.level.trim(),
    location: form.location.trim(),
    employmentType: form.employmentType.trim(),
    summary: form.summary.trim(),
    responsibilities: form.responsibilitiesText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean),
    requirements: form.requirementsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean),
    niceToHave: form.niceToHaveText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean),
  };

  let fullText = form.fullText.trim();
  if (form.formMode === "official") {
    fullText = buildOfficialFullText(base, form.officialBody);
  } else if (!fullText) {
    fullText = buildFullText(base);
  }

  return { ...base, fullText };
}

export function slugifyId(title: string): string {
  return (
    "sgs-" +
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48)
  );
}

export { PARTNER_NAME };
