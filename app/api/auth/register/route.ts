import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.SUPABASE_URL!,                 // https://xxxxx.supabase.co
  process.env.SUPABASE_SERVICE_ROLE_KEY!     // SERVICE ROLE (bukan anon)
);

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { email, password, username } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "email & password wajib diisi" }, { status: 400 });
    }

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: false,                     // <- perlu verifikasi email
      user_metadata: { username, full_name: username, name: username },
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ ok: true, user_id: data.user?.id ?? null }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "internal error" }, { status: 500 });
  }
}
