import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { getUserRoles, hasRole } from "@/lib/auth/roles";
import { AdminShell } from "@/components/admin/admin-shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/admin/jd-criteria&role=admin");
  }

  const roles = getUserRoles(user);
  if (!hasRole(roles, "admin")) {
    redirect("/login?error=admin_required&role=admin");
  }

  return <AdminShell>{children}</AdminShell>;
}
