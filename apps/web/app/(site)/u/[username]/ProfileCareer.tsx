"use client";

import { useEffect, useState } from "react";
import { Briefcase, Building2, DoorOpen, Globe, Lock, Trophy, Users } from "lucide-react";
import { api } from "../../../../utils/api";
import { getGameUrl } from "@/config/env";
import { useTranslation } from "../../../../src/i18n/useTranslation";
import { useLanguage } from "../../../../src/i18n/LanguageContext";

// Perfil estilo LinkedIn: dónde trabaja (empresas de CodeStudio con cargo,
// % que conserva, fechas, etapa y ranking) y sus salas del juego.

export type CareerCompany = {
  id: string;
  name: string;
  role: string;
  active: boolean;
  appType: { name: string; color: string | null };
  stage: string;
  equity: number;
  valuation: number;
  activeUsers: number;
  employees: number;
  since: string;
  until: string | null;
  rank: number | null;
  officeRoomId: string | null;
};

export type Career = {
  current: CareerCompany | null;
  companies: CareerCompany[];
  totals: { companies: number; active: number; bestRank: number | null; employees: number };
};

type ProfileRoom = {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  maxUsers: number;
  _count: { users: number };
};

const LOCALE: Record<string, string> = { es: "es-ES", "en-us": "en-US", de: "de-DE" };

export function useCareer(username: string) {
  const lang = useLanguage()?.lang ?? "es";
  const [career, setCareer] = useState<Career | null>(null);
  useEffect(() => {
    api
      .get<Career>(`/profiles/${encodeURIComponent(username)}/career?lang=${lang}`)
      .then(setCareer)
      .catch(() => setCareer(null));
  }, [username, lang]);
  return career;
}

export function useDateFormat() {
  const lang = useLanguage()?.lang ?? "es";
  return (value: string, options: Intl.DateTimeFormatOptions = { month: "short", year: "numeric" }) =>
    new Date(value).toLocaleDateString(LOCALE[lang] ?? "es-ES", options);
}

/** Titular bajo el nombre: "CEO en Acme · MVP". */
export function CareerHeadline({ career }: { career: Career | null }) {
  const t = useTranslation();
  const current = career?.current;
  if (!current) return null;
  return (
    <p className="mt-2 flex items-center justify-center gap-2 text-lg font-semibold md:justify-start">
      <Briefcase className="h-5 w-5 text-[rgb(var(--primary))]" aria-hidden />
      <span>{t("site.profileWorkAt", { role: current.role, company: current.name })}</span>
      <span className="rounded-full bg-[rgb(var(--primary)/0.12)] px-2.5 py-0.5 text-xs font-bold text-[rgb(var(--primary))]">{current.stage}</span>
    </p>
  );
}

export function ExperienceSection({ career }: { career: Career | null }) {
  const t = useTranslation();
  const date = useDateFormat();
  if (!career) return null;
  return (
    <section className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6 sm:p-8">
      <h2 className="text-2xl font-black tracking-tight">{t("site.profileExperience")}</h2>
      {career.companies.length === 0 ? (
        <p className="mt-3 text-sm text-[rgb(var(--secondary-text))]">{t("site.profileNoCompanies")}</p>
      ) : (
        <ol className="mt-5 divide-y divide-[rgb(var(--border))]">
          {career.companies.map((company) => (
            <li key={company.id} className={`flex gap-4 py-5 first:pt-0 last:pb-0 ${company.active ? "" : "opacity-60"}`}>
              <span
                className="grid h-12 w-12 flex-none place-items-center rounded-xl text-white"
                style={{ background: company.appType.color ?? "#3f3f46" }}
                aria-hidden
              >
                <Building2 className="h-6 w-6" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <h3 className="truncate text-lg font-black">{company.name}</h3>
                  {company.rank && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/15 px-2 py-0.5 text-xs font-bold text-amber-500">
                      <Trophy className="h-3 w-3" aria-hidden /> #{company.rank}
                    </span>
                  )}
                </div>
                <p className="text-sm font-semibold">
                  {t("site.profileRoleEquity", { role: company.role, equity: company.equity })} · {company.appType.name}
                </p>
                <p className="text-sm text-[rgb(var(--secondary-text))]">
                  {date(company.since)} – {company.until ? date(company.until) : t("site.profilePresent")} · {company.stage}
                </p>
                <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-[rgb(var(--secondary-text))]">
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="h-4 w-4" aria-hidden /> {t("site.profileUsers", { count: company.activeUsers.toLocaleString() })}
                  </span>
                  <span>{t("site.profileTeam", { count: company.employees })}</span>
                  <span>{t("site.profileValuation", { amount: `$${company.valuation.toLocaleString()}` })}</span>
                  {!company.active && <span>{t("site.profileClosed")}</span>}
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export function RoomsSection({ username }: { username: string }) {
  const t = useTranslation();
  const [rooms, setRooms] = useState<ProfileRoom[]>([]);
  useEffect(() => {
    api
      .get<ProfileRoom[]>(`/profiles/${encodeURIComponent(username)}/rooms`)
      .then(setRooms)
      .catch(() => setRooms([]));
  }, [username]);
  if (rooms.length === 0) return null;
  return (
    <section className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6 sm:p-8">
      <h2 className="text-2xl font-black tracking-tight">{t("site.profileRooms")}</h2>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {rooms.map((room) => (
          <a
            key={room.id}
            href={getGameUrl()}
            className="group flex items-center gap-3 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--background))] p-4 transition hover:border-[rgb(var(--primary))]"
          >
            <span className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-[rgb(var(--primary)/0.12)] text-[rgb(var(--primary))]">
              <DoorOpen className="h-5 w-5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-bold group-hover:text-[rgb(var(--primary))]">{room.name}</span>
              <span className="flex items-center gap-1.5 text-xs text-[rgb(var(--secondary-text))]">
                {room.isPublic ? <Globe className="h-3 w-3" aria-hidden /> : <Lock className="h-3 w-3" aria-hidden />}
                {room.isPublic ? t("site.profileRoomPublic") : t("site.profileRoomPrivate")} ·{" "}
                {t("site.profileRoomPeople", { count: room._count.users, max: room.maxUsers })}
              </span>
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
