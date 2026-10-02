"use client";

import { CircleCheck, Eye, Flame, Frown, HandMetal, Heart, Laugh, Lightbulb, PartyPopper, Rocket, Sparkles, ThumbsUp, type LucideIcon } from "lucide-react";

// Reacciones del chat con íconos vectoriales en vez de emojis. Se guardan
// como clave corta (cabe en MessageReactionDto.emoji, máx. 12); las
// reacciones viejas guardadas como emoji se muestran con su ícono.
const ICONS: Record<string, LucideIcon> = {
  "thumbs-up": ThumbsUp,
  heart: Heart,
  laugh: Laugh,
  wow: Sparkles,
  sad: Frown,
  fire: Flame,
  rock: HandMetal,
  rocket: Rocket,
  check: CircleCheck,
  idea: Lightbulb,
  party: PartyPopper,
  eyes: Eye,
};

export const REACTION_KEYS = Object.keys(ICONS);

const LEGACY: Record<string, string> = {
  "👍": "thumbs-up",
  "❤️": "heart",
  "❤": "heart",
  "😂": "laugh",
  "😮": "wow",
  "😢": "sad",
  "🔥": "fire",
  "👏": "rock",
  "🚀": "rocket",
  "✅": "check",
  "💡": "idea",
  "🎉": "party",
  "👀": "eyes",
};

export function ReactionIcon({ value, size = 16, className }: { value: string; size?: number; className?: string }) {
  const Icon = ICONS[value] ?? ICONS[LEGACY[value] ?? ""] ?? ThumbsUp;
  return <Icon size={size} className={className} aria-label={LEGACY[value] ?? value} />;
}
