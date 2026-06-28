import { NextResponse } from "next/server";
import { deleteJdCriteria, getJdCriteriaById, updateJdCriteria } from "@/lib/jd-criteria-store";
import { requireAdmin } from "@/lib/auth/require-auth";
import type { PartnerJobCriteria } from "@/lib/partner-jd-criteria";

export const dynamic = "force-dynamic";

type RouteCtx = { params: { id: string } };

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

export async function GET(_req: Request, { params }: RouteCtx) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const item = await getJdCriteriaById(params.id);
  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ criteria: item });
}

export async function PUT(req: Request, { params }: RouteCtx) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  try {
    const body = await req.json();
    const item = validateCriteria(body);
    if (!item || !item.fullText) {
      return NextResponse.json({ error: "Data tidak valid atau fullText kosong." }, { status: 400 });
    }
    const updated = await updateJdCriteria(params.id, item);
    return NextResponse.json({ criteria: updated });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal memperbarui kriteria";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: RouteCtx) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  try {
    await deleteJdCriteria(params.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal menghapus kriteria";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
