"use client";

import { useEffect, useState } from "react";
import type { Paddle, PricePreviewResponse } from "@paddle/paddle-js";

export type PriceByPriceId = Record<string, PricePreviewResponse["data"]["details"]["lineItems"][number]>;

interface UsePricePreviewArgs {
  paddle: Paddle | undefined;
  priceIds: string[];
  // Codigo de pais detectado server-side (x-vercel-ip-country) -- undefined
  // si el header no vino, y en ese caso NUNCA se manda `address` para que
  // Paddle auto-detecte el pais del visitante en vez de asumir uno falso.
  countryCode?: string;
}

export function usePricePreview({ paddle, priceIds, countryCode }: UsePricePreviewArgs) {
  const [pricesByPriceId, setPricesByPriceId] = useState<PriceByPriceId>({});
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");

  useEffect(() => {
    if (!paddle || priceIds.length === 0) return;

    let cancelled = false;
    setStatus("loading");

    paddle
      .PricePreview({
        items: priceIds.map((priceId) => ({ priceId, quantity: 1 })),
        ...(countryCode ? { address: { countryCode } } : {}),
      })
      .then((response) => {
        if (cancelled) return;
        const byPriceId: PriceByPriceId = {};
        for (const item of response.data.details.lineItems) {
          byPriceId[item.price.id] = item;
        }
        setPricesByPriceId(byPriceId);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paddle, countryCode, priceIds.join(",")]);

  return { pricesByPriceId, status };
}
