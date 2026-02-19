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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only peer"
      />
      <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/30 rounded-full peer after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-background after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full peer-checked:bg-primary border border-border" />
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
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="min-h-screen bg-figma-auth">
      <div className="border-b border-border bg-card/70 glass soft-shadow">
        <div className="flex h-14 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3">
            <Button
              variant="default"
              size="sm"
              onClick={() => router.back()}
              className="btn-figma transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-lg active:scale-95 hover:-translate-x-0.5 group"
            >
              <ArrowLeft className="h-4 w-4 mr-2 transition-transform duration-300 group-hover:-translate-x-1" />
              {t("settings.back")}
            </Button>
            <h1 className="text-lg font-semibold text-white">{t("settings.title")}</h1>
          </div>
          <Button
            variant="default"
            size="sm"
            onClick={handleSave}
            className="btn-figma transition-all duration-300 hover:scale-105 active:scale-95"
          >
            <Save className="h-4 w-4 mr-2" />
            {saved ? t("settings.saved") : t("settings.save")}
          </Button>
        </div>
      </div>

      <main className="p-4 md:p-6 flex flex-col md:flex-row gap-6 max-w-6xl mx-auto">
        {/* Menu kiri - gaya sama dengan sidebar dashboard */}
        <nav className="md:w-56 shrink-0 space-y-2">
          {MENU_IDS.map((id) => {
            const Icon = MENU_ICONS[id];
            const active = activeMenu === id;
            const isClicked = clickedMenuId === id;
            return (
              <Button
                key={id}
                type="button"
                variant={active ? "default" : "ghost"}
                onClick={() => handleMenuClick(id)}
                className={cn(
                  "w-full justify-start gap-2 transition-all duration-300 ease-in-out",
                  active && "btn-gradient",
                  !active && "hover:bg-muted/50 hover:translate-x-1",
                  isClicked && "scale-95"
                )}
              >
                <Icon className={cn(
                  "h-4 w-4 transition-transform duration-300",
                  active && "scale-110",
                  isClicked && "rotate-12"
                )} />
                <span className={cn(
                  "transition-all duration-300",
                  active && "font-semibold"
                )}>
                  {t(`settings.menu.${id}`)}
                </span>
              </Button>
            );
          })}
        </nav>

        {/* Konten kanan */}
        <div className="flex-1 min-w-0">
          {activeMenu === "akun" && (
            <Card className="bg-card/70 glass soft-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="h-5 w-5" />
                  {t("settings.akun.title")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">{t("settings.akun.email")}</p>
                    <p className="text-sm font-medium">{userEmail || "—"}</p>
                  </div>
                </div>
                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => router.push("/forgot-password")}
                  >
                    <Key className="h-4 w-4" />
                    {t("settings.akun.changePassword")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {activeMenu === "notifikasi" && (
            <Card className="bg-card/70 glass soft-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Bell className="h-5 w-5" />
                  {t("settings.notifikasi.title")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{t("settings.notifikasi.email")}</p>
                    <p className="text-xs text-muted-foreground">{t("settings.notifikasi.emailDesc")}</p>
                  </div>
                  <Toggle
                    checked={settings.notifications.email}
                    onChange={(v) => update("notifications", "email", v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{t("settings.notifikasi.push")}</p>
                    <p className="text-xs text-muted-foreground">{t("settings.notifikasi.pushDesc")}</p>
                  </div>
                  <Toggle
                    checked={settings.notifications.push}
                    onChange={(v) => update("notifications", "push", v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{t("settings.notifikasi.weekly")}</p>
                    <p className="text-xs text-muted-foreground">{t("settings.notifikasi.weeklyDesc")}</p>
                  </div>
                  <Toggle
                    checked={settings.notifications.weeklySummary}
                    onChange={(v) => update("notifications", "weeklySummary", v)}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {activeMenu === "privacy" && (
            <Card className="bg-card/70 glass soft-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Shield className="h-5 w-5" />
                  {t("settings.privacy.title")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="font-medium text-sm mb-2">{t("settings.privacy.visibility")}</p>
                  <select
                    value={settings.privacy.profileVisibility}
                    onChange={(e) =>
                      update("privacy", "profileVisibility", e.target.value as Settings["privacy"]["profileVisibility"])
                    }
                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                  >
                    <option value="public">{t("settings.privacy.visibilityPublic")}</option>
                    <option value="private">{t("settings.privacy.visibilityPrivate")}</option>
                    <option value="team">{t("settings.privacy.visibilityTeam")}</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{t("settings.privacy.analytics")}</p>
                    <p className="text-xs text-muted-foreground">{t("settings.privacy.analyticsDesc")}</p>
                  </div>
                  <Toggle
                    checked={settings.privacy.analytics}
                    onChange={(v) => update("privacy", "analytics", v)}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {activeMenu === "tampilan" && (
            <Card className="bg-card/70 glass soft-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Palette className="h-5 w-5" />
                  {t("settings.tampilan.title")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="font-medium text-sm mb-2">{t("settings.tampilan.language")}</p>
                  <select
                    value={settings.appearance.language}
                    onChange={(e) =>
                      update("appearance", "language", e.target.value as Settings["appearance"]["language"])
                    }
                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                  >
                    <option value="id">{t("settings.tampilan.languageId")}</option>
                    <option value="en">{t("settings.tampilan.languageEn")}</option>
                  </select>
                </div>
                <div>
                  <p className="font-medium text-sm mb-2">{t("settings.tampilan.fontSize")}</p>
                  <select
                    value={settings.appearance.fontSize}
                    onChange={(e) =>
                      update("appearance", "fontSize", e.target.value as Settings["appearance"]["fontSize"])
                    }
                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                  >
                    <option value="small">{t("settings.tampilan.fontSmall")}</option>
                    <option value="medium">{t("settings.tampilan.fontMedium")}</option>
                    <option value="large">{t("settings.tampilan.fontLarge")}</option>
                  </select>
                </div>
              </CardContent>
            </Card>
          )}

          {activeMenu === "data" && (
            <Card className="bg-card/70 glass soft-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Database className="h-5 w-5" />
                  {t("settings.data.title")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="font-medium text-sm mb-2">{t("settings.data.exportFormat")}</p>
                  <select
                    value={settings.data.exportFormat}
                    onChange={(e) =>
                      update("data", "exportFormat", e.target.value as Settings["data"]["exportFormat"])
                    }
                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                  >
                    <option value="json">JSON</option>
                    <option value="csv">CSV</option>
                  </select>
                </div>
                <div>
                  <p className="font-medium text-sm mb-2">{t("settings.data.retention")}</p>
                  <select
                    value={settings.data.retentionHint}
                    onChange={(e) => update("data", "retentionHint", e.target.value)}
                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                  >
                    <option value="30days">{t("settings.data.retention30")}</option>
                    <option value="6months">{t("settings.data.retention6m")}</option>
                    <option value="1year">{t("settings.data.retention1y")}</option>
                    <option value="forever">{t("settings.data.retentionForever")}</option>
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("settings.data.retentionHint")}
                  </p>
                </div>
                <div className="pt-2 flex gap-2">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Database className="h-4 w-4" />
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
