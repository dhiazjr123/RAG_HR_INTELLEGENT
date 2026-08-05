// components/header.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { LogOut, HelpCircle, User2, Settings, Bot, BarChart3, FileText } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/language-provider";

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useLanguage();
  const supabase = createClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [userRole, setUserRole] = useState<{ isAdmin: boolean; isHr: boolean } | null>(null);

  const isAdminPage = pathname.startsWith("/admin");
  const isAdminView = isAdminPage || (userRole?.isAdmin && !userRole?.isHr);

  const onLogout = async () => {
    setIsLoggingOut(true);
    // Animasi loading sebelum logout
    await new Promise(resolve => setTimeout(resolve, 300));
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  };

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data && !data.error) {
          setUserRole({
            isAdmin: Boolean(data.isAdmin),
            isHr: Boolean(data.isHr),
          });
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!menuRef.current) return;
      const target = e.target as Node | null;
      if (target && !menuRef.current.contains(target)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const navItems = [
    { href: "/", label: t("sidebar.overview"), icon: BarChart3 },
    { href: "/documents", label: t("sidebar.documents"), icon: FileText },
    { href: "/assistant-workspace", label: t("sidebar.aiAssistant"), icon: Bot },
  ];

  return (
    <header className="sticky top-0 z-[80] w-full px-6 py-4 bg-white/95 backdrop-blur-md border-b border-slate-100">
      <div className="max-w-7xl mx-auto flex h-12 items-center justify-between gap-4">
        
        {/* LEFT: Logo Card */}
        <Link href={isAdminView ? "/admin/jd-criteria" : "/"} className="flex items-center">
          <div className="bg-white border border-slate-100 shadow-sm rounded-xl px-4 py-1.5 flex items-center gap-2 hover:bg-slate-50 transition-colors">
            <Image
              src="/logo ISRE.png"
              alt="ISRE"
              width={140}
              height={42}
              className="h-[42px] w-auto object-contain"
              priority
            />
            <div className="h-6 w-[1px] bg-slate-200" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">
              {isAdminView ? "Admin Panel" : "HR Portal"}
            </span>
          </div>
        </Link>

        {/* CENTER: Navigation Pill Capsule (Only for HR, hidden for Admin) */}
        {!isAdminView && (
          <nav className="hidden md:flex bg-slate-50 border border-slate-100/80 shadow-inner rounded-full p-1 items-center gap-1">
            {navItems.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href}>
                  <button
                    className={cn(
                      "flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-300",
                      active
                        ? "bg-gradient-to-r from-[#0ea5e9] to-[#0d9488] text-white shadow-md shadow-[#0ea5e9]/20 scale-105"
                        : "text-slate-600 hover:text-slate-900 hover:bg-white/80"
                    )}
                  >
                    <Icon className={cn("h-3.5 w-3.5", active ? "text-white" : "text-slate-500")} />
                    <span>{item.label}</span>
                  </button>
                </Link>
              );
            })}
          </nav>
        )}

        {/* RIGHT: Avatar & Logout */}
        <div className="flex items-center gap-3">

          {/* Logout & Profile Menu */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "ring-ambient text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-all duration-300",
                isLoggingOut && "opacity-70 cursor-wait"
              )}
              onClick={onLogout}
              disabled={isLoggingOut}
            >
              <LogOut className={cn(
                "h-4 w-4 mr-1",
                isLoggingOut && "animate-spin"
              )} />
              <span className="hidden lg:inline text-xs font-semibold">
                {isLoggingOut ? t("header.loggingOut") : t("header.logout")}
              </span>
            </Button>

            <div className="relative" ref={menuRef}>
              <button
                className="rounded-full focus:outline-none transition-all duration-300 ease-in-out hover:scale-105 active:scale-95 ring-2 ring-transparent hover:ring-[#0ea5e9]/30"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((v) => !v)}
              >
                <Avatar className={cn(
                  "h-8 w-8 border border-slate-200 transition-all duration-300",
                  menuOpen && "ring-2 ring-[#0ea5e9] scale-105"
                )}>
                  <AvatarImage src="/1.jpg" />
                  <AvatarFallback>JD</AvatarFallback>
                </Avatar>
              </button>
              
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-white border border-slate-100 rounded-xl shadow-lg z-[90] p-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
                  <button
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 rounded-lg transition-all duration-300 hover:bg-slate-50 hover:text-slate-900 group"
                    onClick={() => { setMenuOpen(false); router.push("/profile"); }}
                  >
                    <User2 className="h-3.5 w-3.5 text-slate-500 transition-transform duration-300 group-hover:scale-110" />
                    <span>{t("header.profile")}</span>
                  </button>
                  <button
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 rounded-lg transition-all duration-300 hover:bg-slate-50 hover:text-slate-900 group"
                    onClick={() => { setMenuOpen(false); router.push("/setting"); }}
                  >
                    <Settings className="h-3.5 w-3.5 text-slate-500 transition-transform duration-300 group-hover:rotate-45" />
                    <span>{t("header.setting")}</span>
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </header>
  );
}
