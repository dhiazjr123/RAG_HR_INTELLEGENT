import { NextResponse } from "next/server";
import { approveJdCriteria } from "@/lib/jd-criteria-store";
import { requireAuth } from "@/lib/auth/require-auth";

export const dynamic = "force-dynamic";

type RouteCtx = { params: { id: string } };

export async function PATCH(req: Request, { params }: RouteCtx) {
  const auth = await requireAuth();
  if (auth.response) return auth.response;

  try {
    const { approve, reason } = await req.json();
    if (typeof approve !== "boolean") {
      return NextResponse.json({ error: "Parameter 'approve' (boolean) wajib diisi." }, { status: 400 });
    }

    const updated = await approveJdCriteria(params.id, approve, reason);
    return NextResponse.json({ criteria: updated });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal memperbarui status persetujuan";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
