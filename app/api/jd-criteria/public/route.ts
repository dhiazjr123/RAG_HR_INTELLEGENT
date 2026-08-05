import { NextResponse } from "next/server";
import { listJdCriteria } from "@/lib/jd-criteria-store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { criteria } = await listJdCriteria();
    const approvedCriteria = criteria.filter(
      (c) => !c.approvalStatus || c.approvalStatus === "approved"
    );
    const publicList = approvedCriteria.map((c) => ({
      id: c.id,
      title: c.title,
      department: c.department,
    }));
    return NextResponse.json({ criteria: publicList });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal memuat kriteria JD";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
