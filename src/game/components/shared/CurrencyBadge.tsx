"use client";

import styles from "./CurrencyBadge.module.css";

type Currency = "coins" | "gems" | "premium" | "free";

interface Props {
  currency: Currency;
  amount?: number;
  size?: "sm" | "md";
  className?: string;
}

const ICON: Record<Currency, string> = {
  coins: "🪙",
  gems: "💎",
  premium: "⭐",
  free: "🎁",
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

  return (
    <span
      className={`${styles.badge} ${styles[size]} ${className}`}
      aria-label={showAmount ? `${amount?.toLocaleString() ?? 0} ${LABEL[currency]}` : LABEL[currency]}
    >
      <span className={styles.icon} aria-hidden="true">
        {ICON[currency]}
      </span>
      {showAmount ? (
        <span className={styles.amount}>{(amount ?? 0).toLocaleString()}</span>
      ) : (
        <span className={styles.amount}>{LABEL[currency]}</span>
      )}
    </span>
  );
}
