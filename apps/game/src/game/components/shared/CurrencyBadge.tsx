"use client";

import { useEffect, useRef, useState } from "react";
import { Coins, Gem, Gift, Star, type LucideIcon } from "lucide-react";

import styles from "./CurrencyBadge.module.css";
import { useTranslation } from "../../../i18n/useTranslation";

type Currency = "coins" | "gems" | "premium" | "free";

interface Props {
  currency: Currency;
  amount?: number;
  size?: "sm" | "md";
  className?: string;
}

const ICON: Record<Currency, LucideIcon> = {
  coins: Coins,
  gems: Gem,
  premium: Star,
  free: Gift,
};

const LABEL_KEY: Record<Currency, string> = {
  coins: "hud.currency.coins",
  gems: "hud.currency.gems",
  premium: "hud.currency.premium",
  free: "hud.currency.free",
};

// Antes el número saltaba directo al nuevo valor cuando cambiaba (React
// re-renderiza el número, sin más) — sensación de "la UI actualizó un dato",
// no de "ganaste/gastaste monedas". Anima el conteo desde el valor mostrado
// actual hasta el nuevo, interrumpible (si el valor cambia de nuevo a mitad
// de la animación, arranca de donde esté en pantalla, no desde el target
// viejo).
function useCountUp(target: number, duration = 350): number {
  const [display, setDisplay] = useState(target);
  const displayRef = useRef(target);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);

    const from = displayRef.current;
    if (from === target) return;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      displayRef.current = target;
      setDisplay(target);
      return;
    }

    const start = performance.now();

    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = progress >= 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const value = Math.round(from + (target - from) * eased);
      displayRef.current = value;
      setDisplay(value);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      }
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return display;
}

// Muestra monedas/gemas/premium/gratis con el mismo formato en HUD, tienda,
// inventario y sidebar, en vez de que cada lugar arme su propio "🪙 {n}" a mano.
export default function CurrencyBadge({ currency, amount, size = "md", className = "" }: Props) {
  const t = useTranslation();
  const showAmount = currency === "coins" || currency === "gems";
  const Icon = ICON[currency];
  const label = t(LABEL_KEY[currency]);
  const displayedAmount = useCountUp(amount ?? 0);

  return (
    <span
      className={`${styles.badge} ${styles[size]} ${className}`}
      aria-label={showAmount ? `${amount?.toLocaleString() ?? 0} ${label}` : label}
    >
      <span className={styles.icon} aria-hidden="true">
        <Icon size={size === "sm" ? 12 : 15} />
      </span>
      {showAmount ? (
        <span className={styles.amount}>{displayedAmount.toLocaleString()}</span>
      ) : (
        <span className={styles.amount}>{label}</span>
      )}
    </span>
  );
}
