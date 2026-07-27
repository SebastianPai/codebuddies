"use client";

import Link from "next/link";
import { Award, Check, Crown, Sparkles } from "lucide-react";
import { useTranslation } from "../../../src/i18n/useTranslation";

const plans = [
  {
    nameKey: "site.planFreeName",
    price: "$0",
    icon: Sparkles,
    ctaKey: "site.planFreeCta",
    href: "/register",
    featureKeys: ["site.planFreeFeature1", "site.planFreeFeature2", "site.planFreeFeature3", "site.planFreeFeature4"],
  },
  {
    nameKey: "site.planPremiumName",
    price: "$12/mo",
    icon: Crown,
    ctaKey: "site.planPremiumCta",
    href: "/premium",
    featured: true,
    featureKeys: ["site.planPremiumFeature1", "site.planPremiumFeature2", "site.planPremiumFeature3", "site.planPremiumFeature4"],
  },
  {
    nameKey: "site.planCertificateName",
    price: "$19",
    icon: Award,
    ctaKey: "site.planCertificateCta",
    href: "/certificates",
    featureKeys: ["site.planCertificateFeature1", "site.planCertificateFeature2", "site.planCertificateFeature3", "site.planCertificateFeature4"],
  },
] as const;

const faqs = [
  ["site.faq1Question", "site.faq1Answer"],
  ["site.faq2Question", "site.faq2Answer"],
  ["site.faq3Question", "site.faq3Answer"],
] as const;

export default function PricingPage() {
  const t = useTranslation();
  return (
    <div className="py-12">
      <section className="text-center">
        <p className="font-mono text-sm uppercase text-[rgb(var(--primary))]">
          {t("site.pricingLabel")}
        </p>
        <h1 className="mt-4 text-5xl font-black text-[rgb(var(--text))]">
          {t("site.pricingTitle")}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-[rgb(var(--secondary-text))]">
          {t("site.pricingDescription")}
        </p>
      </section>

      <section className="mt-12 grid gap-6 lg:grid-cols-3">
        {plans.map((plan) => {
          const Icon = plan.icon;
          return (
            <div
              key={plan.nameKey}
              className={`rounded-lg border p-6 ${
                plan.featured
                  ? "border-[rgb(var(--primary))] bg-[rgb(var(--primary))]/10"
                  : "border-[rgb(var(--border))] bg-[rgb(var(--card))]"
              }`}
            >
              <Icon className="text-[rgb(var(--primary))]" />
              <h2 className="mt-4 text-2xl font-black">{t(plan.nameKey)}</h2>
              <p className="mt-2 text-4xl font-black">{plan.price}</p>
              <ul className="mt-6 space-y-3 text-sm text-[rgb(var(--secondary-text))]">
                {plan.featureKeys.map((featureKey) => (
                  <li key={featureKey} className="flex gap-2">
                    <Check size={18} className="text-[rgb(var(--primary))]" />
                    {t(featureKey)}
                  </li>
                ))}
              </ul>
              <Link
                href={plan.href}
                className="mt-6 block rounded-full bg-[rgb(var(--primary))] px-5 py-3 text-center font-bold text-black"
              >
                {t(plan.ctaKey)}
              </Link>
            </div>
          );
        })}
      </section>

      <section className="mt-12 rounded-lg border border-[rgb(var(--border))] p-6">
        <h2 className="text-2xl font-black">{t("site.featureComparisonTitle")}</h2>
        <div className="mt-5 grid gap-3 text-sm md:grid-cols-4">
          {["site.comparisonCourses", "site.comparisonXpCoins", "site.comparisonPremiumAccess", "site.certificates"].map(
            (itemKey) => (
              <div key={itemKey} className="bg-[rgb(var(--card))] p-4">
                <p className="font-bold">{t(itemKey)}</p>
                <p className="mt-2 text-[rgb(var(--secondary-text))]">
                  {t("site.comparisonIncludedText")}
                </p>
              </div>
            ),
          )}
        </div>
      </section>

      <section className="mt-12 space-y-4">
        <h2 className="text-2xl font-black">{t("site.faqTitle")}</h2>
        {faqs.map(([questionKey, answerKey]) => (
          <div key={questionKey} className="border-b border-[rgb(var(--border))] py-4">
            <h3 className="font-bold">{t(questionKey)}</h3>
            <p className="mt-2 text-[rgb(var(--secondary-text))]">{t(answerKey)}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
