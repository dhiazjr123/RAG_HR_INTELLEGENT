"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function SettingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-figma-auth">
      <main className="p-4 md:p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Button
            variant="default"
            size="sm"
            onClick={() => router.back()}
            className="btn-gradient transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-lg active:scale-95 hover:-translate-x-1 group"
          >
            <ArrowLeft className="h-4 w-4 mr-2 transition-transform duration-300 group-hover:-translate-x-1" />
            Back
          </Button>
          <h1 className="text-lg font-semibold">Setting</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="bg-card/70 glass soft-shadow lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Preferensi</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-muted-foreground">Tema</div>
                  <div className="text-sm">Mengikuti sistem</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Bahasa</div>
                  <div className="text-sm">Indonesia</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Notifikasi</div>
                  <div className="text-sm">Email</div>
                </div>
              </div>
              <div className="mt-4">
                <Button size="sm" variant="outline">Simpan Preferensi</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/70 glass soft-shadow lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Integrasi</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Koneksi Akun</div>
                  <div className="text-sm">Supabase (aktif)</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Mode</div>
                  <div className="text-sm">RAG Document AI</div>
                </div>
              </div>
              <div className="mt-4">
                <Button size="sm" className="btn-gradient">Kelola Integrasi</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}


