"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { sileo } from "sileo";
import { Users, Zap } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { useBoosts } from "./use-boosts";

const SEEN_KEY = "cb-boost-announced";

function alreadyAnnounced(id: string) {
  try {
    return window.sessionStorage.getItem(SEEN_KEY) === id;
  } catch {
    return false;
  }
}

function markAnnounced(id: string) {
  try {
    window.sessionStorage.setItem(SEEN_KEY, id);
  } catch {
    // Sin storage: a lo sumo se vuelve a anunciar en la próxima página.
  }
}

// Anuncio centrado (mismo sistema de avisos del juego) cuando empieza un
// boost de monedas: el comunitario con el nombre del Mecenas o, si no, el
// personal. Una vez por boost y por pestaña; el "xN" fijo vive en el navbar
// (BoostMultiplierChip).
export function BoostBanner() {
  const t = useTranslation();
  const router = useRouter();
  const { data } = useBoosts();
  const community = data?.community ?? null;
  const personal = data?.personal ?? null;
  const announceId = community ? `c:${community.sponsor.id}:${community.endsAt}` : personal ? `p:${personal.endsAt}` : null;

  useEffect(() => {
    if (!announceId || alreadyAnnounced(announceId)) return;
    markAnnounced(announceId);
    sileo.success({
      position: "top-center",
      duration: 7000,
      icon: community ? <Users size={18} /> : <Zap size={18} />,
      title: community
        ? t("pricing.boosts.banner.title", { mult: community.multiplier })
        : t("pricing.boosts.banner.mine", { mult: personal!.multiplier, time: "24 h" }),
      description: community ? t("pricing.boosts.banner.by", { name: `@${community.sponsor.username}` }) : undefined,
      button: { title: t("pricing.boosts.banner.cta"), onClick: () => router.push("/pricing#boosts") },
    });
    // Solo al cambiar de boost: el resto de datos viaja con el id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [announceId]);

  return null;
}

/** "x1.5" junto a las monedas del navbar mientras hay un boost activo. */
export function BoostMultiplierChip() {
  const { data } = useBoosts();
  if (!data || data.multiplier <= 1) return null;
  return (
    <span className="rounded-full bg-[rgb(var(--accent)/0.18)] px-1.5 text-[10px] font-black text-[rgb(var(--accent))]" title="Boost">
      x{data.multiplier}
    </span>
  );
}
