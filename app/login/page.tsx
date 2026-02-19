// app/login/page.tsx
"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AuthIllustration } from "@/components/auth-illustration";
import { useLanguage } from "@/components/language-provider";

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();
  const params = useSearchParams();
  const { t } = useLanguage();
  const next = params.get("next") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false); // visual only
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Jika sudah login → redirect
  useEffect(() => {
    let mounted = true;
    
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (mounted && data.user) {
          console.log('User already logged in, redirecting to:', next);
          router.replace(next);
          router.refresh();
        }
      } catch (error) {
        console.error('Auth check error:', error);
      }
    })();
    
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Kosongkan field saat mount untuk mengurangi autofill
  useEffect(() => {
    setEmail("");
    setPassword("");
    
    // Cek apakah ada parameter verified dari email verification
    const verified = params.get("verified");
    if (verified === "true") {
      setSuccess("Email berhasil diverifikasi! Silakan login dengan email dan password Anda.");
      // Hilangkan notifikasi setelah 3 detik
      setTimeout(() => setSuccess(null), 3000);
    }
    
  }, [params]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      router.replace(next);
      router.refresh();
    } catch (e: any) {
      setErr(e.message || "Login gagal");
      // Hilangkan notifikasi error setelah 3 detik
      setTimeout(() => setErr(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        queryParams: {
          // opsional agar selalu dapat refresh_token
          access_type: "offline",
          prompt: "consent",
        },
      },
    });
  };
  

  return (
    <main className="min-h-screen grid grid-cols-1 md:grid-cols-2 bg-figma-auth text-white">
      <AuthIllustration />

      {/* Kanan: form */}
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <h1 className="text-3xl font-semibold text-center mb-8 text-white">{t("login.title")}</h1>

          <form onSubmit={onSubmit} className="space-y-4" autoComplete="off">
            {/* autofill trap */}
            <input type="text" name="username" autoComplete="username" className="hidden" aria-hidden="true" tabIndex={-1} />
            <input type="password" name="password" autoComplete="current-password" className="hidden" aria-hidden="true" tabIndex={-1} />

            <div className="space-y-1">
              <label className="text-sm">{t("login.email")}</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email"
                name="login_email"
                autoComplete="off"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm">{t("login.password")}</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="password"
                  name="login_password"
                  autoComplete="off"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                  aria-label="toggle password"
                >
                  {showPw ? "🙈" : "👁️"}
                </button>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="accent-primary"
                  />
                  {t("login.remember")}
                </label>

                <button
                  type="button"
                  className="text-xs text-gradient hover:underline"
                  onClick={() => router.push("/forgot-password")}
                >
                  {t("login.forgotPassword")}
                </button>
              </div>
            </div>

            {err && (
              <div className="text-sm text-red-500 border border-red-500/30 bg-red-500/10 rounded-md px-3 py-2">
                {err}
              </div>
            )}
            {success && (
              <div className="text-sm text-emerald-500 border border-emerald-500/30 bg-emerald-500/10 rounded-md px-3 py-2">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md btn-figma py-2 text-sm font-medium transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-lg active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  {t("login.signingIn")}
                </span>
              ) : (
                t("login.submit")
              )}
            </button>

            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-xs text-muted-foreground">
              <div className="h-px bg-border" />
              <span>{t("login.or")}</span>
              <div className="h-px bg-border" />
            </div>

            <button
              type="button"
              onClick={loginWithGoogle}
              className="w-full rounded-md border border-border bg-background py-2 text-sm transition-all duration-300 ease-in-out hover:bg-muted/40 hover:scale-105 hover:shadow-md active:scale-95"
            >
              <span className="inline-flex items-center gap-2">
                <Image src="/g.png" alt="Google" width={18} height={18} className="transition-transform duration-300 hover:rotate-12" />
                {t("login.google")}
              </span>
            </button>
          </form>

          <p className="text-xs text-muted-foreground mt-6 text-center">
            {t("login.noAccount")}{" "}
            <a className="text-gradient hover:underline" href={`/register?next=${encodeURIComponent(next)}`}>
              {t("login.createAccount")}
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
