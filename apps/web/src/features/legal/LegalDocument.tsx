"use client";

import Link from "next/link";
import { Mail } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { SUPPORT_EMAIL } from "@/config/site";
import { openCookieSettings } from "@/../components/consent/consent";
import { LEGAL_UPDATED_AT, type LegalDocSet, type LegalLang } from "./types";

const UI: Record<LegalLang, { updated: string; contents: string; contact: string; related: string; cookieSettings: string; locale: string }> = {
  es: { updated: "Última actualización", contents: "Contenido", contact: "¿Dudas? Escríbenos a", related: "Documentos relacionados", cookieSettings: "Cambiar preferencias de cookies", locale: "es-CO" },
  en: { updated: "Last updated", contents: "Contents", contact: "Questions? Write to us at", related: "Related documents", cookieSettings: "Change cookie preferences", locale: "en-US" },
  de: { updated: "Zuletzt aktualisiert", contents: "Inhalt", contact: "Fragen? Schreib uns an", related: "Weitere Dokumente", cookieSettings: "Cookie-Einstellungen ändern", locale: "de-DE" },
};

const RELATED: Array<{ href: string; label: Record<LegalLang, string> }> = [
  { href: "/terms", label: { es: "Términos y condiciones", en: "Terms and conditions", de: "Allgemeine Geschäftsbedingungen" } },
  { href: "/privacy", label: { es: "Política de privacidad", en: "Privacy policy", de: "Datenschutzerklärung" } },
  { href: "/refund-policy", label: { es: "Política de reembolsos", en: "Refund policy", de: "Rückerstattungsrichtlinie" } },
  { href: "/cookies", label: { es: "Política de cookies", en: "Cookie policy", de: "Cookie-Richtlinie" } },
];

// Los títulos se numeran al renderizar (el número escrito en el texto se
// ignora), así agregar una sección no desordena la numeración.
function sectionTitle(title: string, index: number) {
  return `${index + 1}. ${title.replace(/^\d+\s?(?:bis|ter|[a-z])?\.\s+/, "")}`;
}

function toLegalLang(lang: string | undefined): LegalLang {
  if (lang === "de") return "de";
  if (lang?.startsWith("en")) return "en";
  return "es";
}

// Documento legal en el idioma de la interfaz, con índice navegable. El
// texto vive en archivos por documento (privacy.ts, terms.ts…) en vez del
// diccionario de i18n: son textos largos que se versionan juntos.
export function LegalDocument({
  docs,
  currentHref,
  showCookieSettings = false,
}: {
  docs: LegalDocSet;
  currentHref: string;
  showCookieSettings?: boolean;
}) {
  const language = useLanguage();
  const l = toLegalLang(language?.lang);
  const doc = docs[l];
  const ui = UI[l];
  const updated = new Date(`${LEGAL_UPDATED_AT}T12:00:00`).toLocaleDateString(ui.locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <article className="mx-auto max-w-5xl py-8 text-[rgb(var(--secondary-text))] sm:py-12">
      <header className="border-b border-[rgb(var(--border))] pb-8">
        <p className="font-mono text-xs uppercase text-[rgb(var(--primary))]">
          {ui.updated}: {updated}
        </p>
        <h1 className="mt-3 text-4xl font-black text-[rgb(var(--text))] sm:text-5xl">{doc.title}</h1>
        <p className="mt-4 max-w-3xl text-base leading-7">{doc.summary}</p>
        {showCookieSettings && (
          <button
            type="button"
            onClick={openCookieSettings}
            className="mt-5 rounded-xl bg-[rgb(var(--button))] px-4 py-2.5 text-sm font-black text-[rgb(var(--button-text))] transition hover:brightness-110"
          >
            {ui.cookieSettings}
          </button>
        )}
      </header>

      <div className="mt-8 grid gap-10 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav aria-label={ui.contents} className="lg:sticky lg:top-28 lg:self-start">
          <details className="group rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 lg:open:bg-transparent" open>
            <summary className="cursor-pointer text-xs font-black uppercase tracking-wide text-[rgb(var(--text))]">
              {ui.contents}
            </summary>
            <ol className="mt-3 space-y-1.5 text-sm">
              {doc.sections.map((section, index) => (
                <li key={section.id}>
                  <a href={`#${section.id}`} className="block hover:text-[rgb(var(--primary))]">
                    {sectionTitle(section.title, index)}
                  </a>
                </li>
              ))}
            </ol>
          </details>
        </nav>

        <div className="min-w-0 space-y-10 leading-7">
          {doc.sections.map((section, index) => (
            <section key={section.id} id={section.id} className="scroll-mt-28">
              <h2 className="mb-3 text-xl font-black text-[rgb(var(--text))] sm:text-2xl">
                {sectionTitle(section.title, index)}
              </h2>
              {section.paragraphs?.map((paragraph, index) => (
                <p key={index} className="mt-3 first:mt-0">
                  {paragraph}
                </p>
              ))}
              {section.list && (
                <ul className="mt-3 list-disc space-y-1.5 pl-5 marker:text-[rgb(var(--primary))]">
                  {section.list.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              )}
              {section.table && (
                <div className="mt-4 overflow-x-auto rounded-xl border border-[rgb(var(--border))]">
                  <table className="w-full min-w-[560px] text-left text-sm">
                    <thead className="bg-[rgb(var(--card))] text-[rgb(var(--text))]">
                      <tr>
                        {section.table.headers.map((header) => (
                          <th key={header} className="px-3 py-2 font-bold">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {section.table.rows.map((row, index) => (
                        <tr key={index} className="border-t border-[rgb(var(--border))]">
                          {row.map((cell, cellIndex) => (
                            <td key={cellIndex} className="px-3 py-2 align-top">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ))}

          <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5">
            <p className="flex flex-wrap items-center gap-2 text-sm">
              <Mail size={16} className="text-[rgb(var(--primary))]" />
              {ui.contact}{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="font-bold text-[rgb(var(--primary))] break-all">
                {SUPPORT_EMAIL}
              </a>
            </p>
            <p className="mt-4 text-xs font-black uppercase tracking-wide text-[rgb(var(--text))]">{ui.related}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {RELATED.filter((item) => item.href !== currentHref).map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-full border border-[rgb(var(--border))] px-3 py-1.5 text-xs font-bold text-[rgb(var(--text))] transition hover:border-[rgb(var(--primary)/0.6)]"
                >
                  {item.label[l]}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
