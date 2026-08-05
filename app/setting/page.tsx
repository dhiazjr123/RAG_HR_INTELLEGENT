"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  ArrowLeft,
  User,
  Bell,
  Shield,
  Palette,
  Database,
  Save,
  Key,
  Mail,
  Check,
  Sparkles,
  Info,
  Download,
  AlertCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/language-provider";
import { SETTINGS_SAVED_EVENT } from "@/lib/i18n";

const SETTINGS_STORAGE_KEY = "rag_user_settings";

type Settings = {
  notifications: {
    email: boolean;
    push: boolean;
    weeklySummary: boolean;
  };
  privacy: {
    profileVisibility: "public" | "private" | "team";
    analytics: boolean;
  };
  appearance: {
    language: "id" | "en";
    fontSize: "small" | "medium" | "large";
  };
  data: {
    exportFormat: "json" | "csv";
    retentionHint: string;
  };
};

const defaultSettings: Settings = {
  notifications: {
    email: true,
    push: false,
    weeklySummary: true,
  },
  privacy: {
    profileVisibility: "team",
    analytics: true,
  },
  appearance: {
    language: "id",
    fontSize: "medium",
  },
  data: {
    exportFormat: "json",
    retentionHint: "1year",
  },
};

function loadStoredSettings(): Settings {
  if (typeof window === "undefined") return defaultSettings;
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return defaultSettings;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      notifications: { ...defaultSettings.notifications, ...parsed.notifications },
      privacy: { ...defaultSettings.privacy, ...parsed.privacy },
      appearance: { ...defaultSettings.appearance, ...parsed.appearance },
      data: { ...defaultSettings.data, ...parsed.data },
    };
  } catch {
    return defaultSettings;
  }
}

function saveSettings(s: Settings) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(s));
  } catch (e) {
    console.warn("Gagal menyimpan pengaturan:", e);
  }
}

type MenuId = "akun" | "notifikasi" | "privacy" | "tampilan" | "data";

const MENU_IDS: MenuId[] = ["akun", "notifikasi", "privacy", "tampilan", "data"];
const MENU_ICONS = { akun: User, notifikasi: Bell, privacy: Shield, tampilan: Palette, data: Database };

const MENU_COLORS = {
  akun: "text-blue-400 border-blue-500/20 bg-blue-500/10 hover:bg-blue-500/20",
  notifikasi: "text-rose-400 border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20",
  privacy: "text-emerald-400 border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/20",
  tampilan: "text-purple-400 border-purple-500/20 bg-purple-500/10 hover:bg-purple-500/20",
  data: "text-amber-400 border-amber-500/20 bg-amber-500/10 hover:bg-amber-500/20",
};

const MENU_BUBBLES = {
  akun: "bg-blue-500",
  notifikasi: "bg-rose-500",
  privacy: "bg-emerald-500",
  tampilan: "bg-purple-500",
  data: "bg-amber-500",
};

function Toggle({
  checked,
  onChange,
  color = "peer-checked:bg-primary"
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  color?: string;
}) {
  return (
    <label className="relative inline-flex items-center cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only peer"
      />
      <div className={cn(
        "w-11 h-6 bg-muted/60 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/20 rounded-full peer transition-all duration-300",
        "after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-background after:border after:border-border after:rounded-full after:h-5 after:w-5 after:transition-all after:shadow-sm",
        checked ? "after:translate-x-full" : "",
        color
      )} />
    </label>
  );
}

export default function SettingPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [activeMenu, setActiveMenu] = useState<MenuId>("akun");
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [userEmail, setUserEmail] = useState<string>("");
  const [saved, setSaved] = useState(false);
  const [clickedMenuId, setClickedMenuId] = useState<MenuId | null>(null);
  
  // Interactive notifications state
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const handleMenuClick = (id: MenuId) => {
    setActiveMenu(id);
    setClickedMenuId(id);
    setTimeout(() => setClickedMenuId(null), 300);
  };

  useEffect(() => {
    setSettings(loadStoredSettings());
  }, []);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      setUserEmail(data.user?.email ?? "");
    })();
  }, []);

  const update = <K extends keyof Settings>(
    category: K,
    key: keyof Settings[K],
    value: Settings[K][keyof Settings[K]]
  ) => {
    setSettings((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value,
      },
    }));
  };

  const handleSave = () => {
    saveSettings(settings);
    if (typeof window !== "undefined") window.dispatchEvent(new Event(SETTINGS_SAVED_EVENT));
    setSaved(true);
    triggerToast("Pengaturan berhasil disimpan!");
    setTimeout(() => setSaved(false), 2000);
  };

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleExportData = () => {
    const rawData = JSON.stringify(settings, null, 2);
    const blob = new Blob([rawData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `user_settings_backup.${settings.data.exportFormat}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    triggerToast(`Data profil berhasil diekspor sebagai ${settings.data.exportFormat.toUpperCase()}!`);
  };

  return (
    <div className="min-h-screen bg-figma-auth relative pb-12 overflow-hidden">
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-1/4 left-10 w-96 h-96 bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Floating In-App Interactive Notification Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-[99] max-w-sm bg-card/90 border border-border/80 backdrop-blur-md rounded-xl p-4 soft-shadow flex items-center gap-3 animate-fade-in border-l-primary border-l-4">
          <Sparkles className="h-5 w-5 text-primary animate-pulse" />
          <p className="text-xs font-semibold text-white">{toastMsg}</p>
        </div>
      )}

      {/* Header */}
      <div className="border-b border-border bg-card/70 glass soft-shadow sticky top-0 z-[70]">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Button
              variant="default"
              size="sm"
              onClick={() => router.back()}
              className="ring-ambient btn-gradient transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-lg active:scale-95 hover:-translate-x-1 group"
            >
              <ArrowLeft className="h-4 w-4 mr-2 transition-transform duration-300 group-hover:-translate-x-1" />
              {t("settings.back")}
            </Button>
            <h1 className="text-xl font-semibold text-gradient">{t("settings.title")}</h1>
          </div>
          <Button
            variant="default"
            size="sm"
            onClick={handleSave}
            className="ring-ambient btn-gradient transition-all duration-300 hover:scale-105 hover:shadow-lg active:scale-95 group"
          >
            <Save className="h-4 w-4 mr-2 transition-transform duration-300 group-hover:scale-110" />
            {saved ? t("settings.saved") : t("settings.save")}
          </Button>
        </div>
      </div>

      <main className="p-6 flex flex-col md:flex-row gap-6 max-w-5xl mx-auto relative">
        
        {/* LEFT: Sidebar Navigation */}
        <nav className="md:w-60 shrink-0 space-y-2.5">
          {MENU_IDS.map((id) => {
            const Icon = MENU_ICONS[id];
            const active = activeMenu === id;
            const isClicked = clickedMenuId === id;
            const activeColorClass = MENU_COLORS[id];
            
            return (
              <Button
                key={id}
                type="button"
                variant={active ? "default" : "ghost"}
                onClick={() => handleMenuClick(id)}
                className={cn(
                  "w-full justify-start gap-3 transition-all duration-300 ease-in-out h-11 rounded-xl px-4",
                  active && "btn-gradient shadow-md",
                  !active && "hover:bg-muted/40 hover:translate-x-1 hover:text-foreground",
                  isClicked && "scale-95"
                )}
              >
                <div className={cn(
                  "p-1.5 rounded-lg transition-colors duration-300 shrink-0",
                  active ? "bg-white/20 text-white" : "bg-muted/30 text-muted-foreground"
                )}>
                  <Icon className={cn(
                    "h-4 w-4 transition-transform duration-300",
                    active && "scale-110",
                    isClicked && "rotate-12"
                  )} />
                </div>
                <span className={cn(
                  "transition-all duration-300 text-sm",
                  active && "font-semibold text-white",
                  !active && "text-muted-foreground"
                )}>
                  {t(`settings.menu.${id}`)}
                </span>
              </Button>
            );
          })}
        </nav>

        {/* RIGHT: Active Config Panel */}
        <div className="flex-1 min-w-0">
          
          {/* Akun */}
          {activeMenu === "akun" && (
            <Card className="bg-card/70 glass border border-border/60 soft-shadow overflow-hidden transition-all duration-500 border-l-blue-500 border-l-2">
              <CardHeader className="pb-3 border-b border-border/40">
                <CardTitle className="flex items-center gap-2.5 text-base text-white">
                  <User className="h-5 w-5 text-blue-400" />
                  {t("settings.akun.title")}
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">Kelola kredensial dan kata sandi login akun Anda.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-5">
                <div className="flex items-center gap-3.5 p-3.5 rounded-xl border border-border/50 bg-muted/10">
                  <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">{t("settings.akun.email")}</p>
                    <p className="text-sm font-semibold text-white mt-0.5">{userEmail || "—"}</p>
                  </div>
                </div>
                <div className="pt-2">
                  <Button
                    onClick={() => router.push("/forgot-password")}
                    className="btn-figma border-0 text-white gap-2 rounded-xl transition-all duration-300 shadow-md font-semibold px-4 py-2 h-9 text-xs active:scale-98"
                  >
                    <Key className="h-3.5 w-3.5" />
                    {t("settings.akun.changePassword")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notifikasi */}
          {activeMenu === "notifikasi" && (
            <Card className="bg-card/70 glass border border-border/60 soft-shadow overflow-hidden transition-all duration-500 border-l-rose-500 border-l-2">
              <CardHeader className="pb-3 border-b border-border/40">
                <CardTitle className="flex items-center gap-2.5 text-base text-white">
                  <Bell className="h-5 w-5 text-rose-400" />
                  {t("settings.notifikasi.title")}
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">Kustomisasi bagaimana dan kapan Anda menerima notifikasi.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 pt-5">
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/40 bg-muted/5 transition-all hover:bg-muted/10">
                  <div className="max-w-[75%]">
                    <p className="font-semibold text-sm text-white">{t("settings.notifikasi.email")}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t("settings.notifikasi.emailDesc")}</p>
                  </div>
                  <Toggle
                    checked={settings.notifications.email}
                    onChange={(v) => update("notifications", "email", v)}
                    color="peer-checked:bg-rose-500"
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/40 bg-muted/5 transition-all hover:bg-muted/10">
                  <div className="max-w-[75%]">
                    <p className="font-semibold text-sm text-white">{t("settings.notifikasi.push")}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t("settings.notifikasi.pushDesc")}</p>
                  </div>
                  <Toggle
                    checked={settings.notifications.push}
                    onChange={(v) => update("notifications", "push", v)}
                    color="peer-checked:bg-rose-500"
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/40 bg-muted/5 transition-all hover:bg-muted/10">
                  <div className="max-w-[75%]">
                    <p className="font-semibold text-sm text-white">{t("settings.notifikasi.weekly")}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t("settings.notifikasi.weeklyDesc")}</p>
                  </div>
                  <Toggle
                    checked={settings.notifications.weeklySummary}
                    onChange={(v) => update("notifications", "weeklySummary", v)}
                    color="peer-checked:bg-rose-500"
                  />
                </div>

                <hr className="border-border/60" />

                {/* Interactive Toast Tester */}
                <div className="flex items-center justify-between bg-rose-500/5 border border-rose-500/20 p-4 rounded-xl">
                  <div className="flex items-start gap-3">
                    <Info className="h-4.5 w-4.5 text-rose-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-white">Uji Sistem Notifikasi</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Kirim notifikasi simulasi untuk memicu toast interaktif.</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => triggerToast("🔔 Notifikasi simulasi: Selamat! Sistem notifikasi aktif.")}
                    className="rounded-lg h-8 text-xs text-rose-300 border-rose-500/30 hover:bg-rose-500/10"
                  >
                    Kirim Test
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Privasi & Keamanan */}
          {activeMenu === "privacy" && (
            <Card className="bg-card/70 glass border border-border/60 soft-shadow overflow-hidden transition-all duration-500 border-l-emerald-500 border-l-2">
              <CardHeader className="pb-3 border-b border-border/40">
                <CardTitle className="flex items-center gap-2.5 text-base text-white">
                  <Shield className="h-5 w-5 text-emerald-400" />
                  {t("settings.privacy.title")}
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">Kelola visibilitas profil kerja Anda dan data telemetri analitik.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-5">
                <div>
                  <p className="font-semibold text-sm mb-3 text-white">{t("settings.privacy.visibility")}</p>
                  
                  {/* Premium Profile Visibility Card Selector */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { val: "public", label: t("settings.privacy.visibilityPublic"), desc: "Semua orang di platform dapat melihat profil." },
                      { val: "private", label: t("settings.privacy.visibilityPrivate"), desc: "Hanya Anda yang dapat melihat profil." },
                      { val: "team", label: t("settings.privacy.visibilityTeam"), desc: "Hanya anggota tim yang dapat melihat." }
                    ].map((item) => {
                      const isSelected = settings.privacy.profileVisibility === item.val;
                      return (
                        <button
                          key={item.val}
                          type="button"
                          onClick={() => update("privacy", "profileVisibility", item.val as Settings["privacy"]["profileVisibility"])}
                          className={cn(
                            "p-3.5 rounded-xl border-2 text-left transition-all duration-300 relative flex flex-col justify-between h-24 overflow-hidden",
                            isSelected ? "border-emerald-500 bg-emerald-500/10" : "border-border/60 bg-muted/10 hover:bg-muted/20"
                          )}
                        >
                          <span className="font-bold text-xs text-white tracking-wide">{item.label}</span>
                          <span className="text-[10px] text-muted-foreground leading-normal mt-1">{item.desc}</span>
                          {isSelected && (
                            <div className="absolute top-2.5 right-2.5 h-4.5 w-4.5 rounded-full bg-emerald-500 flex items-center justify-center">
                              <Check className="h-3 w-3 text-white" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/40 bg-muted/5 transition-all hover:bg-muted/10">
                  <div className="max-w-[75%]">
                    <p className="font-semibold text-sm text-white">{t("settings.privacy.analytics")}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t("settings.privacy.analyticsDesc")}</p>
                  </div>
                  <Toggle
                    checked={settings.privacy.analytics}
                    onChange={(v) => update("privacy", "analytics", v)}
                    color="peer-checked:bg-emerald-500"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tampilan */}
          {activeMenu === "tampilan" && (
            <Card className="bg-card/70 glass border border-border/60 soft-shadow overflow-hidden transition-all duration-500 border-l-purple-500 border-l-2">
              <CardHeader className="pb-3 border-b border-border/40">
                <CardTitle className="flex items-center gap-2.5 text-base text-white">
                  <Palette className="h-5 w-5 text-purple-400" />
                  {t("settings.tampilan.title")}
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">Sesuaikan bahasa antarmuka dan ukuran huruf aplikasi.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-5">
                <div>
                  <p className="font-semibold text-sm mb-3 text-white">{t("settings.tampilan.language")}</p>
                  
                  {/* Premium Language Card Selector */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { val: "id", label: t("settings.tampilan.languageId"), sub: "Bahasa Indonesia", flag: "🇮🇩" },
                      { val: "en", label: t("settings.tampilan.languageEn"), sub: "English (US)", flag: "🇺🇸" }
                    ].map((item) => {
                      const isSelected = settings.appearance.language === item.val;
                      return (
                        <button
                          key={item.val}
                          type="button"
                          onClick={() => update("appearance", "language", item.val as Settings["appearance"]["language"])}
                          className={cn(
                            "p-3.5 rounded-xl border-2 text-left transition-all duration-300 relative flex items-center gap-3 overflow-hidden",
                            isSelected ? "border-purple-500 bg-purple-500/10" : "border-border/60 bg-muted/10 hover:bg-muted/20"
                          )}
                        >
                          <span className="text-2xl select-none">{item.flag}</span>
                          <div>
                            <p className="font-bold text-xs text-white tracking-wide">{item.label}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{item.sub}</p>
                          </div>
                          {isSelected && (
                            <div className="absolute top-2.5 right-2.5 h-4.5 w-4.5 rounded-full bg-purple-500 flex items-center justify-center">
                              <Check className="h-3 w-3 text-white" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="font-semibold text-sm mb-3 text-white">{t("settings.tampilan.fontSize")}</p>
                  
                  {/* Premium Font Size Card Selector */}
                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      { val: "small", label: t("settings.tampilan.fontSmall"), scale: "text-xs" },
                      { val: "medium", label: t("settings.tampilan.fontMedium"), scale: "text-sm" },
                      { val: "large", label: t("settings.tampilan.fontLarge"), scale: "text-base" }
                    ].map((item) => {
                      const isSelected = settings.appearance.fontSize === item.val;
                      return (
                        <button
                          key={item.val}
                          type="button"
                          onClick={() => update("appearance", "fontSize", item.val as Settings["appearance"]["fontSize"])}
                          className={cn(
                            "p-3 rounded-xl border-2 text-center transition-all duration-300 relative overflow-hidden",
                            isSelected ? "border-purple-500 bg-purple-500/10" : "border-border/60 bg-muted/10 hover:bg-muted/20"
                          )}
                        >
                          <span className={cn("font-semibold block text-xs text-white", item.scale)}>{item.label}</span>
                          {isSelected && (
                            <div className="absolute top-2 right-2 h-3.5 w-3.5 rounded-full bg-purple-500 flex items-center justify-center">
                              <Check className="h-2 w-2 text-white" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <hr className="border-border/60" />

                {/* Interactive Dynamic Layout Live Preview */}
                <div className="border border-purple-500/20 bg-purple-500/5 p-4 rounded-xl">
                  <p className="text-xs font-bold text-white mb-2 flex items-center gap-1">
                    <Sparkles className="h-4 w-4 text-purple-400" />
                    Pratinjau Langsung (Live Preview)
                  </p>
                  <div className="bg-background/80 rounded-lg p-3 border border-border/80">
                    <p className={cn(
                      "transition-all duration-300 font-medium",
                      settings.appearance.fontSize === "small" && "text-xs",
                      settings.appearance.fontSize === "medium" && "text-sm",
                      settings.appearance.fontSize === "large" && "text-base",
                      "text-foreground"
                    )}>
                      {settings.appearance.language === "id" 
                        ? "Ini adalah contoh teks pratinjau yang disesuaikan." 
                        : "This is a sample live preview text representing the selected style."}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {settings.appearance.language === "id" ? "Bahasa: Indonesia" : "Language: English"} | 
                      {settings.appearance.language === "id" ? " Ukuran: " : " Size: "} 
                      {settings.appearance.fontSize === "small" ? (settings.appearance.language === "id" ? "Kecil" : "Small") :
                       settings.appearance.fontSize === "medium" ? (settings.appearance.language === "id" ? "Sedang" : "Medium") :
                       (settings.appearance.language === "id" ? "Besar" : "Large")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Data & Dokumen */}
          {activeMenu === "data" && (
            <Card className="bg-card/70 glass border border-border/60 soft-shadow overflow-hidden transition-all duration-500 border-l-amber-500 border-l-2">
              <CardHeader className="pb-3 border-b border-border/40">
                <CardTitle className="flex items-center gap-2.5 text-base text-white">
                  <Database className="h-5 w-5 text-amber-400" />
                  {t("settings.data.title")}
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">Kelola siklus hidup berkas CV terunggah dan cadangan pengaturan RAG.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-5">
                <div>
                  <p className="font-semibold text-sm mb-3 text-white">{t("settings.data.exportFormat")}</p>
                  
                  {/* Premium Export Format Card Selector */}
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { val: "json", label: "JSON Backup", desc: "Format standard pencadangan data terenkripsi." },
                      { val: "csv", label: "CSV Table", desc: "Format tabel spreadsheet untuk olah data mandiri." }
                    ].map((item) => {
                      const isSelected = settings.data.exportFormat === item.val;
                      return (
                        <button
                          key={item.val}
                          type="button"
                          onClick={() => update("data", "exportFormat", item.val as Settings["data"]["exportFormat"])}
                          className={cn(
                            "p-3.5 rounded-xl border-2 text-left transition-all duration-300 relative flex flex-col justify-between h-20 overflow-hidden",
                            isSelected ? "border-amber-500 bg-amber-500/10" : "border-border/60 bg-muted/10 hover:bg-muted/20"
                          )}
                        >
                          <span className="font-bold text-xs text-white tracking-wide">{item.label}</span>
                          <span className="text-[10px] text-muted-foreground mt-1">{item.desc}</span>
                          {isSelected && (
                            <div className="absolute top-2.5 right-2.5 h-4.5 w-4.5 rounded-full bg-amber-500 flex items-center justify-center">
                              <Check className="h-3 w-3 text-white" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="font-semibold text-sm mb-2 text-white">{t("settings.data.retention")}</p>
                  <select
                    value={settings.data.retentionHint}
                    onChange={(e) => update("data", "retentionHint", e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-border/80 bg-background/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="30days">{t("settings.data.retention30")}</option>
                    <option value="6months">{t("settings.data.retention6m")}</option>
                    <option value="1year">{t("settings.data.retention1y")}</option>
                    <option value="forever">{t("settings.data.retentionForever")}</option>
                  </select>
                  <p className="text-[10px] text-muted-foreground mt-1.5 flex items-start gap-1.5 leading-normal">
                    <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                    {t("settings.data.retentionHint")}
                  </p>
                </div>

                <hr className="border-border/60" />

                {/* Premium Interactive Data Export Button */}
                <div className="pt-1 flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleExportData}
                    className="gap-2 rounded-xl transition-all duration-300 hover:bg-amber-500/10 hover:border-amber-500/40 hover:text-amber-300"
                  >
                    <Download className="h-4 w-4 text-amber-400" />
                    {t("settings.data.export")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

        </div>
      </main>
    </div>
  );
}
