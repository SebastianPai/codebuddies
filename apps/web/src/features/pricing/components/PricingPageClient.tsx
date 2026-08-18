"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "../../../i18n/useTranslation";
import { api } from "../../../shared/api";
import { useAuth } from "../../../../hooks/useAuth";
import {
  getCertificateProduct,
  getCoinPacks,
  getSubscriptionPlan,
} from "@/config/paddle-catalog";
import { usePaddle } from "../lib/usePaddle";
import { usePricePreview } from "../lib/usePricePreview";
import { ProPricingCard } from "./ProPricingCard";
import { CertificateCard } from "./CertificateCard";
import { CoinPackCard } from "./CoinPackCard";

type BillingInterval = "monthly" | "yearly";

interface PremiumCheckoutResponse {
  providerSubscriptionId: string;
  checkoutUrl: string;
}

interface CoinCheckoutResponse {
  purchase: { id: string };
  checkout: { providerPaymentId: string; checkoutUrl: string };
}

const OVERLAY_CHECKOUT_SETTINGS = {
  displayMode: "overlay" as const,
  variant: "one-page" as const,
};

export function PricingPageClient({ countryCode }: { countryCode?: string }) {
  const t = useTranslation();
  const router = useRouter();
  // El email para el prefill de Paddle Checkout viaja server-side (el
  // backend ya conoce req.user.email al crear la transacción), no hace
  // falta leerlo acá.
  const { isAuthenticated } = useAuth();
  const { paddle, error: paddleError } = usePaddle();

  const [billingInterval, setBillingInterval] = useState<BillingInterval>("yearly");
  const [checkingOutKey, setCheckingOutKey] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Catálogo (price ids) -- se computa una sola vez, no depende de estado.
  const subscriptionPlan = useMemo(() => getSubscriptionPlan(), []);
  const certificateProduct = useMemo(() => getCertificateProduct(), []);
  const coinPacks = useMemo(() => getCoinPacks(), []);

  const allPriceIds = useMemo(
    () => [
      subscriptionPlan.monthlyPriceId,
      subscriptionPlan.yearlyPriceId,
      certificateProduct.priceId,
      ...coinPacks.map((pack) => pack.priceId),
    ],
    [subscriptionPlan, certificateProduct, coinPacks],
  );

  const { pricesByPriceId, status: priceStatus } = usePricePreview({
    paddle,
    priceIds: allPriceIds,
    countryCode,
  });

  function requireAuthOrRedirect(): boolean {
    if (isAuthenticated) return true;
    router.push("/login?redirect=/pricing");
    return false;
  }

  function openOverlayCheckout(transactionId: string, successPath: string) {
    if (!paddle) return;
    paddle.Checkout.open({
      transactionId,
      settings: {
        ...OVERLAY_CHECKOUT_SETTINGS,
        successUrl: `${window.location.origin}${successPath}`,
      },
    });
  }

  async function handleProCheckout() {
    if (!requireAuthOrRedirect()) return;
    setCheckoutError(null);
    setCheckingOutKey("pro");
    try {
      const res = await api.post<PremiumCheckoutResponse>("/subscriptions/premium/checkout", {
        billingInterval,
      });
      openOverlayCheckout(res.providerSubscriptionId, "/welcome");
    } catch {
      setCheckoutError(t("common.unexpectedError"));
    } finally {
      setCheckingOutKey(null);
    }
  }

  async function handleCoinCheckout(packageKey: string) {
    if (!requireAuthOrRedirect()) return;
    setCheckoutError(null);
    setCheckingOutKey(packageKey);
    try {
      const res = await api.post<CoinCheckoutResponse>("/coins/purchases", { packageKey });
      openOverlayCheckout(res.checkout.providerPaymentId, "/shop");
    } catch {
      setCheckoutError(t("common.unexpectedError"));
    } finally {
      setCheckingOutKey(null);
    }
  }

  function handleCertificateCta() {
    router.push("/certificates");
  }

  return (
    <div className="py-12">
      <section className="text-center">
        <h1 className="text-5xl font-black text-[rgb(var(--text))]">{t("pricing.title")}</h1>
        <p className="mx-auto mt-4 max-w-2xl text-[rgb(var(--secondary-text))]">{t("pricing.subtitle")}</p>
      </section>

      {paddleError && (
        <p className="mx-auto mt-6 max-w-2xl rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-center text-sm text-red-400">
          {paddleError}
        </p>
      )}
      {checkoutError && (
        <p className="mx-auto mt-6 max-w-2xl rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-center text-sm text-red-400">
          {checkoutError}
        </p>
      )}
      {!isAuthenticated && (
        <p className="mx-auto mt-4 max-w-2xl text-center text-xs font-semibold text-[rgb(var(--secondary-text))]">
          {t("pricing.loginRequired")}
        </p>
      )}

      <section className="mx-auto mt-12 grid max-w-5xl gap-6 lg:grid-cols-2">
        <ProPricingCard
          t={t}
          billingInterval={billingInterval}
          onBillingIntervalChange={setBillingInterval}
          monthlyPriceId={subscriptionPlan.monthlyPriceId}
          yearlyPriceId={subscriptionPlan.yearlyPriceId}
          pricesByPriceId={pricesByPriceId}
          priceStatus={priceStatus}
          onCheckout={handleProCheckout}
          checkingOut={checkingOutKey === "pro"}
        />

        <CertificateCard
          t={t}
          priceId={certificateProduct.priceId}
          pricesByPriceId={pricesByPriceId}
          priceStatus={priceStatus}
          onBuy={handleCertificateCta}
        />
      </section>

      <section className="mx-auto mt-16 max-w-5xl">
        <div className="text-center">
          <h2 className="text-2xl font-black text-[rgb(var(--text))]">{t("pricing.coins.title")}</h2>
          <p className="mt-2 text-sm text-[rgb(var(--secondary-text))]">{t("pricing.coins.subtitle")}</p>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {coinPacks.map((pack) => (
            <CoinPackCard
              key={pack.key}
              t={t}
              pack={pack}
              pricesByPriceId={pricesByPriceId}
              priceStatus={priceStatus}
              onBuy={() => handleCoinCheckout(pack.key)}
              checkingOut={checkingOutKey === pack.key}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
