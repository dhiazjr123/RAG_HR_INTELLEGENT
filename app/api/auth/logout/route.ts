// app/api/auth/logout/route.ts
import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ ok: true });

  // Hapus cookie "session"
  res.cookies.set("session", "", {
    path: "/",
    httpOnly: true,
    expires: new Date(0), // expired langsung
  });

  return res;
}
