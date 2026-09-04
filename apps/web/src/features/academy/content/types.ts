// Modelo de contenido de una lección de teoría. Se guarda tal cual en el
// campo `content` (Json?) de LessonTranslation — el backend ya lo acepta como
// `unknown` y lo devuelve sin tocar, así que esto no necesita migración.
//
// Para agregar un tipo de bloque nuevo: sumar el miembro a `LessonBlock`, su
// caso en `content/normalize.ts` (defaults + saneo) y su entrada en
// `content/block-registry.tsx` (label + icono). El renderer y el editor los
// recorren desde ahí.

export const LESSON_CONTENT_VERSION = 2 as const;

export type HeadingLevel = 2 | 3 | 4;

export type CalloutVariant =
  | "tip"
  | "info"
  | "important"
  | "warning"
  | "success";

export type LessonBlockType =
  | "text"
  | "heading"
  | "code"
  | "callout"
  | "note"
  | "quote"
  | "image"
  | "list"
  | "divider";

interface BlockBase<T extends LessonBlockType> {
  id: string;
  type: T;
}

export interface TextBlock extends BlockBase<"text"> {
  markdown: string;
}

export interface HeadingBlock extends BlockBase<"heading"> {
  level: HeadingLevel;
  text: string;
}

export interface CodeBlock extends BlockBase<"code"> {
  language: string;
  code: string;
  filename?: string;
}

export interface CalloutBlock extends BlockBase<"callout"> {
  variant: CalloutVariant;
  title?: string;
  markdown: string;
}

export interface NoteBlock extends BlockBase<"note"> {
  markdown: string;
}

export interface QuoteBlock extends BlockBase<"quote"> {
  text: string;
  cite?: string;
}

export interface ImageBlock extends BlockBase<"image"> {
  url: string;
  alt: string;
  caption?: string;
}

export interface ListBlock extends BlockBase<"list"> {
  ordered: boolean;
  items: string[];
}

export type DividerBlock = BlockBase<"divider">;

export type LessonBlock =
  | TextBlock
  | HeadingBlock
  | CodeBlock
  | CalloutBlock
  | NoteBlock
  | QuoteBlock
  | ImageBlock
  | ListBlock
  | DividerBlock;

export interface LessonContentDoc {
  version: typeof LESSON_CONTENT_VERSION;
  blocks: LessonBlock[];
}

// Lo que la API puede devolver hoy en `content`: el doc nuevo, el formato
// viejo `{ markdown }`, un string suelto, o nada.
export type LessonContentInput =
  | LessonContentDoc
  | { markdown?: string | null }
  | string
  | null
  | undefined;
