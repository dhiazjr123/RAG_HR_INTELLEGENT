"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { PARTNER_NAME } from "@/lib/partner-jd-criteria";
import { Briefcase, FileText, LayoutDashboard, LogOut, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin/jd-criteria", label: "Kelola JD & Kriteria", icon: FileText },
  { href: "/assistant-workspace", label: "AI Assistant (HR)", icon: Briefcase },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const logout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <aside className="w-64 shrink-0 border-r border-border bg-card/40 flex flex-col">
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-2 text-primary">
            <LayoutDashboard className="h-5 w-5" />
            <span className="font-semibold text-sm">Admin Dashboard</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{PARTNER_NAME}</p>
          <span className="inline-block mt-2 text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20">
            Administrator
          </span>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm transition-colors",
                  active
                    ? "bg-primary/15 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border space-y-2">
          <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            Perubahan JD langsung tersinkron ke halaman AI Assistant HR
          </div>
          <Button variant="outline" size="sm" className="w-full gap-2" onClick={logout}>
            <LogOut className="h-4 w-4" />
            Keluar
          </Button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 overflow-auto bg-background/50">{children}</main>
    </div>
  );
}
