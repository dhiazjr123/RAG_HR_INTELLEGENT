// components/admin/admin-shell.tsx
"use client";

import { Header } from "@/components/header";

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      <div className="flex-1 w-full">
        {children}
      </div>
    </div>
  );
}
