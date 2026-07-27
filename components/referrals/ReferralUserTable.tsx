"use client";

import Image from "next/image";
import ReferralStatusBadge from "./ReferralStatusBadge";
import { useTranslation } from "../../src/i18n/useTranslation";
import type { ReferralGrant, ReferralRecord } from "./referral-types";

function findRewardForReferral(referralId: string, history: ReferralGrant[]) {
  return history.find((grant) => grant.referral?.id === referralId) ?? null;
}

function Avatar({
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
        width={44}
        height={44}
        className="h-11 w-11 rounded-2xl object-cover"
      />
    );
  }

  return (
    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#d5ff3f] font-black text-black">
      {username.slice(0, 1).toUpperCase()}
    </div>
  );
}

export default function ReferralUserTable({
  referrals,
  history,
}: {
  referrals: ReferralRecord[];
  history: ReferralGrant[];
}) {
  const t = useTranslation();
  return (
    <>
      <div className="hidden overflow-hidden rounded-3xl border border-white/10 lg:block">
        <table className="w-full table-fixed bg-[#111111] text-left text-sm">
          <thead className="bg-black/40 text-white/55">
            <tr>
              <th className="px-5 py-4 font-bold">{t("referrals.user")}</th>
              <th className="px-5 py-4 font-bold">{t("referrals.status")}</th>
              <th className="px-5 py-4 font-bold">{t("referrals.registered")}</th>
              <th className="px-5 py-4 font-bold">{t("referrals.validation")}</th>
              <th className="px-5 py-4 font-bold">{t("referrals.reward")}</th>
            </tr>
          </thead>
          <tbody>
            {referrals.map((referral) => {
              const reward = findRewardForReferral(referral.id, history);
              const referredName = referral.referred?.username ?? t("referrals.user");
              return (
                <tr
                  key={referral.id}
                  className="border-t border-white/6 align-top hover:bg-white/[0.03]"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar
                        username={referredName}
                        avatarUrl={referral.referred?.avatarUrl}
                      />
                      <div className="min-w-0">
                        <p className="truncate font-bold">{referredName}</p>
                        <p className="truncate text-xs text-white/45">
                          {t("referrals.levelBadge", { level: referral.referred?.level ?? 0 })}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <ReferralStatusBadge status={referral.status} />
                  </td>
                  <td className="px-5 py-4 text-white/65">
                    {new Date(referral.createdAt).toLocaleDateString("es-CO")}
                  </td>
                  <td className="px-5 py-4 text-white/65">
                    {referral.validatedAt
                      ? new Date(referral.validatedAt).toLocaleDateString(
                          "es-CO",
                        )
                      : t("gamification.pending")}
                  </td>
                  <td className="px-5 py-4 text-white/65">
                    {reward?.reward?.name ?? reward?.rewardType ?? t("referrals.noRewardFallback")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 lg:hidden">
        {referrals.map((referral) => {
          const reward = findRewardForReferral(referral.id, history);
          const referredName = referral.referred?.username ?? t("referrals.user");
          return (
            <article
              key={referral.id}
              className="rounded-3xl border border-white/10 bg-[#111111] p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Avatar
                    username={referredName}
                    avatarUrl={referral.referred?.avatarUrl}
                  />
                  <div>
                    <p className="font-bold">{referredName}</p>
                    <p className="text-xs text-white/45">
                      {t("referrals.levelBadge", { level: referral.referred?.level ?? 0 })}
                    </p>
                  </div>
                </div>
                <ReferralStatusBadge status={referral.status} compact />
              </div>
              <dl className="mt-4 grid gap-3 text-sm text-white/65 sm:grid-cols-2">
                <div>
                  <dt className="text-white/40">{t("referrals.registered")}</dt>
                  <dd>{new Date(referral.createdAt).toLocaleDateString("es-CO")}</dd>
                </div>
                <div>
                  <dt className="text-white/40">{t("referrals.validation")}</dt>
                  <dd>
                    {referral.validatedAt
                      ? new Date(referral.validatedAt).toLocaleDateString(
                          "es-CO",
                        )
                      : t("gamification.pending")}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-white/40">{t("referrals.rewardGenerated")}</dt>
                  <dd>{reward?.reward?.name ?? reward?.rewardType ?? t("referrals.noRewardFallback")}</dd>
                </div>
              </dl>
            </article>
          );
        })}
      </div>
    </>
  );
}
