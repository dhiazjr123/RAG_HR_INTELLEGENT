// app/auth/callback/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/";
  const type = url.searchParams.get("type"); // email verification vs oauth

  // kalau tidak ada code, kembali ke login
  if (!code) return NextResponse.redirect(new URL("/login", req.url));

  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        set(name, value, options) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name, options) {
          cookieStore.set({ name, value: "", ...options, maxAge: 0 });
        },
      },
    }
  );

  // tukar code menjadi session + set cookie
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, req.url)
    );
  }

  // Jika ini email verification (type=signup), logout user dan arahkan ke login
  if (type === "signup") {
    await supabase.auth.signOut();
    return NextResponse.redirect(
      new URL(`/login?verified=true&next=${encodeURIComponent(next)}`, req.url)
    );
  }

  // Untuk semua OAuth (baik login maupun signup), langsung arahkan ke halaman tujuan
  // Supabase akan otomatis membuat akun baru jika belum ada, atau login jika sudah ada
  return NextResponse.redirect(new URL(next, req.url));
}
