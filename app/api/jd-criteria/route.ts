import { NextResponse } from "next/server";
import { listJdCriteria } from "@/lib/jd-criteria-store";
import { requireAuth } from "@/lib/auth/require-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAuth();
  if (auth.response) return auth.response;

  try {
    const { criteria, updatedAt } = await listJdCriteria();
    return NextResponse.json({ criteria, updatedAt });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal memuat kriteria JD";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
