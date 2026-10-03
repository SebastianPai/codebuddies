"use client";

import { useEffect, useState } from "react";
import { Bug, Gauge, ThumbsDown, ThumbsUp, UserPlus, Wallet } from "lucide-react";
import Modal from "../shared/Modal";
import { getCodeStudioCandidates, type Candidate } from "../../network/codestudio";
import { ProgressBar, money } from "./ui";
import { useTranslation } from "../../../i18n/useTranslation";

// Candidatos de un rol: Junior, Semi-senior y Senior, con su rasgo a la
// vista y barras de cuánto cambia el equipo si entran (velocidad, bugs,
// sueldos) más la compatibilidad con lo que necesita la empresa ahora.

type Props = {
  companyId: string;
  role: { id: string; name: string };
  cash: number;
  busy: boolean;
  onHire: (candidateIndex: number) => void;
  onClose: () => void;
};

function Delta({ value, inverse = false, suffix = "%" }: { value: number; inverse?: boolean; suffix?: string }) {
  const good = inverse ? value < 0 : value > 0;
  const tone = value === 0 ? "" : good ? "cs2-tone-good" : "cs2-tone-bad";
  return (
    <b className={tone}>
      {value > 0 ? "+" : ""}
      {value}
      {suffix}
    </b>
  );
}

export default function CandidatesModal({ companyId, role, cash, busy, onHire, onClose }: Props) {
  const t = useTranslation();
  const [data, setData] = useState<{ refreshInMinutes: number; candidates: Candidate[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCodeStudioCandidates(companyId, role.id)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, [companyId, role.id]);

  return (
    <Modal className="cs2-modal cs2-candidates-modal" title={t("codestudio.candidates.title", { role: role.name })} onClose={onClose}>
      {!data && !error && <p className="cs2-muted">{t("codestudio.common.loading")}</p>}
      {error && <p className="cs2-warn-text">{error}</p>}
      {data && (
        <div className="cs2-stack">
          <p className="cs2-muted">{t("codestudio.candidates.hint", { minutes: data.refreshInMinutes })}</p>
          <div className="cs2-candidates">
            {data.candidates.map((candidate) => {
              const { impact } = candidate;
              const fitTone = impact.fit >= 70 ? "good" : impact.fit >= 45 ? "warn" : "bad";
              return (
                <article key={candidate.index} className={`cs2-card cs2-candidate cs2-candidate-${candidate.trait.tone}`}>
                  <header>
                    <div>
                      <b>{candidate.name}</b>
                      <small className="cs2-muted">{t("codestudio.candidates.age", { age: candidate.age })}</small>
                    </div>
                    <span className={`cs2-seniority cs2-seniority-${candidate.seniority.key}`}>{candidate.seniority.name}</span>
                  </header>

                  <div className="cs2-candidate-fit">
                    <span>{t("codestudio.candidates.fit")}</span>
                    <b className={`cs2-tone-${fitTone}`}>{impact.fit}%</b>
                  </div>
                  <ProgressBar value={impact.fit} tone={fitTone} />

                  <dl className="cs2-candidate-impact">
                    <div>
                      <dt>
                        <Gauge size={13} /> {t("codestudio.candidates.speed")}
                      </dt>
                      <dd>
                        <Delta value={impact.speed.delta} />
                        <small>{t("codestudio.candidates.total", { value: impact.speed.total })}</small>
                      </dd>
                    </div>
                    {impact.bugs !== null && (
                      <div>
                        <dt>
                          <Bug size={13} /> {t("codestudio.candidates.bugs")}
                        </dt>
                        <dd>
                          <Delta value={impact.bugs} inverse />
                        </dd>
                      </div>
                    )}
                    <div>
                      <dt>
                        <Wallet size={13} /> {t("codestudio.candidates.salaries")}
                      </dt>
                      <dd>
                        <Delta value={impact.salaries} inverse />
                        <small>{t("codestudio.team.salary", { amount: money(candidate.salary) })}</small>
                      </dd>
                    </div>
                  </dl>

                  <ul className="cs2-candidate-reasons">
                    {impact.reasons.map((reason) => (
                      <li key={reason.text} className={`cs2-tone-${reason.tone}`}>
                        {reason.tone === "good" ? <ThumbsUp size={12} /> : <ThumbsDown size={12} />}
                        <span>{reason.text}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    type="button"
                    className="cs2-btn cs2-btn-primary"
                    disabled={busy || candidate.hired || cash < candidate.hireCost}
                    onClick={() => onHire(candidate.index)}
                  >
                    <UserPlus size={14} />{" "}
                    {candidate.hired ? t("codestudio.candidates.hired") : t("codestudio.team.hire", { amount: money(candidate.hireCost) })}
                  </button>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </Modal>
  );
}
