// app/reset-password/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const supabase = createClient();
  const router = useRouter();

  const [phase, setPhase] = useState<"checking" | "form" | "done">("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 1) Tangkap token dari URL dan buat session sementara
  useEffect(() => {
    (async () => {
      try {
        setErr(null);

        // a) Coba token di hash: #access_token=...&refresh_token=...&type=recovery
        const hash = window.location.hash?.replace(/^#/, "");
        const hparams = new URLSearchParams(hash);
        const access_token = hparams.get("access_token");
        const refresh_token = hparams.get("refresh_token");

        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          if (error) throw error;

          // bersihkan hash dari URL
          window.history.replaceState({}, "", window.location.pathname);
          setPhase("form");
          return;
        }

        // b) Coba code di query: ?code=...
        const q = new URLSearchParams(window.location.search);
        const code = q.get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;

          // bersihkan query
          window.history.replaceState({}, "", window.location.pathname);
          setPhase("form");
          return;
        }

        // c) Jika sudah ada session aktif, langsung tampilkan form
        const { data: s } = await supabase.auth.getSession();
        if (s.session) {
          setPhase("form");
          return;
        }

        // Tidak ada token/sesi -> link tidak valid
        setErr("Tautan reset tidak valid atau sudah kedaluwarsa.");
      } catch (e: any) {
        setErr(e.message || "Gagal memproses tautan reset.");
      } finally {
        if (phase === "checking") setPhase("form"); // supaya tetap render
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2) Submit password baru
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);

    if (!password || password.length < 6) {
      setErr("Password minimal 6 karakter.");
      return;
    }
    if (password !== confirm) {
      setErr("Konfirmasi password tidak sama.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      // Opsional: logout agar user login ulang dengan password baru
      await supabase.auth.signOut();
      setPhase("done");

      // redirect ke login
      setTimeout(() => router.replace("/login"), 1200);
    } catch (e: any) {
      setErr(e.message || "Gagal menyimpan password baru.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen grid place-items-center p-6">
      <div className="w-full max-w-md rounded-xl border border-border bg-card/60 p-6 shadow-sm">
        <h1 className="text-xl font-semibold mb-2">Save new password</h1>
        <p className="text-sm text-muted-foreground mb-4">
          Masukkan password baru Anda.
        </p>

        {err && (
          <div className="mb-3 text-sm text-red-500 border border-red-500/30 bg-red-500/10 rounded-md px-3 py-2">
            {err}
          </div>
        )}

        {phase !== "done" ? (
          <form onSubmit={onSubmit} className="space-y-3">
            <div>
              <label className="text-sm">Password baru</label>
              <input
                type="password"
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="password baru"
                autoComplete="new-password"
                required
              />
            </div>
            <div>
              <label className="text-sm">Konfirmasi password</label>
              <input
                type="password"
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="ulangi password"
                autoComplete="new-password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-foreground text-background py-2 text-sm font-medium hover:opacity-90 disabled:opacity-60"
            >
              {loading ? "Saving..." : "Save Password"}
            </button>
          </form>
        ) : (
          <div className="text-sm text-emerald-600">
            Password berhasil diubah. Mengarahkan ke halaman login…
          </div>
        )}
      </div>
    </main>
  );
}
