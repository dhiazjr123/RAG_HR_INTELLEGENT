import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { getUserRoles, hasRole, type AppRole } from "@/lib/auth/roles";

export async function requireAuth() {
  const supabase = createServerSupabase();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { user: null, roles: [] as AppRole[], response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const roles = getUserRoles(user);
  return { user, roles, response: null };
}

export async function requireAdmin() {
  const auth = await requireAuth();
  if (auth.response) return auth;

  if (!hasRole(auth.roles, "admin")) {
    return {
      ...auth,
      response: NextResponse.json({ error: "Forbidden — admin only" }, { status: 403 }),
    };
  }

  return auth;
}
