import { Coins, Gem } from "lucide-react";
import { classNames } from "@/shared/utils/class-names";

interface CurrencyIconProps {
  currency: "coins" | "gems";
  size?: number;
  className?: string;
}

const ICONS = { coins: Coins, gems: Gem } as const;
const CLASS_NAMES = {
  coins: "cb-fx-currency-coins",
  gems: "cb-fx-currency-gems",
} as const;

/** Coin/gem icon with the shared premium currency identity color. */
export function CurrencyIcon({ currency, size = 14, className }: CurrencyIconProps) {
  const Icon = ICONS[currency];
  return <Icon size={size} className={classNames(CLASS_NAMES[currency], className)} />;
}
