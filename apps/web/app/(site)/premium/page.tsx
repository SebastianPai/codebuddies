"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Crown, Loader2 } from "lucide-react";
import { useTranslation } from "../../../src/i18n/useTranslation";
import { api } from "../../../utils/api";
import { useAuth } from "../../../hooks/useAuth";

interface PremiumSubscription {
  id: string;
  status: string;
  expiresAt: string;
}

export default function PremiumPage() {
  const t = useTranslation();
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();

  const [subscription, setSubscription] = useState<PremiumSubscription | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setLoadingStatus(false);
      return;
    }

    api
      .get<PremiumSubscription | null>("/subscriptions/premium/me")
      .then((data) => setSubscription(data))
      .catch(() => setError(t("site.premiumStatusError")))
      .finally(() => setLoadingStatus(false));
  }, [authLoading, isAuthenticated, t]);

  const handleSubscribe = async () => {
    if (!isAuthenticated) {
      router.push("/login?redirect=/premium");
      return;
    }

    setCheckingOut(true);
    setError(null);
    try {
      const { checkoutUrl } = await api.post<{ checkoutUrl: string }>(
        "/subscriptions/premium/checkout",
      );
      if (!checkoutUrl) throw new Error("missing checkoutUrl");
      window.location.href = checkoutUrl;
    } catch {
      setError(t("site.premiumCheckoutError"));
      setCheckingOut(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[rgb(var(--background))] px-4 text-[rgb(var(--text))]">
      <main className="max-w-xl rounded-xl border-4 border-[rgb(var(--border))] bg-[rgb(var(--card))] p-8 text-center">
        <Crown className="mx-auto text-[rgb(var(--primary))]" size={40} />
        <h1 className="mt-4 text-3xl font-black uppercase text-[rgb(var(--primary))]">
          {t("site.premiumTitle")}
        </h1>
        <p className="mt-4 text-[rgb(var(--secondary-text))]">
          {t("site.premiumDescription")}
        </p>

        {error && (
          <p className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-400">
            {error}
          </p>
        )}

        {loadingStatus ? (
          <div className="mt-8 flex items-center justify-center gap-2 text-[rgb(var(--secondary-text))]">
            <Loader2 className="animate-spin" size={18} />
            {t("common.loading")}
          </div>
        ) : subscription ? (
          <div className="mt-8 rounded-lg border border-[rgb(var(--primary))]/40 bg-[rgb(var(--primary))]/10 p-4">
            <p className="font-bold text-[rgb(var(--primary))]">
              {t("site.premiumActiveLabel")}
            </p>
            <p className="mt-1 text-sm text-[rgb(var(--secondary-text))]">
              {t("site.premiumExpiresLabel", {
                date: new Date(subscription.expiresAt).toLocaleDateString(),
              })}
            </p>
          </div>
        ) : (
          <button
            onClick={handleSubscribe}
            disabled={checkingOut}
            className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[rgb(var(--primary))] px-6 py-3 font-black uppercase text-black disabled:opacity-60"
          >
            {checkingOut && <Loader2 className="animate-spin" size={18} />}
            {t("site.subscribeNowCta")}
          </button>
        )}

        <Link
          href="/courses"
          className="mt-4 inline-flex text-sm text-[rgb(var(--secondary-text))] underline"
        >
          {t("site.viewCourses")}
        </Link>
      </main>
    </div>
  );
}
