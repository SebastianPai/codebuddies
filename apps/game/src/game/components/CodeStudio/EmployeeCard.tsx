"use client";

import { useEffect, useRef } from "react";
import { Bug, CheckCircle2, Rocket, UserMinus } from "lucide-react";
import type { CompanyView } from "./types";
import { money } from "./ui";
import { useTranslation } from "../../../i18n/useTranslation";

type Employee = Pick<CompanyView["employees"][number], "name" | "roleSlug" | "roleName" | "trait" | "skin" | "card" | "performance" | "stats"> &
  Partial<Pick<CompanyView["employees"][number], "busy" | "salary">>;

// Carta de empleado estilo "carta de fútbol": media grande, rol, retrato
// (primer cuadro de su skin), seis estadísticas y el color según la media
// (bronce, plata, oro o especial).

function tierOf(overall: number) {
  if (overall >= 85) return "special";
  if (overall >= 70) return "gold";
  if (overall >= 55) return "silver";
  return "bronze";
}

const ROLE_SHORT: Record<string, string> = {
  fullstack: "FS",
  frontend: "FE",
  backend: "BE",
  qa: "QA",
  ux: "UX",
  "product-manager": "PM",
  devops: "OPS",
  marketing: "MKT",
  support: "SUP",
  "community-manager": "CM",
  "data-scientist": "DS",
};

/** Retrato: el primer cuadro de la hoja de la skin, pixelado y centrado. */
function SkinPortrait({ skin, label }: { skin: Employee["skin"]; label: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !skin?.spriteSheetUrl) return;
    // Sin crossOrigin: solo se dibuja (no se leen píxeles), y el servidor de
    // imágenes no manda CORS; con crossOrigin la carga fallaba.
    const image = new Image();
    let cancelled = false;
    image.onload = () => {
      if (cancelled) return;
      const fw = skin.frameWidth;
      const fh = skin.frameHeight;
      canvas.width = fw;
      canvas.height = fh;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, fw, fh);
      ctx.drawImage(image, 0, 0, fw, fh, 0, 0, fw, fh);
    };
    image.src = skin.spriteSheetUrl;
    return () => {
      cancelled = true;
    };
  }, [skin?.spriteSheetUrl, skin?.frameWidth, skin?.frameHeight]);

  if (!skin?.spriteSheetUrl) {
    return (
      <span className="cs2-card-portrait-fallback" aria-hidden>
        {label.slice(0, 2).toUpperCase()}
      </span>
    );
  }
  return <canvas ref={canvasRef} className="cs2-card-portrait" role="img" aria-label={label} />;
}

// Sin onFire (visitas en la oficina): sin sueldo ni botón de despedir.
export default function EmployeeCard({ employee, busy = false, onFire }: { employee: Employee; busy?: boolean; onFire?: () => void }) {
  const t = useTranslation();
  const card = employee.card;
  const overall = card?.overall ?? employee.performance ?? 60;
  const tier = tierOf(overall);
  const stats: Array<[string, number]> = card
    ? [
        ["vel", card.vel],
        ["cal", card.cal],
        ["cre", card.cre],
        ["pro", card.pro],
        ["mot", card.mot],
        ["exp", card.exp],
      ]
    : [];

  return (
    <article className={`cs2-fut cs2-fut-${tier}`} aria-label={`${employee.name}, ${employee.roleName}, ${overall}`}>
      <header className="cs2-fut-top">
        <div className="cs2-fut-rating">
          <b>{overall}</b>
          <span>{ROLE_SHORT[employee.roleSlug] ?? employee.roleSlug.slice(0, 3).toUpperCase()}</span>
        </div>
        {employee.trait && (
          <span className={`cs2-trait cs2-trait-${employee.trait.tone}`} title={employee.trait.description}>
            {employee.trait.name}
          </span>
        )}
      </header>

      <div className="cs2-fut-portrait">
        <SkinPortrait skin={employee.skin} label={employee.name} />
      </div>

      <div className="cs2-fut-name">
        <b title={employee.name}>{employee.name}</b>
        <small>
          {employee.roleName}
          {employee.busy ? ` · ${t("codestudio.team.busy")}` : ""}
        </small>
      </div>

      {stats.length > 0 && (
        <dl className="cs2-fut-stats">
          {stats.map(([key, value]) => (
            <div key={key} title={t(`codestudio.card.${key}Hint`)}>
              <dt>{value}</dt>
              <dd>{t(`codestudio.card.${key}`)}</dd>
            </div>
          ))}
        </dl>
      )}

      <footer className="cs2-fut-foot">
        {employee.stats && (
          <span className="cs2-fut-record">
            <span title={t("codestudio.team.statShipped")}>
              <Rocket size={12} /> {employee.stats.featuresShipped}
            </span>
            <span title={t("codestudio.team.statFixed")}>
              <CheckCircle2 size={12} /> {employee.stats.bugsFixed}
            </span>
            <span title={t("codestudio.team.statCaused")} className={employee.stats.bugsCaused > 0 ? "cs2-tone-bad" : ""}>
              <Bug size={12} /> {employee.stats.bugsCaused}
            </span>
          </span>
        )}
        {onFire && employee.salary !== undefined && (
          <>
            <span className="cs2-fut-salary">{t("codestudio.team.salary", { amount: money(employee.salary) })}</span>
            <button type="button" className="cs2-icon-btn" disabled={busy} onClick={onFire} aria-label={t("codestudio.team.fire")} title={t("codestudio.team.fire")}>
              <UserMinus size={15} />
            </button>
          </>
        )}
      </footer>
    </article>
  );
}
