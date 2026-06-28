"use client";

import { Briefcase, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LoginIntent } from "@/lib/auth/roles";

type Props = {
  value: LoginIntent;
  onChange: (role: LoginIntent) => void;
};

const ROLES: {
  id: LoginIntent;
  label: string;
  description: string;
  icon: typeof Briefcase;
  pillClass: string;
  btnClass: string;
  descClass: string;
  iconAccent: string;
}[] = [
  {
    id: "hr",
    label: "Login sebagai HR",
    description: "Akses AI Assistant untuk screening CV kandidat",
    icon: Briefcase,
    pillClass: "login-role-pill-hr",
    btnClass: "login-role-btn-hr",
    descClass: "login-role-desc-hr",
    iconAccent: "text-[#2f6bff]",
  },
  {
    id: "admin",
    label: "Login sebagai Admin",
    description: "Akses dashboard kelola JD & kriteria rekrutmen",
    icon: ShieldCheck,
    pillClass: "login-role-pill-admin",
    btnClass: "login-role-btn-admin",
    descClass: "login-role-desc-admin",
    iconAccent: "text-[#4d88ff]",
  },
];

export function LoginRoleSelector({ value, onChange }: Props) {
  const activeIndex = value === "admin" ? 1 : 0;
  const activeRole = ROLES[activeIndex];
  const activeMeta = ROLES[activeIndex];

  return (
    <div className="mb-6 space-y-3">
      <div
        className="relative grid grid-cols-2 gap-1.5 p-1.5 rounded-xl border border-white/10 bg-black/25 backdrop-blur-md shadow-inner"
        role="tablist"
        aria-label="Pilih peran login"
      >
        {/* Sliding pill — gradasi putih-biru sesuai role (sama gaya btn-figma) */}
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute top-1.5 bottom-1.5 rounded-lg transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
            activeMeta.pillClass
          )}
          style={{
            width: "calc(50% - 0.375rem)",
            left: activeIndex === 0 ? "0.375rem" : "calc(50% + 0.1875rem)",
          }}
        />

        {ROLES.map((role) => {
          const Icon = role.icon;
          const selected = value === role.id;

          return (
            <button
              key={role.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onChange(role.id)}
              className={cn(
                "relative z-10 flex flex-col items-center justify-center gap-1.5 rounded-lg px-3 py-3 text-sm font-medium",
                role.btnClass,
                "transition-all duration-300 ease-out",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6fb7ff]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
                "active:scale-[0.97]",
                selected
                  ? "text-[#0b1533] scale-[1.02] font-semibold"
                  : "text-muted-foreground hover:text-foreground/90"
              )}
            >
              <span
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full transition-all duration-300",
                  selected
                    ? "bg-[#0b1533]/12 scale-110 ring-1 ring-[#0b1533]/10"
                    : "bg-white/5 border border-white/5"
                )}
              >
                <Icon
                  className={cn(
                    "h-[18px] w-[18px] transition-all duration-300",
                    selected ? "scale-110 text-[#0b1533]" : cn("opacity-75", role.iconAccent)
                  )}
                  strokeWidth={selected ? 2.25 : 2}
                />
              </span>
              <span className="leading-tight text-center">{role.label}</span>
            </button>
          );
        })}
      </div>

      {/* Deskripsi — border & bg gradasi mengikuti role aktif */}
      <div
        key={activeRole.id}
        className={cn(
          "login-role-desc-enter min-h-[2.5rem] flex items-center justify-center gap-2 rounded-lg border px-3 py-2",
          activeMeta.descClass
        )}
      >
        {(() => {
          const Icon = activeRole.icon;
          return (
            <>
              <Icon className={cn("h-3.5 w-3.5 shrink-0", activeMeta.iconAccent)} aria-hidden />
              <p className="text-xs text-center text-muted-foreground">{activeRole.description}</p>
            </>
          );
        })()}
      </div>
    </div>
  );
}
