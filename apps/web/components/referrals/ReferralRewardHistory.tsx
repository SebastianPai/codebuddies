"use client";

import Image from "next/image";
import ReferralStatusBadge from "./ReferralStatusBadge";
import { useTranslation } from "../../src/i18n/useTranslation";
import type { ReferralGrant } from "./referral-types";

function HistoryAvatar({
  username,
  avatarUrl,
}: {
  username: string;
  avatarUrl?: string | null;
}) {
  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt={username}
        width={40}
        height={40}
        className="h-10 w-10 rounded-2xl object-cover"
      />
    );
  }

  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-sm font-black">
      {username.slice(0, 1).toUpperCase()}
    </div>
  );
}

export default function ReferralRewardHistory({
  history,
}: {
  history: ReferralGrant[];
}) {
  const t = useTranslation();
  return (
    <div className="space-y-3">
      {history.map((grant) => {
        const user = grant.referral?.referred;
        const rewardName =
          grant.reward?.name ??
          grant.item?.translations?.[0]?.name ??
          grant.rewardType;

        return (
          <article
            key={grant.id}
            className="rounded-3xl border border-white/10 bg-black p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <HistoryAvatar
                  username={user?.username ?? t("referrals.rewardFallbackName")}
                  avatarUrl={user?.avatarUrl}
                />
                <div>
                  <p className="font-bold">{rewardName}</p>
                  <p className="text-sm text-white/45">
                    {user ? t("referrals.generatedByPrefix", { username: user.username }) : t("referrals.programRewardFallback")}
                  </p>
                </div>
              </div>
              <ReferralStatusBadge status={grant.status} compact />
            </div>
            <p className="mt-3 text-sm text-white/60">
              {new Date(grant.grantedAt).toLocaleString("es-CO")}
            </p>
          </article>
        );
      })}
    </div>
  );
}
