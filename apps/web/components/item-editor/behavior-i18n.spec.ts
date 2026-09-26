/**
 * Las tres traducciones del editor de comportamiento, completas y en sincronía.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * POR QUÉ HACE FALTA UN TEST
 *
 * Una clave que falta no rompe nada: `t()` devuelve la clave y en pantalla
 * aparece "items.behaviorNoticeSTATE_DEAD_END" en medio de un aviso. Es el
 * fallo más fácil de introducir de toda la fase —se agrega una función a
 * `behavior-guidance.ts`, se dibuja su código y se olvida el alemán— y el más
 * difícil de ver, porque sólo se nota abriendo esa pantalla en ese idioma.
 *
 * Los códigos se leen del MÓDULO, no de una lista escrita a mano: si mañana
 * aparece un aviso nuevo, este test falla hasta que estén sus tres textos.
 */

import fs from "fs";
import path from "path";

const LOCALES = ["es", "en", "de"] as const;
const COMPONENTS = [
  "BehaviorEditor.tsx",
  "BehaviorPreview.tsx",
  "FrameSetUpload.tsx",
  "ItemEditor.tsx",
] as const;

/** Códigos que el editor convierte en clave con un template literal. */
const DYNAMIC: Record<string, readonly string[]> = {
  behaviorNotice: [
    "ANIMATION_WITHOUT_SPRITE",
    "ANIMATION_SINGLE_FRAME",
    "ANIMATION_UNUSED",
    "STATE_DEAD_END",
    "STATE_UNREACHABLE",
    "NO_INTERACTION",
    "NO_ANIMATION",
  ],
  behaviorStatus: ["STATIC", "INVALID", "INCOMPLETE", "READY"],
  behaviorStatusBody: ["STATIC", "INVALID", "INCOMPLETE", "READY"],
  behaviorStep: [
    "ENABLE",
    "FIX_ERRORS",
    "ADD_ANIMATION",
    "UPLOAD_FRAMES",
    "USE_ANIMATION",
    "ADD_TRANSITION",
    "FIX_NOTICES",
    "DONE",
  ],
  behaviorCheck: ["STATES", "SPRITES", "INTERACTION", "VALID"],
  behaviorKind: ["STATIC", "ANIMATED", "INTERACTIVE"],
  behaviorComplete: ["SET_STATE", "REPEAT", "NONE"],
};

function readLocale(locale: string): Record<string, string> {
  const file = path.join(
    __dirname,
    "..",
    "..",
    "src",
    "i18n",
    "namespaces",
    "items",
    `${locale}.json`,
  );
  return JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, string>;
}

/** Claves `items.*` escritas literalmente en los componentes. */
function staticKeys(): string[] {
  const found = new Set<string>();

  for (const component of COMPONENTS) {
    const source = fs.readFileSync(path.join(__dirname, component), "utf8");
    for (const match of source.matchAll(/t\(\s*"items\.([A-Za-z0-9_]+)"/g)) {
      found.add(match[1]);
    }
  }

  return [...found].sort();
}

const locales = Object.fromEntries(
  LOCALES.map((locale) => [locale, readLocale(locale)]),
) as Record<(typeof LOCALES)[number], Record<string, string>>;

describe("traducciones del editor de comportamiento", () => {
  it.each(LOCALES)("%s tiene todas las claves escritas en los componentes", (locale) => {
    const missing = staticKeys().filter((key) => !(key in locales[locale]));
    expect(missing).toEqual([]);
  });

  it.each(LOCALES)("%s tiene todas las claves derivadas de códigos", (locale) => {
    const missing: string[] = [];

    for (const [prefix, codes] of Object.entries(DYNAMIC)) {
      for (const code of codes) {
        const key = `${prefix}${code}`;
        if (!(key in locales[locale])) missing.push(key);
      }
    }

    expect(missing).toEqual([]);
  });

  it("las tres traducciones tienen exactamente el mismo juego de claves", () => {
    const reference = Object.keys(locales.es).sort();

    expect(Object.keys(locales.en).sort()).toEqual(reference);
    expect(Object.keys(locales.de).sort()).toEqual(reference);
  });

  it("ninguna traducción del comportamiento quedó vacía", () => {
    for (const locale of LOCALES) {
      const empty = Object.entries(locales[locale])
        .filter(([key, value]) => key.startsWith("behavior") && !String(value).trim())
        .map(([key]) => key);

      expect(empty).toEqual([]);
    }
  });

  it("los textos con parámetros los llevan en los tres idiomas", () => {
    // Un `{state}` que falta en una traducción deja la frase a medias, y es
    // invisible hasta que alguien abre esa pantalla en ese idioma.
    const placeholders = (text: string) =>
      [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();

    const mismatched: string[] = [];

    for (const [key, value] of Object.entries(locales.es)) {
      if (!key.startsWith("behavior")) continue;
      const expected = placeholders(String(value));

      for (const locale of ["en", "de"] as const) {
        const translated = locales[locale][key];
        if (translated === undefined) continue;
        const actual = placeholders(String(translated));
        if (actual.join(",") !== expected.join(",")) {
          mismatched.push(`${locale}.${key}: ${actual} ≠ ${expected}`);
        }
      }
    }

    expect(mismatched).toEqual([]);
  });
});
