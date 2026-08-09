// Estilos del nombre flotante y la burbuja de chat, separados de PlayerHUD
// para que sean el único lugar que hay que tocar cuando se agregue
// personalización Premium a futuro (color del nombre, tema de burbuja,
// etc.) — hoy todos los jugadores usan DEFAULT_*/el tema "classic", pero
// PlayerHUD ya acepta un override parcial por jugador (ver
// HUDConfig.nameplateStyle/chatBubbleStyle/chatBubbleThemeId), así que
// conectar esa personalización más adelante es solo pasar un valor
// distinto acá, sin tocar la lógica de dibujado.
export interface NameplateStyle {
  fontFamily: string;
  fontSize: number;
  textColor: string;
  outlineColor: string;
  outlineWidth: number;
}

// Solo la "forma" de la burbuja (tipografía, radios, ancho máximo). El color
// vive aparte en ChatBubbleTheme para que un tema Premium pueda cambiar
// nada más que la paleta sin duplicar el resto del layout.
export interface ChatBubbleStyle {
  fontFamily: string;
  fontSize: number;
  borderWidth: number;
  cornerRadius: number;
  maxWidth: number;
  /** Tamaño del avatar circular que se muestra junto al nombre, en px. */
  avatarSize: number;
}

export const DEFAULT_NAMEPLATE_STYLE: NameplateStyle = {
  fontFamily: "Inter, system-ui, sans-serif",
  fontSize: 14,
  textColor: "#ffffff",
  outlineColor: "#0b0f1a",
  outlineWidth: 4,
};

export const DEFAULT_CHAT_BUBBLE_STYLE: ChatBubbleStyle = {
  fontFamily: "Inter, system-ui, sans-serif",
  fontSize: 13,
  borderWidth: 2,
  cornerRadius: 16,
  // Ancho generoso a propósito: la burbuja debe crecer para los LADOS antes
  // que hacia ABAJO — un mensaje corto/medio entra en una sola línea (burbuja
  // ancha y bajita); solo mensajes realmente largos llegan a envolver.
  maxWidth: 280,
  avatarSize: 26,
};

// Paleta de colores de burbuja: "classic"/"midnight" gratis, el resto
// Premium. Cada tema es solo color — el layout (tipografía, radios) sigue
// viniendo de ChatBubbleStyle, así que agregar un tema nuevo es agregar una
// entrada acá, nada más. `gradientColors` queda reservado sin usar todavía
// para una futura versión con degradados.
export interface ChatBubbleTheme {
  id: string;
  label: string;
  tier: "free" | "premium";
  backgroundColor: number;
  backgroundAlpha: number;
  borderColor: number;
  textColor: string;
  nameColor: string;
  gradientColors?: [number, number];
}

export const CHAT_BUBBLE_THEMES: Record<string, ChatBubbleTheme> = {
  classic: {
    id: "classic",
    label: "Clásico",
    tier: "free",
    backgroundColor: 0xfefefe,
    backgroundAlpha: 0.97,
    borderColor: 0x0b0f1a,
    textColor: "#111827",
    nameColor: "#4338ca",
  },
  midnight: {
    id: "midnight",
    label: "Medianoche",
    tier: "free",
    backgroundColor: 0x1c2333,
    backgroundAlpha: 0.96,
    borderColor: 0x475569,
    textColor: "#e2e8f0",
    nameColor: "#93c5fd",
  },
  gold: {
    id: "gold",
    label: "Oro",
    tier: "premium",
    backgroundColor: 0xfff7e0,
    backgroundAlpha: 0.97,
    borderColor: 0xd4af37,
    textColor: "#7a5b00",
    nameColor: "#a16207",
  },
  violet: {
    id: "violet",
    label: "Violeta",
    tier: "premium",
    backgroundColor: 0xf3e8ff,
    backgroundAlpha: 0.97,
    borderColor: 0x9333ea,
    textColor: "#581c87",
    nameColor: "#7e22ce",
  },
  electricBlue: {
    id: "electricBlue",
    label: "Azul eléctrico",
    tier: "premium",
    backgroundColor: 0xe0f7ff,
    backgroundAlpha: 0.97,
    borderColor: 0x0ea5e9,
    textColor: "#075985",
    nameColor: "#0284c7",
  },
  emerald: {
    id: "emerald",
    label: "Esmeralda",
    tier: "premium",
    backgroundColor: 0xe8fff3,
    backgroundAlpha: 0.97,
    borderColor: 0x10b981,
    textColor: "#065f46",
    nameColor: "#059669",
  },
  rose: {
    id: "rose",
    label: "Rosa",
    tier: "premium",
    backgroundColor: 0xffe9f1,
    backgroundAlpha: 0.97,
    borderColor: 0xec4899,
    textColor: "#9d174d",
    nameColor: "#db2777",
  },
  sunset: {
    id: "sunset",
    label: "Atardecer",
    tier: "premium",
    backgroundColor: 0xfff0e0,
    backgroundAlpha: 0.97,
    borderColor: 0xf97316,
    textColor: "#9a3412",
    nameColor: "#ea580c",
  },
};

export function resolveChatBubbleTheme(id?: string | null): ChatBubbleTheme {
  return (id && CHAT_BUBBLE_THEMES[id]) || CHAT_BUBBLE_THEMES.classic;
}
