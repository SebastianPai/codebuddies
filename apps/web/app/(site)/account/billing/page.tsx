"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, CreditCard } from "lucide-react";
import { useTranslation } from "../../../../src/i18n/useTranslation";
import { api } from "../../../../src/shared/api";
import { useAuth } from "../../../../hooks/useAuth";

export default function BillingPortalPage() {
  const t = useTranslation();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      window.location.href = "/login?redirect=/account/billing";
      return;
    }

    // Autenticado via fetch (Bearer token) -- luego window.location.href
    // hace la redirección real del navegador al portal hosteado de Paddle.
    api
      .get<{ url: string }>("/subscriptions/premium/billing-portal")
      .then((res) => {
        window.location.href = res.url;
      })
      .catch(() => {
        setError(t("pricing.billing.error"));
      });
  }, [authLoading, isAuthenticated, t]);

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 text-center text-[rgb(var(--text))]">
      {error ? (
        <div>
          <p className="text-red-400">{error}</p>
          <Link href="/pricing" className="mt-4 inline-block underline text-[rgb(var(--primary))]">
            {t("pricing.billing.backToPricing")}
          </Link>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <CreditCard className="text-[rgb(var(--primary))]" size={32} />
          <Loader2 className="animate-spin text-[rgb(var(--secondary-text))]" size={20} />
          <p className="text-[rgb(var(--secondary-text))]">{t("pricing.billing.redirecting")}</p>
        </div>
      )}
    </div>
  );
}
