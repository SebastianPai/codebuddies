"use client";

import { useTranslation } from "../../../src/i18n/useTranslation";

const sectionKeys = [
  ["site.refundSection1Title", "site.refundSection1Body"],
  ["site.refundSection2Title", "site.refundSection2Body"],
  ["site.refundSection3Title", "site.refundSection3Body"],
  ["site.refundSection4Title", "site.refundSection4Body"],
  ["site.refundSection5Title", "site.refundSection5Body"],
] as const;

export default function RefundPolicyPage() {
  const t = useTranslation();
  return (
    <article className="mx-auto max-w-4xl py-12 text-[rgb(var(--secondary-text))]">
      <p className="font-mono text-xs uppercase text-[rgb(var(--primary))]">
        {t("site.lastUpdatedLabel", { date: "June 20, 2026" })}
      </p>
      <h1 className="mt-3 text-5xl font-black text-[rgb(var(--text))]">
        {t("site.refundPolicyTitle")}
      </h1>
      <div className="mt-10 space-y-8 leading-7">
        {sectionKeys.map(([titleKey, bodyKey]) => (
          <section key={titleKey}>
            <h2 className="mb-3 text-2xl font-black text-[rgb(var(--text))]">
              {t(titleKey)}
            </h2>
            <p>{t(bodyKey)}</p>
          </section>
        ))}
      </div>
    </article>
  );
}
