import type { User } from "@supabase/supabase-js";

export type AppRole = "hr" | "admin";
export type LoginIntent = AppRole;

const LOGIN_INTENT_KEY = "sgs_login_intent_role";

export function setLoginIntent(role: LoginIntent): void {
  if (typeof window !== "undefined") {
    sessionStorage.setItem(LOGIN_INTENT_KEY, role);
  }
}

export function getLoginIntent(): LoginIntent {
  if (typeof window === "undefined") return "hr";
  const v = sessionStorage.getItem(LOGIN_INTENT_KEY);
  return v === "admin" ? "admin" : "hr";
}

export function clearLoginIntent(): void {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(LOGIN_INTENT_KEY);
  }
}

function parseRoleValue(raw: unknown): AppRole[] {
  if (!raw || typeof raw !== "string") return [];
  const v = raw.toLowerCase().trim();
  if (v === "admin") return ["admin", "hr"];
  if (v === "both") return ["admin", "hr"];
  if (v === "hr") return ["hr"];
  return [];
}

/** Role dari Supabase user — app_metadata.app_role atau user_metadata.app_role */
export function getUserRoles(user: User | null | undefined): AppRole[] {
  if (!user) return [];

  // Dev/demo: semua user login bisa akses admin (matikan di production)
  if (process.env.SGS_DEV_ALLOW_ADMIN === "true") {
    return ["admin", "hr"];
  }

  const fromApp = parseRoleValue(user.app_metadata?.app_role);
  if (fromApp.length > 0) return fromApp;

  const fromMeta = parseRoleValue(user.user_metadata?.app_role);
  if (fromMeta.length > 0) return fromMeta;

  const adminEmails = (process.env.ADMIN_EMAILS ?? process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (user.email && adminEmails.includes(user.email.toLowerCase())) {
    return ["admin", "hr"];
  }

  return ["hr"];
}

/** Ambil role dari server (pakai di client setelah login) */
export async function fetchServerRoles(): Promise<AppRole[]> {
  try {
    const res = await fetch("/api/auth/me", { cache: "no-store" });
    if (!res.ok) return ["hr"];
    const data = (await res.json()) as { roles?: AppRole[] };
    return Array.isArray(data.roles) && data.roles.length > 0 ? data.roles : ["hr"];
  } catch {
    return ["hr"];
  }
}

export function hasRole(roles: AppRole[], required: AppRole): boolean {
  return roles.includes(required);
}

export function redirectPathForIntent(intent: LoginIntent): string {
  return intent === "admin" ? "/admin/jd-criteria" : "/assistant-workspace";
}

export function roleAccessError(intent: LoginIntent): string {
  return intent === "admin"
    ? "Akun ini tidak memiliki akses Admin. Gunakan login HR atau hubungi administrator."
    : "Akun ini tidak memiliki akses HR.";
}
