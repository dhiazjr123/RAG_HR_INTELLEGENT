// app/assistant/page.tsx
"use client";

import { Header } from "@/components/header";
import Sidebar from "@/components/sidebar";
import { DocumentsProvider } from "@/components/documents-context";
import AssistantWorkspace from "@/components/assistant-workspace"; // ⬅️ default import

export default function AssistantPage() {
  return (
    <DocumentsProvider>
      <div className="min-h-screen bg-white flex flex-col">
        <Header />
        <div className="flex-1 w-full">
          <AssistantWorkspace />
        </div>
      </div>
    </DocumentsProvider>
  );
}
