"use client";

import { useState } from "react";
import { Briefcase, CheckCircle2, Search, Timer, Wrench, XCircle } from "lucide-react";
import Modal from "../shared/Modal";
import type { BugFixResult, CompanyView, PublicBug } from "./types";
import { SeverityBadge, duration, money } from "./ui";
import { useTranslation } from "../../../i18n/useTranslation";

type Props = {
  company: CompanyView;
  busy: boolean;
  onFix: (bugId: string, body: { method: "diagnose" | "employee" | "cash"; optionKey?: string; employeeId?: string }) => Promise<BugFixResult | null>;
};

// Opciones ya descartadas en esta sesión (el servidor no guarda cuáles
// probaste; solo cuenta los intentos).
const triedOptions = new Map<string, Set<string>>();

// Orden estable por bug: la correcta no está siempre en el mismo lugar, pero
// tampoco salta de posición en cada poll.
function shuffled<T extends { key: string }>(items: T[], seed: string) {
  const hash = (value: string) => [...value].reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) >>> 0, 7);
  return [...items].sort((a, b) => hash(seed + a.key) - hash(seed + b.key));
}

export default function BugsView({ company, busy, onFix }: Props) {
  const t = useTranslation();
  const [openBug, setOpenBug] = useState<PublicBug | null>(null);
  const [result, setResult] = useState<BugFixResult | null>(null);
  const [employeeId, setEmployeeId] = useState("");
  const capable = company.employees.filter((employee) => employee.canFixBugs && !employee.busy);
  const liveBug = openBug ? company.bugs.find((bug) => bug.id === openBug.id) ?? openBug : null;

  const close = () => {
    setOpenBug(null);
    setResult(null);
  };

  const diagnose = async (optionKey: string) => {
    if (!liveBug) return;
    const outcome = await onFix(liveBug.id, { method: "diagnose", optionKey });
    if (!outcome) return;
    if ("correct" in outcome && !outcome.correct) {
      const tried = triedOptions.get(liveBug.id) ?? new Set<string>();
      tried.add(optionKey);
      triedOptions.set(liveBug.id, tried);
    }
    setResult(outcome);
  };

  return (
    <div className="cs2-stack">
      <section className="cs2-card">
        <h3>{t("codestudio.bugs.title")}</h3>
        <p className="cs2-muted">{t("codestudio.bugs.subtitle")}</p>
        <div className="cs2-legend">
          <span>
            <Search size={13} /> {t("codestudio.bugs.legendDiagnose")}
          </span>
          <span>
            <Wrench size={13} /> {t("codestudio.bugs.legendEmployee")}
          </span>
          <span>
            <Briefcase size={13} /> {t("codestudio.bugs.legendConsultant")}
          </span>
        </div>
      </section>

      {company.bugs.length === 0 && (
        <section className="cs2-card cs2-empty">
          <CheckCircle2 size={22} />
          <p>{t("codestudio.bugs.none")}</p>
        </section>
      )}

      {company.bugs.map((bug) => (
        <article key={bug.id} className="cs2-card cs2-bug">
          <div className="cs2-bug-head">
            <SeverityBadge severity={bug.severity} t={t} />
            <b>{bug.title}</b>
          </div>
          <p>{bug.symptom}</p>
          {bug.assignedEmployeeId ? (
            <p className="cs2-muted">
              <Timer size={13} />{" "}
              {t("codestudio.bugs.employeeWorking", {
                name: company.employees.find((employee) => employee.id === bug.assignedEmployeeId)?.name ?? "",
                time: duration(bug.fixSecondsLeft),
              })}
            </p>
          ) : (
            <button type="button" className="cs2-btn cs2-btn-primary" onClick={() => setOpenBug(bug)}>
              <Search size={15} /> {t("codestudio.bugs.investigate", { xp: bug.xpReward })}
            </button>
          )}
        </article>
      ))}

      {liveBug && (
        <Modal title={liveBug.title} onClose={close}>
          <div className="cs2-detail">
            <div className="cs2-bug-head">
              <SeverityBadge severity={liveBug.severity} t={t} />
              <span className="cs2-muted">{t("codestudio.bugs.hurting")}</span>
            </div>
            <h4>{t("codestudio.bugs.symptom")}</h4>
            <p>{liveBug.symptom}</p>
            {liveBug.evidence.length > 0 && (
              <>
                <h4>{t("codestudio.bugs.evidence")}</h4>
                <pre className="cs2-code">{liveBug.evidence.join("\n")}</pre>
              </>
            )}

            {result && "correct" in result && result.correct ? (
              <div className="cs2-result good">
                <CheckCircle2 size={18} />
                <div>
                  <b>{t("codestudio.bugs.correct", { xp: result.xp })}</b>
                  <p>{result.feedback}</p>
                  <p className="cs2-lesson-inline">{result.lesson}</p>
                  {result.preventHint && <p className="cs2-muted">{result.preventHint}</p>}
                  <button type="button" className="cs2-btn" onClick={close}>
                    {t("codestudio.common.close")}
                  </button>
                </div>
              </div>
            ) : (
              <>
                {result && "correct" in result && !result.correct && (
                  <div className="cs2-result bad">
                    <XCircle size={18} />
                    <div>
                      <b>{t("codestudio.bugs.wrong", { amount: money(result.cost) })}</b>
                      <p>{result.feedback}</p>
                    </div>
                  </div>
                )}
                {liveBug.options.length > 0 ? (
                  <>
                    <h4>{t("codestudio.bugs.question")}</h4>
                    <div className="cs2-options">
                      {shuffled(liveBug.options, liveBug.id).map((option) => {
                        const tried = triedOptions.get(liveBug.id)?.has(option.key);
                        return (
                          <button key={option.key} type="button" className={`cs2-option ${tried ? "tried" : ""}`} disabled={busy || tried} onClick={() => void diagnose(option.key)}>
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                    <p className="cs2-muted">
                      {t("codestudio.bugs.stakes", { right: money(liveBug.diagnoseCost), xp: liveBug.xpReward, wrong: money(liveBug.wrongCost) })}
                    </p>
                  </>
                ) : (
                  <p className="cs2-muted">{t("codestudio.bugs.legacy")}</p>
                )}

                <h4>{t("codestudio.bugs.otherWays")}</h4>
                <div className="cs2-bug-alt">
                  {capable.length > 0 ? (
                    <div className="cs2-inline">
                      <select value={employeeId || capable[0].id} onChange={(event) => setEmployeeId(event.target.value)} aria-label={t("codestudio.bugs.pickEmployee")}>
                        {capable.map((employee) => (
                          <option key={employee.id} value={employee.id}>
                            {employee.name} · {employee.roleName}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="cs2-btn"
                        disabled={busy}
                        onClick={async () => {
                          const outcome = await onFix(liveBug.id, { method: "employee", employeeId: employeeId || capable[0].id });
                          if (outcome) close();
                        }}
                      >
                        <Wrench size={14} /> {t("codestudio.bugs.assign", { time: duration(liveBug.employeeFixSeconds) })}
                      </button>
                    </div>
                  ) : (
                    <p className="cs2-muted">{t("codestudio.bugs.noEngineers")}</p>
                  )}
                  <button
                    type="button"
                    className="cs2-btn"
                    disabled={busy || company.cash < liveBug.consultantCost}
                    onClick={async () => {
                      const outcome = await onFix(liveBug.id, { method: "cash" });
                      if (outcome) close();
                    }}
                  >
                    <Briefcase size={14} /> {t("codestudio.bugs.consultant", { amount: money(liveBug.consultantCost) })}
                  </button>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
