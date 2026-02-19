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
    <aside className="w-80 border-r border-border bg-sidebar/60 glass soft-shadow h-[calc(100vh-4rem)]">
      <div className="p-4">
        <nav className="space-y-2">
          {menu.map((m) => {
            const active = pathname === m.href;
            const Icon = m.icon;
            const isClicked = clickedItem === m.href;
            return (
              <Link key={m.href} href={m.href} className="block" onClick={() => handleClick(m.href)}>
                <Button
                  variant={active ? "default" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-2 transition-all duration-300 ease-in-out",
                    active && "btn-gradient",
                    !active && "hover:bg-muted/50 hover:translate-x-1",
                    isClicked && "scale-95"
                  )}
                >
                  <Icon className={cn(
                    "h-4 w-4 transition-transform duration-300",
                    active && "scale-110",
                    isClicked && "rotate-12"
                  )} />
                  <span className={cn(
                    "transition-all duration-300",
                    active && "font-semibold"
                  )}>
                  {t(m.labelKey)}
                  </span>
                </Button>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
