import type { AppIconSlot } from "../AppIcon/AppIcon";

// Reacciones rápidas del chat. Por el socket sigue viajando el emoji (así
// el server y cualquier cliente viejo lo siguen mostrando como texto); cada
// cliente lo traduce a `slot` para dibujar la imagen del admin arriba de la
// cabeza del jugador si hay una activa (ver PlayerSocketSystem).
export const QUICK_REACTIONS: {
  emoji: string;
  textKey: string;
  action: string;
  slot: AppIconSlot;
}[] = [
  { emoji: "👋", textKey: "hud.bottomBar.reactionWave", action: "wave", slot: "REACTION_WAVE" },
  { emoji: "😂", textKey: "hud.bottomBar.reactionLaugh", action: "laugh", slot: "REACTION_LAUGH" },
  { emoji: "🔥", textKey: "hud.bottomBar.reactionFire", action: "fire", slot: "REACTION_FIRE" },
  { emoji: "✌️", textKey: "hud.bottomBar.reactionBye", action: "bye", slot: "REACTION_BYE" },
];

export function reactionSlotForEmoji(emoji: string): AppIconSlot | null {
  return QUICK_REACTIONS.find((reaction) => reaction.emoji === emoji)?.slot ?? null;
}
