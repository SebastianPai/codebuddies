"use client";

import { useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Hand, Monitor, MousePointerClick, Shirt, ShoppingBag, Sparkles, Target, User, Users, MessageCircle, X } from "lucide-react";
import { useTranslation } from "../../../i18n/useTranslation";
import "./GameOnboarding.css";

// Onboarding guiado del juego: la primera vez que alguien entra, ilumina
// los elementos reales del HUD (perfil, PC, avatar, tienda, amigos,
// misiones, chat) y explica cada uno. Se repite desde Ajustes.

const SEEN_KEY = "cb-onboarding-game-v1";
export const START_GAME_ONBOARDING = "cb:game-onboarding:start";

type Step = { target?: string; key: string; icon: ReactNode };
type Rect = { top: number; left: number; width: number; height: number };

const STEPS: Step[] = [
  { key: "welcome", icon: <Sparkles size={20} /> },
  { key: "move", icon: <MousePointerClick size={20} /> },
  { key: "profile", target: '[data-tour="profile"]', icon: <User size={20} /> },
  { key: "pc", target: '[data-tour="pc"]', icon: <Monitor size={20} /> },
  { key: "customize", target: '[data-tour="customize"]', icon: <Shirt size={20} /> },
  { key: "shop", target: '[data-tour="shop"]', icon: <ShoppingBag size={20} /> },
  { key: "friends", target: '[data-tour="friends"]', icon: <Users size={20} /> },
  { key: "missions", target: '[data-tour="missions"]', icon: <Target size={20} /> },
  { key: "chat", target: '[data-tour="chat"]', icon: <MessageCircle size={20} /> },
  { key: "end", icon: <Hand size={20} /> },
];

const PAD = 6;

function seen() {
  try {
    return window.localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return true;
  }
}

function markSeen() {
  try {
    window.localStorage.setItem(SEEN_KEY, "1");
  } catch {
    // Sin storage: volverá a salir.
  }
}

function rectOf(selector?: string): Rect | null {
  if (!selector) return null;
  const el = document.querySelector(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return null;
  return { top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 };
}

export default function GameOnboarding({ onOpenPc }: { onOpenPc: () => void }) {
  const t = useTranslation();
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const step = STEPS[index];
  const last = index === STEPS.length - 1;

  useEffect(() => {
    if (seen()) return;
    // Un momento para que el HUD termine de montarse; si llegó directo al
    // PC (enlace desde la web a CodeStudio), espera a que lo cierre.
    const timer = window.setInterval(() => {
      if (document.querySelector(".pc-modal")) return;
      window.clearInterval(timer);
      setOpen(true);
    }, 1500);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const start = () => {
      setIndex(0);
      setOpen(true);
    };
    window.addEventListener(START_GAME_ONBOARDING, start);
    return () => window.removeEventListener(START_GAME_ONBOARDING, start);
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    let frame = 0;
    const update = () => {
      const next = rectOf(step?.target);
      setRect((current) =>
        current && next && current.top === next.top && current.left === next.left && current.width === next.width && current.height === next.height ? current : next,
      );
      frame = window.requestAnimationFrame(update);
    };
    frame = window.requestAnimationFrame(update);
    return () => window.cancelAnimationFrame(frame);
  }, [open, step?.target]);

  const close = () => {
    markSeen();
    setOpen(false);
  };

  const cardStyle = useMemo<React.CSSProperties>(() => {
    const vw = typeof window === "undefined" ? 1200 : window.innerWidth;
    const vh = typeof window === "undefined" ? 800 : window.innerHeight;
    const width = Math.min(360, vw - 24);
    if (!rect) return { top: "50%", left: "50%", width, transform: "translate(-50%, -50%)" };
    // Al lado derecho si cabe (HUD de la izquierda), si no debajo/arriba.
    if (rect.left + rect.width + 16 + width < vw && rect.left < vw / 2) {
      return { top: Math.min(Math.max(12, rect.top), vh - 240), left: rect.left + rect.width + 16, width };
    }
    const left = Math.min(Math.max(12, rect.left + rect.width / 2 - width / 2), vw - width - 12);
    const below = rect.top + rect.height + 14;
    return below + 230 < vh ? { top: below, left, width } : { top: Math.max(12, rect.top - 244), left, width };
  }, [rect]);

  if (!open || !step) return null;

  return createPortal(
    <div className="cb-onb" role="dialog" aria-modal="true" aria-label={t(`hud.onboarding.${step.key}.title`)}>
      {rect ? <div className="cb-onb-hole" style={rect} /> : <div className="cb-onb-dim" />}
      <div className="cb-onb-catch" onClick={close} />
      <div className="cb-onb-card" style={cardStyle}>
        <header>
          <span>{t("hud.onboarding.progress", { step: index + 1, total: STEPS.length })}</span>
          <button type="button" onClick={close} aria-label={t("hud.onboarding.skip")}>
            <X size={15} />
          </button>
        </header>
        <div className="cb-onb-body">
          <i>{step.icon}</i>
          <div>
            <h3>{t(`hud.onboarding.${step.key}.title`)}</h3>
            <p>{t(`hud.onboarding.${step.key}.text`)}</p>
          </div>
        </div>
        <div className="cb-onb-dots">
          {STEPS.map((item, i) => (
            <span key={item.key} className={i <= index ? "on" : ""} />
          ))}
        </div>
        <footer>
          <button type="button" className="cb-onb-ghost" onClick={() => (index === 0 ? close() : setIndex((i) => i - 1))}>
            {index === 0 ? t("hud.onboarding.skip") : t("hud.onboarding.back")}
          </button>
          <button
            type="button"
            className="cb-onb-primary"
            onClick={() => {
              if (!last) return setIndex((i) => i + 1);
              close();
              onOpenPc();
            }}
          >
            {last ? t("hud.onboarding.end.cta") : t("hud.onboarding.next")}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
