"use client";

import { CalendarCheck, Check, Gift } from "lucide-react";
import type { Profile } from "./types";
import { ProgressBar, num } from "./ui";
import { CoinIcon } from "../shared/ThemeIcons";
import { useTranslation } from "../../../i18n/useTranslation";

// Misiones del día: 3 metas chicas (fácil, media, difícil) y un bono por
// completarlas todas. Se cumplen jugando cualquiera de tus empresas.
export default function DailyMissions({ daily, compact = false }: { daily: Profile["daily"]; compact?: boolean }) {
  const t = useTranslation();
  const hours = Math.floor(daily.resetsInMinutes / 60);
  const minutes = daily.resetsInMinutes % 60;
  const doneCount = daily.missions.filter((mission) => mission.done).length;

  return (
    <section className={`cs2-card cs2-daily ${compact ? "compact" : ""}`}>
      <div className="cs2-card-head">
        <h3>
          <CalendarCheck size={16} /> {t("codestudio.daily.title", { done: doneCount, total: daily.missions.length })}
        </h3>
        <span className="cs2-chip">{t("codestudio.daily.resets", { hours, minutes })}</span>
      </div>
      <ul className="cs2-daily-list">
        {daily.missions.map((mission) => (
          <li key={mission.key} className={mission.done ? "done" : ""}>
            <i>{mission.done ? <Check size={13} /> : null}</i>
            <div>
              <div className="cs2-daily-row">
                <b>{mission.label}</b>
                <small>
                  +{mission.xp} XP{mission.coins > 0 && <> · <CoinIcon size={11} /> {mission.coins}</>}
                </small>
              </div>
              {!mission.done && (
                <>
                  <ProgressBar value={(mission.progress / Math.max(1, mission.target)) * 100} />
                  <small>
                    {num(mission.progress)} / {num(mission.target)}
                  </small>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
      <p className={`cs2-daily-bonus ${daily.bonus.done ? "done" : ""}`}>
        <Gift size={14} />
        {daily.bonus.done
          ? t("codestudio.daily.bonusDone")
          : t("codestudio.daily.bonus", { xp: daily.bonus.xp, coins: daily.bonus.coins })}
      </p>
    </section>
  );
}
