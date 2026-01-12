// app/assistant-workspace/page.tsx
"use client";

import { DocumentsProvider } from "@/components/documents-context";
import AssistantWorkspace from "@/components/assistant-workspace";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export default function AssistantWorkspacePage() {
  const router = useRouter();
  return (
    <DocumentsProvider>
      <div className="min-h-screen page-gradient">
        {/* Bar aksi */}
        <div className="w-full px-4 md:px-6 pt-3">
          <Button 
            variant="default" 
            size="sm" 
            onClick={() => router.push("/")} 
            className={cn(
              "gap-2 btn-gradient transition-all duration-300 ease-in-out",
              "hover:scale-105 hover:shadow-lg active:scale-95 hover:-translate-x-1 group"
            )}
          >
            <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1" /> 
            Back
          </Button>
        </div>
        {/* Full-screen workspace tanpa sidebar */}
        <div className="w-full">
          <AssistantWorkspace />
        </div>
      </div>
    </DocumentsProvider>
  );
}
