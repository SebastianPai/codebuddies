export type LegalLang = "es" | "en" | "de";

export interface LegalSection {
  id: string;
  title: string;
  paragraphs?: string[];
  list?: string[];
  // Tabla simple (p. ej. el detalle de cookies).
  table?: { headers: string[]; rows: string[][] };
}

export interface LegalDoc {
  title: string;
  summary: string;
  sections: LegalSection[];
}

export type LegalDocSet = Record<LegalLang, LegalDoc>;

// Fecha de entrada en vigor de la versión actual de los documentos.
export const LEGAL_UPDATED_AT = "2026-09-26";
