"use client";

import { useCallback, useEffect, useLayoutEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

// Tour guiado genérico: oscurece la página, ilumina el elemento real del
// paso (por selector, normalmente [data-tour="..."]) y muestra una tarjeta
// al lado con el texto. Si el elemento no está visible (p. ej. el menú en
// el celular), la tarjeta sale centrada y el paso igual se entiende.

export type TourStep = {
  /** Selector CSS del elemento a iluminar; sin selector = tarjeta centrada. */
  target?: string;
  title: string;
  text: string;
  icon?: ReactNode;
};

type Rect = { top: number; left: number; width: number; height: number };

const PAD = 8;
const CARD_W = 360;

function visibleRect(selector?: string): Rect | null {
  if (!selector || typeof document === "undefined") return null;
  const el = document.querySelector(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return null;
  if (r.bottom < 0 || r.top > window.innerHeight) return null;
  return { top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 };
}

export function SpotlightTour({
  steps,
  labels,
  onClose,
  finalAction,
}: {
  steps: TourStep[];
  labels: { next: string; back: string; skip: string; done: string; progress: (step: number, total: number) => string };
  onClose: () => void;
  finalAction?: { label: string; onClick: () => void };
}) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [mounted, setMounted] = useState(false);
  const step = steps[index];
  const last = index === steps.length - 1;

  useEffect(() => setMounted(true), []);

  // Lleva el elemento a la vista y sigue su posición (scroll/resize).
  useLayoutEffect(() => {
    if (!step?.target) {
      setRect(null);
      return;
    }
    const el = document.querySelector(step.target);
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
    let frame = 0;
    const update = () => {
      const next = visibleRect(step.target);
      setRect((current) =>
        current && next && current.top === next.top && current.left === next.left && current.width === next.width && current.height === next.height
          ? current
          : next,
      );
      frame = window.requestAnimationFrame(update);
    };
    frame = window.requestAnimationFrame(update);
    return () => window.cancelAnimationFrame(frame);
  }, [step?.target]);

  const close = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key === "ArrowRight" && !last) setIndex((i) => i + 1);
      if (event.key === "ArrowLeft" && index > 0) setIndex((i) => i - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close, index, last]);

  if (!mounted || !step) return null;

  // Tarjeta: debajo del elemento si cabe, si no arriba; centrada si no hay elemento.
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cardWidth = Math.min(CARD_W, vw - 32);
  let cardStyle: React.CSSProperties;
  if (rect) {
    const below = rect.top + rect.height + 14;
    const placeBelow = below + 220 < vh;
    const left = Math.min(Math.max(16, rect.left + rect.width / 2 - cardWidth / 2), vw - cardWidth - 16);
    cardStyle = placeBelow ? { top: below, left, width: cardWidth } : { top: Math.max(16, rect.top - 14 - 220), left, width: cardWidth };
  } else {
    cardStyle = { top: "50%", left: "50%", width: cardWidth, transform: "translate(-50%, -50%)" };
  }

  return createPortal(
    <div className="fixed inset-0 z-[11000]" role="dialog" aria-modal="true" aria-label={step.title}>
      {/* Fondo oscuro con "agujero" sobre el elemento iluminado. */}
      {rect ? (
        <div
          className="pointer-events-none fixed rounded-2xl ring-2 ring-[rgb(var(--primary))] transition-all duration-300 ease-out"
          style={{ ...rect, boxShadow: "0 0 0 9999px rgba(0,0,0,0.62)" }}
        />
      ) : (
        <div className="fixed inset-0 bg-black/60" />
      )}
      <div className="fixed inset-0" onClick={close} />

      <div
        className="fixed rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 text-[rgb(var(--text))] shadow-[0_24px_60px_rgba(0,0,0,0.45)] transition-all duration-300 ease-out"
        style={cardStyle}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="text-xs font-bold text-[rgb(var(--secondary-text))]">{labels.progress(index + 1, steps.length)}</span>
          <button
            type="button"
            onClick={close}
            aria-label={labels.skip}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[rgb(var(--secondary-text))] hover:bg-[rgb(var(--border)/0.6)]"
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex items-start gap-3">
          {step.icon && (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[rgb(var(--button))] text-[rgb(var(--button-text))]">{step.icon}</span>
          )}
          <div className="min-w-0">
            <h3 className="text-lg font-black leading-tight tracking-tight">{step.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-[rgb(var(--secondary-text))]">{step.text}</p>
          </div>
        </div>
        <div className="mt-4 flex gap-1">
          {steps.map((_, i) => (
            <span key={i} className={`h-1 flex-1 rounded-full ${i <= index ? "bg-[rgb(var(--primary))]" : "bg-[rgb(var(--border))]"}`} />
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => (index === 0 ? close() : setIndex((i) => i - 1))}
            className="rounded-xl px-3 py-2 text-sm font-bold text-[rgb(var(--secondary-text))] hover:bg-[rgb(var(--border)/0.5)]"
          >
            {index === 0 ? labels.skip : labels.back}
          </button>
          <button
            type="button"
            onClick={() => {
              if (!last) return setIndex((i) => i + 1);
              close();
              finalAction?.onClick();
            }}
            className="rounded-xl bg-[rgb(var(--button))] px-4 py-2 text-sm font-black text-[rgb(var(--button-text))] transition hover:brightness-110"
          >
            {last ? finalAction?.label ?? labels.done : labels.next}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
