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
      <div className="h-screen flex flex-col bg-white overflow-hidden">
        {/* Full-screen workspace tanpa sidebar */}
        <div className="flex-1 w-full overflow-hidden flex flex-col min-h-0">
          <AssistantWorkspace 
            backButton={
              <Button 
                variant="default" 
                size="sm" 
                onClick={() => router.push("/")} 
                className={cn(
                  "gap-1 btn-gradient transition-all duration-300 ease-in-out h-8 px-3 mr-1",
                  "hover:scale-105 hover:shadow-lg active:scale-95 hover:-translate-x-1 group"
                )}
              >
                <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-x-1" /> 
                <span className="hidden sm:inline">Back</span>
              </Button>
            }
          />
        </div>
      </div>
    </DocumentsProvider>
  );
}
