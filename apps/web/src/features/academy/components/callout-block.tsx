"use client";

import type { CSSProperties } from "react";

import { useTranslation } from "@/i18n/useTranslation";
import { classNames } from "@/shared/utils/class-names";
import { CALLOUT_STYLES } from "../content/block-registry";
import type { CalloutVariant } from "../content/types";
import { Markdown } from "./markdown";

interface CalloutBlockProps {
  variant: CalloutVariant;
  title?: string;
  markdown: string;
  className?: string;
}

/** Recuadro educativo tipo "lightbulb" del referente. Icono del sistema
 *  (lucide), acento por variante vía CSS var del tema. Sin emojis. */
export function CalloutBlock({
  variant,
  title,
  markdown,
  className,
}: CalloutBlockProps) {
  const t = useTranslation();
  const style = CALLOUT_STYLES[variant] ?? CALLOUT_STYLES.tip;
  const Icon = style.icon;
  const heading = title?.trim() || t(`site.academyLesson.callout.${variant}`);

  return (
    <div
      className={classNames("cb-callout", className)}
      style={{ "--cb-callout-accent": style.accent } as CSSProperties}
      data-variant={variant}
    >
      <div className="cb-callout__icon" aria-hidden>
        <Icon size={18} />
      </div>
      <div className="cb-callout__body">
        <p className="cb-callout__title">{heading}</p>
        {markdown.trim() && <Markdown className="cb-callout__text">{markdown}</Markdown>}
      </div>
    </div>
  );
}
