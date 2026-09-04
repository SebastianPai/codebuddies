import {
  AlertTriangle,
  AlignLeft,
  CheckCircle2,
  Code2,
  Heading,
  Image as ImageIcon,
  Info,
  Lightbulb,
  List,
  Minus,
  Quote,
  ShieldAlert,
  StickyNote,
  type LucideIcon,
} from "lucide-react";

import type { CalloutVariant, LessonBlockType } from "./types";

// Fuente única de verdad para el menú "+ Agregar contenido" y las cabeceras
// de cada bloque en el editor. Sumar un tipo nuevo acá + su caso en
// normalize.ts alcanza para que aparezca en el editor.
export interface BlockDefinition {
  type: LessonBlockType;
  /** Clave i18n dentro de `admin.lessonContent.block`. */
  labelKey: string;
  icon: LucideIcon;
}

export const BLOCK_DEFINITIONS: BlockDefinition[] = [
  { type: "text", labelKey: "text", icon: AlignLeft },
  { type: "heading", labelKey: "heading", icon: Heading },
  { type: "code", labelKey: "code", icon: Code2 },
  { type: "callout", labelKey: "callout", icon: Lightbulb },
  { type: "note", labelKey: "note", icon: StickyNote },
  { type: "quote", labelKey: "quote", icon: Quote },
  { type: "image", labelKey: "image", icon: ImageIcon },
  { type: "list", labelKey: "list", icon: List },
  { type: "divider", labelKey: "divider", icon: Minus },
];

export function getBlockDefinition(type: LessonBlockType): BlockDefinition {
  return (
    BLOCK_DEFINITIONS.find((definition) => definition.type === type) ??
    BLOCK_DEFINITIONS[0]
  );
}

export const CALLOUT_VARIANTS: CalloutVariant[] = [
  "tip",
  "info",
  "important",
  "warning",
  "success",
];

// Icono + color de acento (vía CSS var del tema, funciona en dark/light/pink)
// para cada variante de callout. Sin emojis.
export const CALLOUT_STYLES: Record<
  CalloutVariant,
  { icon: LucideIcon; accent: string }
> = {
  tip: { icon: Lightbulb, accent: "var(--primary)" },
  info: { icon: Info, accent: "var(--cb-info)" },
  important: { icon: ShieldAlert, accent: "var(--primary)" },
  warning: { icon: AlertTriangle, accent: "var(--cb-warning)" },
  success: { icon: CheckCircle2, accent: "var(--success)" },
};

export const CODE_LANGUAGES = [
  "html",
  "css",
  "javascript",
  "typescript",
  "jsx",
  "tsx",
  "python",
  "sql",
  "bash",
  "json",
  "markdown",
  "plain",
] as const;
