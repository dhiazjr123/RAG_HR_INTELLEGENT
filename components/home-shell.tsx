// components/home-shell.tsx
"use client";

import { DocumentsProvider } from "@/components/documents-context";
import { Header } from "@/components/header";
import { MainContent } from "@/components/main-content";

export default function HomeShell() {
  return (
    <DocumentsProvider>
      <div className="min-h-screen bg-white flex flex-col">
        <Header />
        <div className="flex-1 w-full">
          <MainContent />
        </div>
      </div>
    </DocumentsProvider>
  );
}
