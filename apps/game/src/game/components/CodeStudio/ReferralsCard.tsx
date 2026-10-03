"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Megaphone, Rocket, ShoppingBag, Sparkles, UserPlus } from "lucide-react";
import { getCodeStudioReferrals, type ReferralOverview } from "../../network/codestudio";
import { CoinIcon } from "../shared/ThemeIcons";
import { money } from "./ui";
import { useTranslation } from "../../../i18n/useTranslation";

// Invita amigos: qué ganas cuando tu amigo avanza en CodeStudio (fundar,
// llegar a Lanzamiento, primera compra), la ventaja que él recibe y el
// descuento de campañas por tu red. Con la lista de amigos y sus hitos.

export default function ReferralsCard() {
  const t = useTranslation();
  const [data, setData] = useState<ReferralOverview | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getCodeStudioReferrals()
      .then(setData)
      .catch(() => setData(null));
  }, []);

  if (!data) return null;

  const copy = async () => {
    if (!data.link) return;
    try {
      await navigator.clipboard.writeText(data.link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Sin permiso de portapapeles: el enlace queda visible para copiarlo a mano.
    }
  };

  const steps = [
    { key: "founded", icon: Rocket, coins: data.milestones.founded },
    { key: "launched", icon: Sparkles, coins: data.milestones.launched },
    { key: "purchase", icon: ShoppingBag, coins: data.milestones.purchase },
  ] as const;

  return (
    <section className="cs2-card cs2-referrals">
      <span className="cs2-eyebrow">
        <UserPlus size={13} /> {t("codestudio.referrals.eyebrow")}
      </span>
      <h3>{t("codestudio.referrals.title")}</h3>
      <p className="cs2-muted">{t("codestudio.referrals.text", { bonus: money(data.friendStartingBonus) })}</p>

      <ol className="cs2-referral-steps">
        {steps.map(({ key, icon: Icon, coins }) => (
          <li key={key}>
            <Icon size={16} />
            <span>{t(`codestudio.referrals.step.${key}`)}</span>
            <b>
              <CoinIcon size={13} /> +{coins}
            </b>
          </li>
        ))}
        <li>
          <Megaphone size={16} />
          <span>
            {t("codestudio.referrals.network", {
              per: Math.round(data.networkDiscountPerFriend * 100),
              max: Math.round(data.networkDiscountMax * 100),
            })}
          </span>
          <b>{data.networkDiscount > 0 ? `-${Math.round(data.networkDiscount * 100)}%` : "0%"}</b>
        </li>
      </ol>

      {data.link ? (
        <div className="cs2-referral-link">
          <code>{data.link}</code>
          <button type="button" className="cs2-btn cs2-btn-primary" onClick={() => void copy()}>
            {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? t("codestudio.referrals.copied") : t("codestudio.referrals.copy")}
          </button>
        </div>
      ) : (
        <p className="cs2-muted">{t("codestudio.referrals.noLink")}</p>
      )}

      {data.friends.length > 0 && (
        <div className="cs2-referral-friends">
          <div className="cs2-referral-head">
            <b>{t("codestudio.referrals.friends", { count: data.friends.length })}</b>
            <span>
              <CoinIcon size={13} /> {t("codestudio.referrals.earned", { coins: data.coinsEarned })}
            </span>
          </div>
          <ul>
            {data.friends.map((friend) => (
              <li key={friend.username}>
                <span className="cs2-referral-name">{friend.username}</span>
                {steps.map(({ key, icon: Icon }) => (
                  <span key={key} className={`cs2-chip ${friend[key] ? "cs2-tone-good" : ""}`} title={t(`codestudio.referrals.step.${key}`)}>
                    <Icon size={12} /> {friend[key] ? <Check size={12} /> : "–"}
                  </span>
                ))}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
