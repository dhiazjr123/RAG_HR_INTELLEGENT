// components/header.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { LogOut, HelpCircle, User2, Settings } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export function Header() {
  const router = useRouter();
  const supabase = createClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const onLogout = async () => {
    setIsLoggingOut(true);
    // Animasi loading sebelum logout
    await new Promise(resolve => setTimeout(resolve, 300));
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  };

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!menuRef.current) return;
      const target = e.target as Node | null;
      if (target && !menuRef.current.contains(target)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <header className="border-b border-border bg-card/70 glass soft-shadow sticky top-0 z-[80]">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center">
          <Image
            src="/RAG logo.png"
            alt="RAG"
            width={70}
            height={70}
            className="h-25 w-auto"
            priority
          />
        </div>

        <div className="flex items-center gap-4">
          <Badge variant="secondary" className="text-xs">Enterprise Department</Badge>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="ring-ambient"><HelpCircle className="h-4 w-4" /></Button>
            <Button 
              variant="default" 
              size="sm" 
              className={cn(
                "ring-ambient btn-gradient transition-all duration-300 ease-in-out",
                "hover:scale-105 hover:shadow-lg active:scale-95",
                isLoggingOut && "opacity-70 cursor-wait"
              )} 
              onClick={onLogout}
              disabled={isLoggingOut}
            >
              <LogOut className={cn(
                "h-4 w-4 mr-2 transition-transform duration-300",
                isLoggingOut && "animate-spin"
              )} /> 
              {isLoggingOut ? "Logging out..." : "Logout"}
            </Button>
            <div className="relative" ref={menuRef}>
              <button
                className="rounded-full focus:outline-none transition-all duration-300 ease-in-out hover:scale-110 active:scale-95 ring-2 ring-transparent hover:ring-primary/30"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((v) => !v)}
              >
                <Avatar className={cn(
                  "h-8 w-8 transition-all duration-300",
                  menuOpen && "ring-2 ring-primary scale-110"
                )}>
                  <AvatarImage src="/1.jpg" />
                  <AvatarFallback>JD</AvatarFallback>
                </Avatar>
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-popover border border-border rounded-md shadow-md z-[90] animate-in fade-in slide-in-from-top-2 duration-200">
                  <button
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm transition-all duration-300 ease-in-out hover:bg-muted/60 hover:translate-x-1 hover:scale-105 active:scale-95 group"
                    onClick={() => { setMenuOpen(false); router.push("/profile"); }}
                  >
                    <User2 className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" /> 
                    <span>Profile</span>
                  </button>
                  <button
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm transition-all duration-300 ease-in-out hover:bg-muted/60 hover:translate-x-1 hover:scale-105 active:scale-95 group"
                    onClick={() => { setMenuOpen(false); router.push("/setting"); }}
                  >
                    <Settings className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" /> 
                    <span>Setting</span>
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
