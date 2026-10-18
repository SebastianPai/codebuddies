import { Flame, Hand, HandHeart, Laugh, type LucideIcon } from "lucide-react";
import type { AppIconSlot } from "../AppIcon/AppIcon";

// Reacciones rápidas del chat. `slot` es la imagen administrable
// (/admin/theme-assets) que reemplaza al ícono tanto en el botón como en la
// burbuja arriba de la cabeza del jugador (ver hud/domHud.ts).
export const QUICK_REACTIONS: {
  Icon: LucideIcon;
  textKey: string;
  action: string;
  slot: AppIconSlot;
}[] = [
  { Icon: Hand, textKey: "hud.bottomBar.reactionWave", action: "wave", slot: "REACTION_WAVE" },
  { Icon: Laugh, textKey: "hud.bottomBar.reactionLaugh", action: "laugh", slot: "REACTION_LAUGH" },
  { Icon: Flame, textKey: "hud.bottomBar.reactionFire", action: "fire", slot: "REACTION_FIRE" },
  { Icon: HandHeart, textKey: "hud.bottomBar.reactionBye", action: "bye", slot: "REACTION_BYE" },
];

export function reactionSlot(action: string): AppIconSlot | null {
  return QUICK_REACTIONS.find((reaction) => reaction.action === action)?.slot ?? null;
}
