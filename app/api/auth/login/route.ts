// app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  const { email, password, remember } = await req.json();
  // ... validasi demo di sini ...

  const token   = Buffer.from(`${email}:${Date.now()}`).toString("base64");
  const version = process.env.SESSION_VERSION ?? "v1"; // lihat opsi #4
  const value   = `${version}.${token}`;

  const res = NextResponse.json({ ok: true });
  const base = {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
  };

  if (remember) {
    res.cookies.set("session", value, { ...base, maxAge: 60 * 60 * 24 * 30 }); // 30 hari
  } else {
    res.cookies.set("session", value, base); // session cookie: hilang saat browser ditutup
  }
  return res;
}
