"use client";

import Link from "next/link";
import { useTranslation } from "../../../src/i18n/useTranslation";

const sectionKeys = [
  ["site.termsSection1Title", "site.termsSection1Body"],
  ["site.termsSection2Title", "site.termsSection2Body"],
  ["site.termsSection3Title", "site.termsSection3Body"],
  ["site.termsSection4Title", "site.termsSection4Body"],
  ["site.termsSection5Title", "site.termsSection5Body"],
  ["site.termsSection6Title", "site.termsSection6Body"],
] as const;

export default function TermsPage() {
  const t = useTranslation();
  return (
    <LegalShell title={t("site.termsOfServiceTitle")} updated="June 20, 2026">
      {sectionKeys.map(([titleKey, bodyKey]) => (
        <section key={titleKey} className="space-y-3">
          <h2 className="text-2xl font-black text-[rgb(var(--text))]">
            {t(titleKey)}
          </h2>
          <p>{t(bodyKey)}</p>
        </section>
      ))}
      <p>
        {t("site.termsClosingPrefix")}{" "}
        <Link href="/privacy">{t("site.privacyPolicyTitle")}</Link>{" "}
        {t("site.and")}{" "}
        <Link href="/refund-policy">{t("site.refundPolicyTitle")}</Link>{" "}
        {t("site.termsClosingSuffix")}
      </p>
    </LegalShell>
  );
}

function LegalShell({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  const t = useTranslation();
  return (
    <article className="mx-auto max-w-4xl py-12 text-[rgb(var(--secondary-text))]">
      <div className="mb-10 border-b border-[rgb(var(--border))] pb-8">
        <p className="font-mono text-xs uppercase text-[rgb(var(--primary))]">
          {t("site.lastUpdatedLabel", { date: updated })}
        </p>
        <h1 className="mt-3 text-5xl font-black text-[rgb(var(--text))]">
          {title}
        </h1>
      </div>
      <div className="space-y-8 leading-7 [&_a]:text-[rgb(var(--primary))]">
        {children}
      </div>
    </article>
  );
}
