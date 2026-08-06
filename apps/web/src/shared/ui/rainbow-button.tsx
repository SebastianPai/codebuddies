import { ChevronRight } from "lucide-react";

interface RainbowButtonProps {
  text: string;
  onClick?: () => void;
  className?: string;
}

export function RainbowButton({ text, onClick, className }: RainbowButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative inline-flex items-center justify-center gap-2 border-2 border-[rgb(var(--text))] bg-gradient-to-r from-yellow-400 via-orange-400 to-purple-500 px-6 py-3 font-black uppercase tracking-widest text-[rgb(var(--button-text))] shadow-[4px_4px_0_0_rgb(var(--text))] transition-all duration-150 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_rgb(var(--text))] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none ${className}`}
    >
      <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,transparent_20%,#000_120%)] opacity-10 mix-blend-overlay" />
      <span className="relative z-10">{text}</span>
      <ChevronRight
        size={18}
        className="relative z-10 transition-transform group-hover:translate-x-1"
      />
    </button>
  );
}
