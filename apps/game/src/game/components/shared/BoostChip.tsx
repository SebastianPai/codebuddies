"use client";

import { useEffect, useState } from "react";
import { apiGet } from "../../network/http";

// "x1.5" junto a las monedas mientras hay un boost de monedas activo
// (personal o comunitario, ver apps/api/src/modules/boosts). Se compra en
// la web (/pricing#boosts); acá solo se muestra.

type BoostOverview = {
  multiplier: number;
  community: { multiplier: number; sponsor: { username: string } } | null;
};

const POLL_MS = 60_000;
let cache: BoostOverview | null = null;

export default function BoostChip() {
  const [data, setData] = useState<BoostOverview | null>(cache);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      if (document.visibilityState !== "visible") return;
      apiGet<BoostOverview>("/boosts")
        .then((next) => {
          cache = next;
          if (!cancelled) setData(next);
        })
        .catch(() => {});
    };
    load();
    const timer = window.setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  if (!data || data.multiplier <= 1) return null;
  const title = data.community ? `Boost x${data.community.multiplier} · @${data.community.sponsor.username}` : `Boost x${data.multiplier}`;
  return (
    <span
      title={title}
      style={{
        marginLeft: 6,
        padding: "1px 6px",
        borderRadius: 999,
        background: "rgba(255, 210, 31, 0.18)",
        color: "#ffd21f",
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: 0.3,
      }}
    >
      x{data.multiplier}
    </span>
  );
}
