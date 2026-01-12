// app/assistant/page.tsx
"use client";

import { Header } from "@/components/header";
import Sidebar from "@/components/sidebar";
import { DocumentsProvider } from "@/components/documents-context";
import AssistantWorkspace from "@/components/assistant-workspace"; // ⬅️ default import

export default function AssistantPage() {
  return (
    <DocumentsProvider>
      <div className="min-h-screen page-gradient">
        <Header />
        <div className="flex">
          <Sidebar />
          <AssistantWorkspace />
        </div>
      </div>
    </DocumentsProvider>
  );
}
