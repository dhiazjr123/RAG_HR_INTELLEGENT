// app/page.tsx  (SERVER COMPONENT)
import { redirect } from "next/navigation";
import HomeShell from "@/components/home-shell";
import { createServerSupabase } from "@/lib/supabase/server";
import { getUserRoles } from "@/lib/auth/roles";

export default async function Page() {
  let user: any = null;

  try {
    const supabase = createServerSupabase();
    const { data, error } = await supabase.auth.getUser();
    
    // Log untuk debugging
    console.log('Auth check result:', { user: data?.user?.id, error });
    
    if (!error && data?.user) {
      user = data.user;
    }
  } catch (error) {
    console.error('Page load error (auth fetch):', error);
  }

  // Jalankan redirect di luar try-catch agar Next.js memprosesnya secara normal
  if (!user) {
    redirect("/login?next=/");
  }

  console.log('User authenticated:', user.email);

  const roles = getUserRoles(user);
  if (roles.includes("pelamar")) {
    redirect("/pelamar/dashboard");
  }

  return <HomeShell />;
}
