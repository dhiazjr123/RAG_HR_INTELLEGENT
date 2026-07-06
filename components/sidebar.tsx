// components/sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Bot, BarChart3, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useLanguage } from "@/components/language-provider";

export default function Sidebar() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const [clickedItem, setClickedItem] = useState<string | null>(null);
  const menu = [
    { href: "/assistant-workspace", labelKey: "sidebar.aiAssistant", icon: Bot },
    { href: "/", labelKey: "sidebar.overview", icon: BarChart3 },
    { href: "/documents", labelKey: "sidebar.documents", icon: FileText },
  ];

  const handleClick = (href: string) => {
    setClickedItem(href);
    setTimeout(() => setClickedItem(null), 300);
  };

  return (
    <aside
      className="w-80 min-h-[calc(100vh-4rem)]"
      style={{
        background: "transparent",
        borderRight: "1px solid rgba(13, 196, 176, 0.22)",
      }}
    >
      <div className="p-4 pt-5">
        {/* Section label */}
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-3 px-2"
          style={{ color: "rgba(13, 148, 136, 0.7)" }}>
          Navigation
        </p>
        <nav className="space-y-1">
          {menu.map((m) => {
            const active = pathname === m.href;
            const Icon = m.icon;
            const isClicked = clickedItem === m.href;
            return (
              <Link key={m.href} href={m.href} className="block" onClick={() => handleClick(m.href)}>
                <Button
                  variant={active ? "default" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-3 transition-all duration-300 ease-in-out h-10 px-3",
                    active && "btn-gradient shadow-md",
                    !active && "hover:bg-white/60 hover:translate-x-1 text-foreground",
                    isClicked && "scale-95"
                  )}
                  style={active ? {} : {
                    borderLeft: "2px solid transparent",
                  }}
                >
                  <div className={cn(
                    "flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-300",
                    active
                      ? "bg-white/20"
                      : "bg-gradient-to-br from-teal-50 to-blue-50",
                  )}>
                    <Icon className={cn(
                      "h-4 w-4 transition-transform duration-300",
                      active && "scale-110 text-white",
                      !active && "text-teal-600",
                      isClicked && "rotate-12"
                    )} />
                  </div>
                  <span className={cn(
                    "transition-all duration-300 text-sm",
                    active && "font-semibold text-white",
                    !active && "text-foreground/80 group-hover:text-foreground"
                  )}>
                  {t(m.labelKey)}
                  </span>
                </Button>
              </Link>
            );
          })}
        </nav>

        {/* Divider gradient */}
        <div className="my-5" style={{
          height: "1px",
          background: "linear-gradient(90deg, rgba(13,196,176,0.3) 0%, rgba(59,130,246,0.2) 50%, transparent 100%)",
        }} />

        {/* Footer info box */}
        <div className="rounded-xl p-3 text-xs" style={{
          background: "linear-gradient(135deg, rgba(13,212,190,0.08) 0%, rgba(59,130,246,0.06) 100%)",
          border: "1px solid rgba(13,196,176,0.18)",
        }}>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#10d4be" }} />
            <span className="font-semibold" style={{ color: "#0d9488" }}>AI System Online</span>
          </div>
          <p style={{ color: "rgba(0,0,0,0.5)" }}>RAG engine aktif & siap digunakan</p>
        </div>
      </div>
    </aside>
  );
}
