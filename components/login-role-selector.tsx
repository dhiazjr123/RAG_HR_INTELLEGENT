"use client";

import { Briefcase, ShieldCheck, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LoginIntent } from "@/lib/auth/roles";

type Props = {
  value: LoginIntent;
  onChange: (role: LoginIntent) => void;
  isRegister?: boolean;
};

const ROLES: {
  id: LoginIntent;
  shortLabel: string;
  description: string;
  icon: typeof Briefcase;
  pillClass: string;
  btnClass: string;
  descClass: string;
  iconAccent: string;
}[] = [
  {
    id: "hr",
    shortLabel: "HR",
    description: "Akses AI Assistant untuk screening CV kandidat",
    icon: Briefcase,
    pillClass: "login-role-pill-hr",
    btnClass: "login-role-btn-hr",
    descClass: "login-role-desc-hr",
    iconAccent: "text-[#2f6bff]",
  },
  {
    id: "admin",
    shortLabel: "Admin",
    description: "Akses dashboard kelola JD & kriteria rekrutmen",
    icon: ShieldCheck,
    pillClass: "login-role-pill-admin",
    btnClass: "login-role-btn-admin",
    descClass: "login-role-desc-admin",
    iconAccent: "text-[#4d88ff]",
  },
  {
    id: "pelamar",
    shortLabel: "Pelamar",
    description: "Lamar posisi dan unggah CV Anda",
    icon: User,
    pillClass: "login-role-pill-admin", // Reusing admin classes for color for now
    btnClass: "login-role-btn-admin",
    descClass: "login-role-desc-admin",
    iconAccent: "text-sky-500",
  },
];

export function LoginRoleSelector({ value, onChange, isRegister = false }: Props) {
  const activeIndex = value === "admin" ? 1 : value === "pelamar" ? 2 : 0;
  const activeRole = ROLES[activeIndex];
  const activeMeta = ROLES[activeIndex];

  // Map role gradients matching dashboard cards
  const roleGradients: Record<LoginIntent, { bg: string; shadow: string }> = {
    hr: {
      bg: "linear-gradient(135deg, #ffb347 0%, #ffcc33 100%)",
      shadow: "0 4px 14px rgba(255, 179, 71, 0.35)",
    },
    admin: {
      bg: "linear-gradient(135deg, #70a1ff 0%, #5352ed 100%)",
      shadow: "0 4px 14px rgba(112, 161, 255, 0.35)",
    },
    pelamar: {
      bg: "linear-gradient(135deg, #2ed573 0%, #1abc9c 100%)",
      shadow: "0 4px 14px rgba(46, 213, 115, 0.35)",
    },
  };

  const activeGradient = roleGradients[value];

  return (
    <div className="mb-6 space-y-3">
      <div
        className="relative grid grid-cols-3 gap-1.5 p-1 rounded-xl border border-slate-200/60 bg-slate-50 shadow-inner"
        role="tablist"
        aria-label={isRegister ? "Pilih peran registrasi" : "Pilih peran login"}
      >
        {/* Sliding pill — custom gradient matching dashboard */}
        <span
          aria-hidden
          className="pointer-events-none absolute top-1 bottom-1 rounded-lg transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
          style={{
            width: "calc(33.333% - 0.25rem)",
            left: activeIndex === 0 ? "0.25rem" : activeIndex === 1 ? "calc(33.333% + 0.125rem)" : "calc(66.666% + 0.0rem)",
            background: activeGradient.bg,
            boxShadow: activeGradient.shadow,
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
                "relative z-10 flex flex-col items-center justify-center gap-1 px-3 py-2 text-xs font-extrabold rounded-lg",
                "transition-all duration-300 ease-out",
                "focus-visible:outline-none",
                "active:scale-[0.97]",
                selected
                  ? "text-white scale-[1.02]"
                  : ""
              )}
              style={!selected ? { color: '#000000' } : {}}
            >
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full transition-all duration-300",
                  selected
                    ? "bg-white/20 scale-110"
                    : "bg-slate-200 border border-slate-350"
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 transition-all duration-300",
                    selected ? "scale-110 text-white" : ""
                  )}
                  style={!selected ? { color: '#000000', stroke: '#000000' } : {}}
                  strokeWidth={selected ? 2.25 : 2.5}
                />
              </span>
              <span className="leading-tight text-center mt-1.5" style={!selected ? { color: '#000000' } : {}}>
                {role.shortLabel}
              </span>
            </button>
          );
        })}
      </div>

      {/* Deskripsi — border & bg gradasi mengikuti role aktif */}
      <div
        key={activeRole.id}
        className={cn(
          "login-role-desc-enter min-h-[2.5rem] flex items-center justify-center gap-2 rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2"
        )}
      >
        {(() => {
          const Icon = activeRole.icon;
          return (
            <>
              <Icon className={cn("h-3.5 w-3.5 shrink-0", activeMeta.iconAccent)} aria-hidden />
              <p className="text-xs text-center text-slate-500 font-medium">{activeRole.description}</p>
            </>
          );
        })()}
      </div>
    </div>
  );
}
