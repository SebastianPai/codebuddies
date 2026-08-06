"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Award, Check, Crown, Sparkles, type LucideIcon } from "lucide-react";
import { useLanguage } from "../../../src/i18n/LanguageContext";
import { useTranslation } from "../../../src/i18n/useTranslation";
import { api } from "../../../src/shared/api";
import { Skeleton } from "../../../src/shared/ui";

interface LocalizedText {
  es: string;
  en: string;
  zh: string;
}

interface PricingPlan {
  id: string;
  key: string;
  priceUsd: string;
  billingInterval: "NONE" | "MONTHLY" | "YEARLY";
  featured: boolean;
  icon: string;
  ctaHref: string;
  name: LocalizedText;
  ctaLabel: LocalizedText;
  features: LocalizedText[];
}

const ICONS: Record<string, LucideIcon> = { Sparkles, Crown, Award };

const faqs = [
  ["site.faq1Question", "site.faq1Answer"],
  ["site.faq2Question", "site.faq2Answer"],
  ["site.faq3Question", "site.faq3Answer"],
] as const;

function localeKey(lang: string): keyof LocalizedText {
  if (lang.startsWith("en")) return "en";
  if (lang.startsWith("zh")) return "zh";
  return "es";
}

function formatPrice(priceUsd: string, billingInterval: PricingPlan["billingInterval"]): string {
  const value = Number(priceUsd);
  const amount = Number.isInteger(value) ? `$${value}` : `$${value.toFixed(2)}`;
  return billingInterval === "MONTHLY" ? `${amount}/mo` : amount;
}

export default function PricingPage() {
  const t = useTranslation();
  const languageCtx = useLanguage();
  const locale = localeKey(languageCtx?.lang ?? "es");
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");

  useEffect(() => {
    let cancelled = false;
    api
      .get<PricingPlan[]>("/pricing/plans")
      .then((data) => {
        if (cancelled) return;
        setPlans(data);
        setStatus("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
        {status === "loading" ? (
          <>
            <Skeleton className="h-96 rounded-lg" />
            <Skeleton className="h-96 rounded-lg" />
            <Skeleton className="h-96 rounded-lg" />
          </>
        ) : status === "error" ? (
          <p className="col-span-full text-center text-[rgb(var(--secondary-text))]">{t("common.unexpectedError")}</p>
        ) : (
          plans.map((plan) => {
            const Icon = ICONS[plan.icon] ?? Sparkles;
            return (
              <div
                key={plan.id}
                className={`rounded-lg border p-6 ${
                  plan.featured
                    ? "border-[rgb(var(--primary))] bg-[rgb(var(--primary))]/10"
                    : "border-[rgb(var(--border))] bg-[rgb(var(--card))]"
                }`}
              >
                <Icon className="text-[rgb(var(--primary))]" />
                <h2 className="mt-4 text-2xl font-black">{plan.name[locale]}</h2>
                <p className="mt-2 text-4xl font-black">{formatPrice(plan.priceUsd, plan.billingInterval)}</p>
                <ul className="mt-6 space-y-3 text-sm text-[rgb(var(--secondary-text))]">
                  {plan.features.map((feature) => (
                    <li key={feature[locale]} className="flex gap-2">
                      <Check size={18} className="text-[rgb(var(--primary))]" />
                      {feature[locale]}
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.ctaHref}
                  className="mt-6 block rounded-full bg-[rgb(var(--primary))] px-5 py-3 text-center font-bold text-black"
                >
                  {plan.ctaLabel[locale]}
                </Link>
              </div>
            );
          })
        )}
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
