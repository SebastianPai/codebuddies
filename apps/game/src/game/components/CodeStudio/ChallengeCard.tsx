"use client";

import { useEffect, useState } from "react";
import { Flag, Trophy } from "lucide-react";
import { getCodeStudioChallenge, joinCodeStudioChallenge, type ChallengeState } from "../../network/codestudio";
import { money, num } from "./ui";
import { useTranslation } from "../../../i18n/useTranslation";

// Reto de la semana (Fase 3): todos empiezan igual (mismo tipo de app y la
// misma caja, sin bonos), así gana quien decide mejor y no quien tiene más.
// Si la API todavía no tiene el reto, la tarjeta no se muestra.
export default function ChallengeCard({ onOpen }: { onOpen: (companyId: string) => void }) {
  const t = useTranslation();
  const [state, setState] = useState<ChallengeState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    getCodeStudioChallenge()
      .then((data) => !cancelled && setState(data))
      .catch(() => !cancelled && setState(null));
    return () => {
      cancelled = true;
    };
  }, []);

  if (!state || !state.appType) return null;
  const days = Math.floor(state.endsInMinutes / 1440);
  const hours = Math.floor((state.endsInMinutes % 1440) / 60);

  const join = async () => {
    if (state.myCompanyId) return onOpen(state.myCompanyId);
    setBusy(true);
    setError("");
    try {
      const company = await joinCodeStudioChallenge();
      onOpen(company.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="cs2-card cs2-challenge">
      <div className="cs2-card-head">
        <div>
          <span className="cs2-nextcard-eyebrow">
            <Flag size={13} aria-hidden="true" /> {t("codestudio.challenge.eyebrow", { week: state.week })}
          </span>
          <h3>{t("codestudio.challenge.title", { app: state.appType.name })}</h3>
          <p>{t("codestudio.challenge.text", { cash: money(state.startingCash) })}</p>
        </div>
        <span className="cs2-chip">{t("codestudio.challenge.ends", { days, hours })}</span>
      </div>
      <button type="button" className="cs2-nextcard-btn" disabled={busy} onClick={() => void join()}>
        {state.myCompanyId ? t("codestudio.challenge.continue") : t("codestudio.challenge.join")}
      </button>
      {error && <p className="cs2-warn-text">{error}</p>}
      {state.leaderboard.length > 0 && (
        <ol className="cs2-ranking cs2-challenge-board">
          {state.leaderboard.map((row, index) => (
            <li key={row.id} className={row.id === state.myCompanyId ? "you" : ""}>
              <b>{index === 0 ? <Trophy size={15} aria-label="1" /> : `#${index + 1}`}</b>
              <div>
                <span>{row.user?.username ?? row.name}</span>
                <small>{t("codestudio.ranking.users", { count: num(row.activeUsers) })}</small>
              </div>
              <div className="cs2-ranking-value">
                <b>{money(row.valuation)}</b>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
