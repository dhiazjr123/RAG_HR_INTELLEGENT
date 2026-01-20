// app/documents/page.tsx
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { DocumentsProvider } from "@/components/documents-context";
import { Header } from "@/components/header";
import Sidebar from "@/components/sidebar";
import { DocumentsManager } from "@/components/documents-manager";

export default async function DocumentsPage() {
  try {
    const supabase = createServerSupabase();
    const { data, error } = await supabase.auth.getUser();
    
    if (error || !data?.user) {
      redirect("/login?next=/documents");
    }
  } catch (error) {
    redirect("/login?next=/documents");
  }

  return (
    <DocumentsProvider>
      <div className="min-h-screen bg-figma-auth">
        <Header />
        <div className="flex">
          <Sidebar />
          <DocumentsManager />
        </div>
      </div>
    </DocumentsProvider>
  );
}

