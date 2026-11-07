"use client";

import { Target, Terminal } from "lucide-react";
import { LessonContentRenderer, Markdown, type LessonContentDoc } from "@/features/academy";
import { useTranslation } from "@/i18n/useTranslation";

// Instrucciones de los ejercicios de Buddy y la nave, más claras que el texto
// suelto: la misión grande arriba, la imagen de cómo tiene que quedar (SVG que
// generan los scripts del curso con el motor real) y las órdenes como fichas
// de código. El resto de los bloques se muestra igual que en la teoría.
const ORDERS_TITLE = /(órdenes|orders|commands|befehle)/i;

export function MissionPanel({ doc }: { doc: LessonContentDoc }) {
  const t = useTranslation();
  const blocks = doc.blocks;
  const mission = blocks.find((block) => block.type === "text");
  const images = blocks.filter((block) => block.type === "image");
  const orders = blocks.find((block) => block.type === "callout" && ORDERS_TITLE.test(block.title ?? ""));
  const rest = blocks.filter((block) => block !== mission && block !== orders && block.type !== "image");
  const chips = orders && orders.type === "callout" ? [...orders.markdown.matchAll(/`([^`]+)`/g)].map((match) => match[1]) : [];

  return (
    <div className="space-y-5">
      {mission && mission.type === "text" && (
        <section className="rounded-2xl border-2 border-yellow-400/70 bg-gradient-to-br from-yellow-400/15 to-transparent p-5">
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-yellow-400">
            <Target size={16} /> {t("site.missionTitle")}
          </p>
          <Markdown className="mt-2 text-[17px] font-semibold leading-7 text-[rgb(var(--text))]">{mission.markdown}</Markdown>
        </section>
      )}

      {images.map((block) =>
        block.type === "image" && block.url ? (
          <figure key={block.id} className="overflow-hidden rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={block.url} alt={block.alt} className="block w-full" />
            {block.caption?.trim() && (
              <figcaption className="px-4 py-2 text-xs font-bold uppercase tracking-wide text-[rgb(var(--secondary-text))]">
                {block.caption}
              </figcaption>
            )}
          </figure>
        ) : null,
      )}

      {chips.length > 0 && (
        <section>
          <p className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[rgb(var(--secondary-text))]">
            <Terminal size={14} /> {t("site.missionOrders")}
          </p>
          <div className="flex flex-wrap gap-2">
            {chips.map((chip) => (
              <code
                key={chip}
                className="rounded-lg border border-emerald-400/40 bg-emerald-400/10 px-2.5 py-1.5 font-mono text-[13px] font-semibold text-[rgb(var(--text))]"
              >
                {chip}
              </code>
            ))}
          </div>
        </section>
      )}

      {rest.length > 0 && <LessonContentRenderer doc={{ ...doc, blocks: rest }} />}
    </div>
  );
}
