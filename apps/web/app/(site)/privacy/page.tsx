"use client";

import { useTranslation } from "../../../src/i18n/useTranslation";

const sectionKeys = [
  ["site.privacySection1Title", "site.privacySection1Body"],
  ["site.privacySection2Title", "site.privacySection2Body"],
  ["site.privacySection3Title", "site.privacySection3Body"],
  ["site.privacySection4Title", "site.privacySection4Body"],
  ["site.privacySection5Title", "site.privacySection5Body"],
  ["site.privacySection6Title", "site.privacySection6Body"],
] as const;

export default function PrivacyPage() {
  const t = useTranslation();
  return (
    <article className="mx-auto max-w-4xl py-12 text-[rgb(var(--secondary-text))]">
      <p className="font-mono text-xs uppercase text-[rgb(var(--primary))]">
        {t("site.lastUpdatedLabel", { date: "June 20, 2026" })}
      </p>
      <h1 className="mt-3 text-5xl font-black text-[rgb(var(--text))]">
        {t("site.privacyPolicyTitle")}
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
