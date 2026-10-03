"use client";

import { useEffect, useRef } from "react";
import { Bug, CheckCircle2, Rocket, UserMinus } from "lucide-react";
import type { CompanyView } from "./types";
import { money } from "./ui";
import { useTranslation } from "../../../i18n/useTranslation";

type Employee = Pick<CompanyView["employees"][number], "name" | "roleSlug" | "roleName" | "trait" | "skin" | "card" | "performance" | "stats" | "avatar" | "style"> &
  Partial<Pick<CompanyView["employees"][number], "busy" | "salary" | "seniority">>;

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

const IMAGE_CACHE = new Map<string, HTMLImageElement>();

function loadImage(url: string) {
  const cached = IMAGE_CACHE.get(url);
  if (cached?.complete) return Promise.resolve(cached);
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      IMAGE_CACHE.set(url, image);
      resolve(image);
    };
    image.onerror = reject;
    image.src = url;
  });
}

/** Retrato de un empleado por piezas: sus capas una encima de otra, con su tono de piel y color de pelo. */
function AvatarPortrait({ avatar, label }: { avatar: NonNullable<Employee["avatar"]>; label: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;
    const layers = avatar.slots.filter((slot) => slot.imageUrl).sort((a, b) => a.layer - b.layer);
    Promise.all(layers.map((slot) => loadImage(slot.imageUrl!).then((image) => ({ slot, image })).catch(() => null))).then((loaded) => {
      const canvas = canvasRef.current;
      if (cancelled || !canvas) return;
      const parts = loaded.filter(Boolean) as Array<{ slot: (typeof layers)[number]; image: HTMLImageElement }>;
      const width = Math.max(1, ...parts.map((part) => part.image.width));
      const height = Math.max(1, ...parts.map((part) => part.image.height));
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.imageSmoothingEnabled = false;
      const scratch = document.createElement("canvas");
      scratch.width = width;
      scratch.height = height;
      const sctx = scratch.getContext("2d")!;
      sctx.imageSmoothingEnabled = false;
      for (const { slot, image } of parts) {
        const x = Math.round((width - image.width) / 2);
        const y = Math.round((height - image.height) / 2);
        const tint = slot.colorable ? (slot.color ?? avatar.skinColor) : null;
        if (tint === null || tint === 0xffffff) {
          ctx.drawImage(image, x, y);
          continue;
        }
        // Teñir como Phaser (multiplicar) conservando la transparencia.
        sctx.clearRect(0, 0, width, height);
        sctx.globalCompositeOperation = "source-over";
        sctx.drawImage(image, x, y);
        sctx.globalCompositeOperation = "multiply";
        sctx.fillStyle = `#${tint.toString(16).padStart(6, "0")}`;
        sctx.fillRect(0, 0, width, height);
        sctx.globalCompositeOperation = "destination-in";
        sctx.drawImage(image, x, y);
        ctx.drawImage(scratch, 0, 0);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [avatar]);

  return <canvas ref={canvasRef} className="cs2-card-portrait" role="img" aria-label={label} />;
}

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
        {employee.seniority && (
          <span className={`cs2-seniority cs2-seniority-${employee.seniority.key}`} title={t("codestudio.candidates.promotion", { value: Math.round(employee.seniority.progress * 100) })}>
            {employee.seniority.name}
          </span>
        )}
        {employee.trait && (
          <span className={`cs2-trait cs2-trait-${employee.trait.tone}`} title={employee.trait.description}>
            {employee.trait.name}
          </span>
        )}
      </header>

      <div className="cs2-fut-portrait">
        {!employee.skin?.spriteSheetUrl && employee.avatar ? (
          <AvatarPortrait avatar={employee.avatar} label={employee.name} />
        ) : (
          <SkinPortrait skin={employee.skin} label={employee.name} />
        )}
      </div>

      <div className="cs2-fut-name">
        <b title={employee.name}>{employee.name}</b>
        <small>
          {employee.roleName}
          {employee.style ? ` · ${t(`codestudio.card.style.${employee.style}`)}` : ""}
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
