import { NextResponse } from "next/server";
import { createJdCriteria, listJdCriteria } from "@/lib/jd-criteria-store";
import { requireAdmin } from "@/lib/auth/require-auth";
import type { PartnerJobCriteria } from "@/lib/partner-jd-criteria";

export const dynamic = "force-dynamic";

function validateCriteria(body: Partial<PartnerJobCriteria>): PartnerJobCriteria | null {
  if (!body.id?.trim() || !body.title?.trim() || !body.department?.trim()) {
    return null;
  }
  return {
    id: body.id.trim(),
    department: body.department.trim(),
    title: body.title.trim(),
    level: body.level?.trim() || "Staff",
    location: body.location?.trim() || "Tegal",
    employmentType: body.employmentType?.trim() || "Full-time",
    summary: body.summary?.trim() || "",
    responsibilities: Array.isArray(body.responsibilities)
      ? body.responsibilities.map((s) => String(s).trim()).filter(Boolean)
      : [],
    requirements: Array.isArray(body.requirements)
      ? body.requirements.map((s) => String(s).trim()).filter(Boolean)
      : [],
    niceToHave: Array.isArray(body.niceToHave)
      ? body.niceToHave.map((s) => String(s).trim()).filter(Boolean)
      : [],
    fullText: body.fullText?.trim() || "",
  };
}

export async function GET() {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  try {
    const data = await listJdCriteria();
    return NextResponse.json(data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal memuat kriteria";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  try {
    const body = await req.json();
    const item = validateCriteria(body);
    if (!item) {
      return NextResponse.json(
        { error: "ID, title, department, dan fullText wajib diisi." },
        { status: 400 }
      );
    }
    if (!item.fullText) {
      return NextResponse.json({ error: "fullText / dokumen JD wajib diisi." }, { status: 400 });
    }

    const created = await createJdCriteria(item);
    return NextResponse.json({ criteria: created }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal menambah kriteria";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
