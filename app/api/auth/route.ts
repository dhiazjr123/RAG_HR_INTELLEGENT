/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";
import { supabase, BUCKET } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Prisma (hindari multiple instances di dev)
const prisma = (globalThis as any).prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") (globalThis as any).prisma = prisma;

// --- util umum
async function getUserId() { return "u1"; } // ganti dgn NextAuth nanti

function notFound(msg = "not found") {
  return NextResponse.json({ error: msg }, { status: 404 });
}
function bad(msg = "bad request") {
  return NextResponse.json({ error: msg }, { status: 400 });
}
function fail(e: any) {
  console.error(e);
  return NextResponse.json({ error: e?.message ?? "internal error" }, { status: 500 });
}

// --- dispatcher utama
export async function GET(req: NextRequest, { params }: { params: { slug?: string[] } }) {
  const parts = params.slug ?? [];       // contoh: ["documents","123"]
  try {
    // /api  atau /api/
    if (parts.length === 0) {
      return NextResponse.json({ ok: true, message: "API root" });
    }

    // /api/documents (LIST)
    if (parts[0] === "documents" && parts.length === 1) {
      const userId = await getUserId();
      const docs = await prisma.document.findMany({
        where: { userId },
        orderBy: { uploadedAt: "desc" },
      });
      return NextResponse.json(docs);
    }

    // /api/documents/:id (DETAIL)
    if (parts[0] === "documents" && parts[1]) {
      const id = parts[1];
      const userId = await getUserId();
      const doc = await prisma.document.findFirst({ where: { id, userId } });
      if (!doc) return notFound();
      return NextResponse.json(doc);
    }

    return notFound("route GET tidak dikenali");
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: NextRequest, { params }: { params: { slug?: string[] } }) {
  const parts = params.slug ?? [];

  try {
    // /api/auth/login
    if (parts[0] === "auth" && parts[1] === "login") {
      const { email, password, remember } = await req.json().catch(() => ({}));
      if (typeof email !== "string" || typeof password !== "string" || email.length < 4 || password.length < 4) {
        return NextResponse.json({ error: "Email atau password tidak valid." }, { status: 401 });
      }
      const token = Buffer.from(`${email}:${Date.now()}`).toString("base64");
      const maxAge = remember ? 60 * 60 * 24 * 30 : 60 * 60 * 4;

      const res = NextResponse.json({ ok: true });
      res.cookies.set("session", token, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge });
      return res;
    }

    // /api/auth/logout
    if (parts[0] === "auth" && parts[1] === "logout") {
      const res = NextResponse.json({ ok: true });
      res.cookies.set("session", "", { path: "/", maxAge: 0 });
      return res;
    }

    // /api/documents (UPLOAD)
    if (parts[0] === "documents" && parts.length === 1) {
      const userId = await getUserId();

      const form = await req.formData();
      const file: any = form.get("file");
      if (!file || typeof file.arrayBuffer !== "function" || !file.name) return bad("no file");

      const buf = Buffer.from(await file.arrayBuffer());
      const ext = (file.name as string).split(".").pop()?.toLowerCase() || "bin";
      const storageKey = `${userId}/${crypto.randomUUID()}.${ext}`;

      const { error: upErr } = await supabase.storage.from(BUCKET).upload(storageKey, buf, {
        contentType: (file.type as string) || "application/octet-stream",
        upsert: false,
      });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(storageKey);
      const publicUrl = pub.publicUrl;

      const doc = await prisma.document.create({
        data: {
          userId,
          name: file.name as string,
          type: ext.toUpperCase(),
          size: Number(file.size ?? 0),
          status: "Processed",
          storageKey,
          publicUrl,
        },
      });
      return NextResponse.json(doc, { status: 201 });
    }

    return notFound("route POST tidak dikenali");
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { slug?: string[] } }) {
  const parts = params.slug ?? [];
  try {
    // /api/documents/:id (DELETE)
    if (parts[0] === "documents" && parts[1]) {
      const userId = await getUserId();
      const id = parts[1];
      const doc = await prisma.document.findFirst({ where: { id, userId } });
      if (!doc) return notFound();

      await prisma.document.delete({ where: { id: doc.id } });
      await supabase.storage.from(BUCKET).remove([doc.storageKey]);

      return NextResponse.json({ ok: true });
    }

    return notFound("route DELETE tidak dikenali");
  } catch (e) {
    return fail(e);
  }
}
