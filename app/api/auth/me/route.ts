import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { getUserRoles } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";

/** Role user dihitung di server (ADMIN_EMAILS + Supabase metadata) */
export async function GET() {
  const supabase = createServerSupabase();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log("DEBUG /api/auth/me - user metadata:", {
    email: user.email,
    app_metadata: user.app_metadata,
    user_metadata: user.user_metadata,
  });

  const roles = getUserRoles(user);
  return NextResponse.json({
    email: user.email,
    roles,
    isAdmin: roles.includes("admin"),
    isHr: roles.includes("hr"),
    isPelamar: roles.includes("pelamar"),
  });
}
