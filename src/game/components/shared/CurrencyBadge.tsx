"use client";

import { Coins, Gem, Gift, Star, type LucideIcon } from "lucide-react";

import styles from "./CurrencyBadge.module.css";

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

const LABEL: Record<Currency, string> = {
  coins: "monedas",
  gems: "gemas",
  premium: "Premium",
  free: "Gratis",
};

// Muestra monedas/gemas/premium/gratis con el mismo formato en HUD, tienda,
// inventario y sidebar, en vez de que cada lugar arme su propio "🪙 {n}" a mano.
export default function CurrencyBadge({ currency, amount, size = "md", className = "" }: Props) {
  const showAmount = currency === "coins" || currency === "gems";
  const Icon = ICON[currency];

  return (
    <span
      className={`${styles.badge} ${styles[size]} ${className}`}
      aria-label={showAmount ? `${amount?.toLocaleString() ?? 0} ${LABEL[currency]}` : LABEL[currency]}
    >
      <span className={styles.icon} aria-hidden="true">
        <Icon size={size === "sm" ? 12 : 15} />
      </span>
      {showAmount ? (
        <span className={styles.amount}>{(amount ?? 0).toLocaleString()}</span>
      ) : (
        <span className={styles.amount}>{LABEL[currency]}</span>
      )}
    </span>
  );
}
