"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Bug,
  DollarSign,
  ExternalLink,
  GitBranch,
  GraduationCap,
  Megaphone,
  Rocket,
  Search,
  Server,
  Target,
  type LucideIcon,
} from "lucide-react";
import type { ViewKey } from "./types";
import { getWebUrl } from "../../../config/env";
import { useTranslation } from "../../../i18n/useTranslation";

// Guía para quien llega sin saber nada (ni de CodeBuddies, ni de
// programación, ni qué es una landing page): qué es esto, cómo se juega
// paso a paso, un glosario sin tecnicismos y qué hacer si va mal.

const STEPS: Array<{ id: string; icon: LucideIcon; view: ViewKey | null }> = [
  { id: "1", icon: Rocket, view: null },
  { id: "2", icon: GitBranch, view: "tree" },
  { id: "3", icon: Server, view: "infra" },
  { id: "4", icon: Megaphone, view: "marketing" },
  { id: "5", icon: DollarSign, view: "finance" },
  { id: "6", icon: Bug, view: "bugs" },
];

const GLOSSARY = [
  "app", "saas", "mvp", "landing", "login", "core", "server", "bug", "users", "churn",
  "rating", "marketing", "price", "profit", "runway", "funding", "valuation", "techDebt", "latency",
];

export default function GuideView({ onNavigate, hasCompany }: { onNavigate: (view: ViewKey) => void; hasCompany: boolean }) {
  const t = useTranslation();
  const [query, setQuery] = useState("");

  const terms = useMemo(() => {
    const q = query.trim().toLowerCase();
    return GLOSSARY.map((key) => ({ key, term: t(`codestudio.guide.glossary.${key}.term`), text: t(`codestudio.guide.glossary.${key}.text`) })).filter(
      (entry) => !q || entry.term.toLowerCase().includes(q) || entry.text.toLowerCase().includes(q),
    );
  }, [query, t]);

  return (
    <div className="cs2-stack cs2-guide">
      {!hasCompany && (
        <button type="button" className="cs2-btn cs2-guide-back" onClick={() => onNavigate("panel")}>
          <ArrowLeft size={15} /> {t("codestudio.guide.back")}
        </button>
      )}

      <section className="cs2-card">
        <span className="cs2-eyebrow">
          <BookOpen size={13} /> {t("codestudio.guide.title")}
        </span>
        <p className="cs2-guide-lead">{t("codestudio.guide.subtitle")}</p>
      </section>

      <section className="cs2-card">
        <h3>{t("codestudio.guide.whatTitle")}</h3>
        <p>{t("codestudio.guide.whatCodebuddies")}</p>
        <p>{t("codestudio.guide.whatStudio")}</p>
      </section>

      <section className="cs2-card">
        <h3>
          <Target size={16} /> {t("codestudio.guide.goalTitle")}
        </h3>
        <p>{t("codestudio.guide.goal")}</p>
      </section>

      <section className="cs2-card">
        <h3>{t("codestudio.guide.stepsTitle")}</h3>
        <ol className="cs2-guide-steps">
          {STEPS.map(({ id, icon: Icon, view }) => (
            <li key={id}>
              <i>
                <Icon size={16} />
              </i>
              <div>
                <b>
                  {id}. {t(`codestudio.guide.steps.${id}.title`)}
                </b>
                <p>{t(`codestudio.guide.steps.${id}.text`)}</p>
              </div>
              {view && hasCompany && (
                <button type="button" className="cs2-btn" onClick={() => onNavigate(view)}>
                  {t("codestudio.firstSteps.go")}
                </button>
              )}
            </li>
          ))}
        </ol>
      </section>

      <section className="cs2-card">
        <h3>{t("codestudio.guide.glossaryTitle")}</h3>
        <label className="cs2-guide-search">
          <Search size={15} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("codestudio.guide.glossarySearch")} />
        </label>
        {terms.length === 0 ? (
          <p className="cs2-muted">{t("codestudio.guide.glossaryEmpty")}</p>
        ) : (
          <dl className="cs2-glossary">
            {terms.map((entry) => (
              <div key={entry.key}>
                <dt>{entry.term}</dt>
                <dd>{entry.text}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      <section className="cs2-card">
        <h3>
          <AlertTriangle size={16} /> {t("codestudio.guide.troubleTitle")}
        </h3>
        <ul className="cs2-guide-list">
          {["1", "2", "3", "4"].map((id) => (
            <li key={id}>{t(`codestudio.guide.trouble.${id}`)}</li>
          ))}
        </ul>
      </section>

      <section className="cs2-card cs2-guide-learn">
        <GraduationCap size={22} />
        <div>
          <b>{t("codestudio.guide.learnTitle")}</b>
          <p>{t("codestudio.guide.learnText")}</p>
        </div>
        <a className="cs2-btn cs2-btn-primary" href={`${getWebUrl()}/courses`} target="_blank" rel="noreferrer">
          {t("codestudio.guide.learnCta")} <ExternalLink size={14} />
        </a>
      </section>
    </div>
  );
}
