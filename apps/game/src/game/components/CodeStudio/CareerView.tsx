"use client";

import { Award, Check, Lock, Unlock } from "lucide-react";
import type { Catalog, Profile } from "./types";
import { ProgressBar, Stat, money } from "./ui";
import DailyMissions from "./DailyMissions";
import { useTranslation } from "../../../i18n/useTranslation";

export default function CareerView({ profile, catalog }: { profile: Profile; catalog: Catalog }) {
  const t = useTranslation();
  const earned = new Set(profile.milestones.map((milestone) => milestone.key));
  const levelSpan = Math.max(1, profile.nextLevelXp - profile.levelXp);

  return (
    <div className="cs2-stack">
      <section className="cs2-card cs2-career">
        <div className="cs2-level">
          <Award size={28} />
          <div>
            <span className="cs2-eyebrow">{t("codestudio.career.founder")}</span>
            <h3>{t("codestudio.career.level", { level: profile.level })}</h3>
            <small>{t("codestudio.career.xp", { xp: profile.xp, next: profile.nextLevelXp })}</small>
          </div>
        </div>
        <ProgressBar value={((profile.xp - profile.levelXp) / levelSpan) * 100} />
        <p className="cs2-muted">{t("codestudio.career.explain")}</p>
      </section>

      <DailyMissions daily={profile.daily} />

      <section className="cs2-stats">
        <Stat label={t("codestudio.career.startingBonus")} value={`+${money(profile.startingCashBonus)}`} hint={t("codestudio.career.startingBonusHint")} />
        <Stat label={t("codestudio.career.companies")} value={profile.companiesFounded} hint={t("codestudio.career.bankruptcies", { count: profile.bankruptcies })} />
        <Stat label={t("codestudio.career.bugs")} value={profile.bugsDiagnosed} hint={t("codestudio.career.firstTry", { count: profile.bugsFirstTry })} />
        <Stat label={t("codestudio.career.best")} value={money(profile.bestValuation)} />
      </section>

      <section className="cs2-card">
        <h3>{t("codestudio.career.appTypes")}</h3>
        <ul className="cs2-list">
          {catalog.appTypes.map((type) => {
            const unlocked = profile.level >= type.minFounderLevel;
            return (
              <li key={type.id} className={unlocked ? "" : "locked"}>
                {unlocked ? <Unlock size={15} /> : <Lock size={15} />}
                <div>
                  <b>{type.name}</b>
                  <small>{unlocked ? type.description : t("codestudio.career.unlocksAt", { level: type.minFounderLevel })}</small>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="cs2-card">
        <h3>{t("codestudio.career.milestones", { earned: earned.size, total: catalog.milestones.length })}</h3>
        <div className="cs2-milestones">
          {catalog.milestones.map((milestone) => {
            const done = earned.has(milestone.key);
            return (
              <article key={milestone.key} className={done ? "done" : ""}>
                <i>{done ? <Check size={14} /> : <Lock size={12} />}</i>
                <div>
                  <b>{milestone.name}</b>
                  <p>{milestone.description}</p>
                  <small>
                    +{milestone.xp} XP{milestone.coins > 0 ? ` · ${t("codestudio.common.coins", { count: milestone.coins })}` : ""}
                  </small>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
