"use client";

import { useEffect, useState } from "react";
import { initializePaddle, type Paddle, type PaddleEventData } from "@paddle/paddle-js";
import { getPaddleClientToken, getPaddleEnvironment } from "@/config/paddle-catalog";
import { trackEvent } from "@/../components/analytics/events";

// Paddle avisa cuando se abre y cuando se completa el checkout: se reenvían
// a GA4 como begin_checkout/purchase (con monto y moneda reales).
function trackPaddleEvent(event: PaddleEventData) {
  const data = event.data;
  if (!data) return;
  const ecommerce = {
    currency: data.currency_code,
    value: data.totals?.total,
    items: (data.items ?? []).map((item) => ({
      item_id: item.price_id,
      item_name: item.product?.name ?? item.price_name ?? item.price_id,
      quantity: item.quantity,
      price: item.totals?.total,
    })),
  };
  if (event.name === "checkout.loaded") {
    trackEvent("begin_checkout", { ecommerce });
  } else if (event.name === "checkout.completed") {
    trackEvent("purchase", {
      ecommerce: { ...ecommerce, transaction_id: data.transaction_id },
    });
  }
}

// Un solo Paddle.js inicializado por página, compartido entre todas las
// cards (Pro/Certificado/Coins) -- initializePaddle() descarga el script de
// Paddle una sola vez y cachea la instancia.
let paddlePromise: Promise<Paddle | undefined> | null = null;

function getPaddleInstancePromise(): Promise<Paddle | undefined> {
  if (!paddlePromise) {
    paddlePromise = initializePaddle({
      token: getPaddleClientToken(),
      environment: getPaddleEnvironment(),
      eventCallback: trackPaddleEvent,
    });
  }
  return paddlePromise;
}

export function usePaddle() {
  const [paddle, setPaddle] = useState<Paddle | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getPaddleInstancePromise()
      .then((instance) => {
        if (!cancelled) setPaddle(instance);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { paddle, error };
}
