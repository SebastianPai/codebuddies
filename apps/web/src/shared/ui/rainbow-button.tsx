import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { classNames } from "@/shared/utils/class-names";

interface RainbowButtonProps {
  text: string;
  onClick?: () => void;
  href?: string;
  icon?: ReactNode;
  className?: string;
}

const SHARED_CLASSES =
  "cb-fx-border-rainbow cb-fx-glow-rainbow group inline-flex items-center justify-center gap-1.5 rounded-full bg-[rgb(var(--card))] px-4 py-2 text-sm font-bold transition-transform duration-200 ease-out hover:scale-[1.03] active:scale-[0.98]";

/**
 * Premium rainbow CTA — pill shape, animated gradient ring (shared rarity
 * token system), shimmering text, static glow, subtle scale on hover/press.
 * Used for high-stakes calls to action (e.g. the navbar PLAY button).
 */
export function RainbowButton({ text, onClick, href, icon, className }: RainbowButtonProps) {
  const content = (
    <>
      {icon}
      <span className="cb-fx-text-rainbow font-bold tracking-wide">{text}</span>
      <ChevronRight
        size={15}
        className="text-[rgb(var(--text))] transition-transform duration-200 group-hover:translate-x-0.5"
      />
    </>
  );

  if (href) {
    return (
      <a href={href} onClick={onClick} className={classNames(SHARED_CLASSES, className)}>
        {content}
      </a>
    );
  }

  return (
    <button type="button" onClick={onClick} className={classNames(SHARED_CLASSES, className)}>
      {content}
    </button>
  );
}
