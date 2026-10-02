// Aviso de logro/recompensa del juego (ver RewardCelebrationHost.tsx).
// Cualquier parte del juego lo dispara con celebrate({...}); un solo host
// montado en Game.tsx lo dibuja encima de todo (incluido el PC).

export type CelebrationKind = "achievement" | "reward" | "level" | "stage";

export type CelebrationInput = {
  kind: CelebrationKind;
  title: string;
  subtitle?: string | null;
  xp?: number;
  coins?: number;
  items?: string[];
};

export const CELEBRATE_EVENT = "codebuddies:celebrate";

export function celebrate(input: CelebrationInput) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<CelebrationInput>(CELEBRATE_EVENT, { detail: input }));
}
