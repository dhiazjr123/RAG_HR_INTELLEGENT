// components/home-shell.tsx
"use client";

import { DocumentsProvider } from "@/components/documents-context";
import { Header } from "@/components/header";
import Sidebar from "@/components/sidebar";
import { MainContent } from "@/components/main-content";

export default function HomeShell() {
  return (
    <DocumentsProvider>
      <div className="min-h-screen page-gradient">
        <Header />
        <div className="flex">
          <Sidebar />
          <MainContent />
        </div>
      </div>
    </DocumentsProvider>
  );
}
