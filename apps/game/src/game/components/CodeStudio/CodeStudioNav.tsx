"use client";

import { useEffect, useRef, useState } from "react";
import { sileo } from "sileo";
import { ArrowRight, Lock } from "lucide-react";
import { NAV_GROUPS, nav, navLock, type CompanyView, type ViewKey } from "./types";
import { useTranslation } from "../../../i18n/useTranslation";

// Menú lateral en 4 grupos. Las secciones que todavía no sirven se ven
// apagadas con candado (y su condición en el título): el jugador sabe que
// existen sin que lo distraigan. Al abrirse muestran "Nuevo" hasta que se
// entra una vez. Durante el tutorial todo queda abierto.

const SEEN_PREFIX = "cs-seen-views:";

function readSeen(companyId: string): Set<string> | null {
  try {
    const raw = window.localStorage.getItem(SEEN_PREFIX + companyId);
    return raw ? new Set(JSON.parse(raw) as string[]) : null;
  } catch {
    return new Set();
  }
}

function writeSeen(companyId: string, seen: Set<string>) {
  try {
    window.localStorage.setItem(SEEN_PREFIX + companyId, JSON.stringify([...seen]));
  } catch {
    // Sin storage: el aviso "Nuevo" solo dura la sesión.
  }
}

type Props = {
  company: CompanyView;
  view: ViewKey;
  tourView: ViewKey | null;
  allOpen: boolean;
  onSelect: (view: ViewKey) => void;
};

export default function CodeStudioNav({ company, view, tourView, allOpen, onSelect }: Props) {
  const t = useTranslation();
  const lockOf = (key: ViewKey) => (allOpen ? null : navLock(company, key));

  // Secciones ya vistas. La primera vez se dan por vistas todas las que ya
  // estaban abiertas: "Nuevo" es solo para lo que se abre de ahora en más.
  // null = todavía no se leyó lo guardado (no se marca nada como "Nuevo").
  // Va junto con la empresa a la que pertenece, para no mezclar listas al
  // cambiar de startup.
  const [seenState, setSeenState] = useState<{ companyId: string; views: Set<string> } | null>(null);
  const seen = seenState?.companyId === company.id ? seenState.views : null;
  useEffect(() => {
    const stored = readSeen(company.id);
    if (stored) return setSeenState({ companyId: company.id, views: stored });
    const initial = new Set(nav.filter((item) => !navLock(company, item.key)).map((item) => item.key as string));
    writeSeen(company.id, initial);
    setSeenState({ companyId: company.id, views: initial });
    // Solo al cambiar de empresa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company.id]);

  // Celebrar cuando una sección pasa de cerrada a abierta mientras juegas.
  const locksRef = useRef<{ companyId: string; locked: Set<string> } | null>(null);
  useEffect(() => {
    const locked = new Set(nav.filter((item) => navLock(company, item.key)).map((item) => item.key as string));
    const before = locksRef.current;
    locksRef.current = { companyId: company.id, locked };
    if (!before || before.companyId !== company.id) return;
    for (const key of before.locked) {
      if (locked.has(key)) continue;
      const item = nav.find((entry) => entry.key === key);
      if (item) sileo.success({ title: t("codestudio.navLock.unlocked", { name: t(item.labelKey) }), description: t("codestudio.navLock.unlockedText") });
    }
  }, [company, t]);

  useEffect(() => {
    if (!seen || seen.has(view) || navLock(company, view)) return;
    const next = new Set(seen).add(view);
    writeSeen(company.id, next);
    setSeenState({ companyId: company.id, views: next });
  }, [view, seen, company]);

  return (
    <nav className="cs2-nav" aria-label={t("codestudio.header.navigation")}>
      {NAV_GROUPS.map((group) => (
        <div key={group} className="cs2-nav-group" role="group" aria-label={t(`codestudio.navGroup.${group}`)}>
          <p className="cs2-nav-group-label">{t(`codestudio.navGroup.${group}`)}</p>
          {nav
            .filter((item) => item.group === group)
            .map((item) => {
              const lock = lockOf(item.key);
              const badge = item.key === "bugs" ? company.bugs.length : item.key === "panel" && company.pendingDecision ? 1 : 0;
              const isNew = !!seen && !lock && !seen.has(item.key) && view !== item.key;
              const classes = [view === item.key ? "active" : "", tourView === item.key ? "tour-target" : "", lock ? "locked" : ""].filter(Boolean).join(" ");
              return (
                <button
                  key={item.key}
                  type="button"
                  className={classes}
                  onClick={() => onSelect(item.key)}
                  title={lock ? t(`codestudio.navLock.${lock}`) : undefined}
                  aria-current={view === item.key ? "page" : undefined}
                >
                  {lock ? <Lock size={15} aria-hidden="true" /> : <item.icon size={16} aria-hidden="true" />}
                  <span>{t(item.labelKey)}</span>
                  {lock && <span className="cs2-sr-only">{t(`codestudio.navLock.${lock}`)}</span>}
                  {badge > 0 && !lock && <em>{badge}</em>}
                  {isNew && badge === 0 && <em className="cs2-nav-new">{t("codestudio.navLock.new")}</em>}
                </button>
              );
            })}
        </div>
      ))}
    </nav>
  );
}

// Lo que se ve al entrar a una sección todavía cerrada: por qué está cerrada
// y un atajo al siguiente paso. Explica el juego en vez de esconderlo.
export function LockedView({ viewKey, reason, onGoPanel }: { viewKey: ViewKey; reason: string; onGoPanel: () => void }) {
  const t = useTranslation();
  const item = nav.find((entry) => entry.key === viewKey);
  const name = item ? t(item.labelKey) : viewKey;
  return (
    <section className="cs2-card cs2-locked-view">
      <span className="cs2-locked-icon">
        <Lock size={22} aria-hidden="true" />
      </span>
      <h2>{t("codestudio.navLock.title", { name })}</h2>
      <p>{t(`codestudio.navLock.${reason}`)}</p>
      <p className="cs2-muted">{t(`codestudio.navLock.what.${viewKey}`)}</p>
      <button type="button" className="cs2-nextcard-btn" onClick={onGoPanel}>
        {t("codestudio.navLock.goNext")} <ArrowRight size={16} aria-hidden="true" />
      </button>
    </section>
  );
}
