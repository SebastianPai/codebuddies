"use client";

import { useEffect, useState } from "react";
import { Bug, GitBranch, GitCommitHorizontal, GitMerge, GitPullRequest, Users } from "lucide-react";
import type { Catalog, CompanyView, ViewKey } from "./types";
import { ProgressBar } from "./ui";
import { useTranslation } from "../../../i18n/useTranslation";

// Repositorio: cómo trabaja un equipo con Git, armado con lo que tu startup
// hace de verdad en la simulación. Cada función en producción es un commit en
// main, cada construcción en curso es un pull request abierto y cada bug es
// un issue. Solo muestra (no cambia la simulación): enseña el flujo real.

// Quienes firman commits, y quienes cuentan para la revisión de código (los
// mismos roles que usa el motor en hasCodeReview: con 2 o más hay revisión).
const BUILDER_ROLES = new Set(["frontend", "backend", "fullstack", "devops", "qa", "data-scientist"]);
const CODER_ROLES = new Set(["frontend", "backend", "fullstack"]);

function hash(value: string) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) h = Math.imul(h ^ value.charCodeAt(i), 16777619);
  return h >>> 0;
}

const sha = (id: string) => hash(id).toString(16).padStart(8, "0").slice(0, 7);

function repoName(name: string) {
  return (
    name
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "mi-app"
  );
}

type Props = { company: CompanyView; catalog: Catalog; onNavigate: (view: ViewKey) => void };

export default function RepoView({ company, catalog, onNavigate }: Props) {
  const t = useTranslation();
  // Hora actual para los "hace X min" (se refresca cada 30 s, fuera del render).
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  const devs = company.employees.filter((employee) => BUILDER_ROLES.has(employee.roleSlug));
  const people = devs.length > 0 ? devs : company.employees;
  const author = (seed: string) => (people.length > 0 ? people[hash(seed) % people.length].name : t("codestudio.repo.you"));
  const coders = company.employees.filter((employee) => CODER_ROLES.has(employee.roleSlug));
  const reviewer = (seed: string, authorName: string) => {
    const others = coders.filter((dev) => dev.name !== authorName);
    return others.length > 0 ? others[hash(seed + ":r") % others.length].name : null;
  };
  const slugByName = new Map(catalog.features.map((feature) => [feature.name, feature.slug]));
  const ago = (iso: string) => {
    const minutes = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
    if (minutes < 1) return t("codestudio.repo.now");
    if (minutes < 60) return t("codestudio.repo.minutesAgo", { count: minutes });
    const hours = Math.round(minutes / 60);
    if (hours < 48) return t("codestudio.repo.hoursAgo", { count: hours });
    return t("codestudio.repo.daysAgo", { count: Math.round(hours / 24) });
  };

  // Commits: los lanzamientos ("En producción: X") de la actividad.
  const commits = company.events
    .filter((event) => event.kind === "release" && event.tone === "good")
    .map((event) => {
      const name = event.title.includes(": ") ? event.title.slice(event.title.indexOf(": ") + 2) : event.title;
      const scope = slugByName.get(name) ?? "app";
      return { id: event.id, sha: sha(event.id), message: `feat(${scope}): ${name}`, author: author(event.id), when: ago(event.createdAt) };
    });

  const prs = company.development.map((task, index) => {
    const by = author(task.id);
    return { task, number: commits.length + index + 2, author: by, reviewer: reviewer(task.id, by) };
  });

  return (
    <div className="cs2-stack cs2-repo">
      <section className="cs2-card">
        <div className="cs2-card-head">
          <div>
            <h3 className="cs2-repo-title">
              <GitBranch size={18} aria-hidden="true" /> {repoName(company.name)}
            </h3>
            <p>{t("codestudio.repo.subtitle", { commits: commits.length, prs: prs.length })}</p>
          </div>
          <span className="cs2-chip">main</span>
        </div>
        <ol className="cs2-repo-flow" aria-label={t("codestudio.repo.flowLabel")}>
          {(["branch", "commit", "pr", "merge"] as const).map((step, index) => (
            <li key={step}>
              <b>{index + 1}</b>
              <span>
                <strong>{t(`codestudio.repo.flow.${step}.title`)}</strong>
                {t(`codestudio.repo.flow.${step}.text`)}
              </span>
            </li>
          ))}
        </ol>
        <div className="cs2-realworld">
          <span>{t("codestudio.tree.realWorld")}</span>
          <p>
            {["Git", "GitHub", "GitLab", "Bitbucket"].map((tool) => (
              <b key={tool}>{tool}</b>
            ))}
          </p>
        </div>
      </section>

      <section className="cs2-card">
        <h4 className="cs2-ts-title">
          <GitPullRequest size={14} aria-hidden="true" /> {t("codestudio.repo.openPrs", { count: prs.length })}
        </h4>
        {prs.length === 0 ? (
          <p className="cs2-muted">{t("codestudio.repo.noPrs")}</p>
        ) : (
          <ul className="cs2-repo-prs">
            {prs.map(({ task, number, author: by, reviewer: rev }) => (
              <li key={task.id}>
                <div className="cs2-repo-pr-head">
                  <b>
                    #{number} · {task.name}
                  </b>
                  <em className={task.queued ? "draft" : "open"}>{t(task.queued ? "codestudio.repo.draft" : "codestudio.repo.inProgress")}</em>
                </div>
                <small>
                  {t("codestudio.repo.prBy", { name: by })} ·{" "}
                  {rev ? t("codestudio.repo.reviewBy", { name: rev }) : t("codestudio.repo.noReviewer")}
                </small>
                {!task.queued && <ProgressBar value={task.progress} />}
              </li>
            ))}
          </ul>
        )}
        {coders.length < 2 ? (
          <p className="cs2-repo-tip">{t("codestudio.repo.reviewTip")}</p>
        ) : (
          <p className="cs2-repo-ok">{t("codestudio.repo.reviewOn")}</p>
        )}
      </section>

      <section className="cs2-card">
        <h4 className="cs2-ts-title">
          <GitCommitHorizontal size={14} aria-hidden="true" /> {t("codestudio.repo.history")}
        </h4>
        {commits.length === 0 ? (
          <p className="cs2-muted">{t("codestudio.repo.noCommits")}</p>
        ) : (
          <ul className="cs2-repo-commits">
            {commits.map((commit) => (
              <li key={commit.id}>
                <code>{commit.sha}</code>
                <span className="cs2-repo-msg">{commit.message}</span>
                <small>
                  {commit.author} · {commit.when}
                </small>
              </li>
            ))}
          </ul>
        )}
        <p className="cs2-muted cs2-repo-note">
          <GitMerge size={13} aria-hidden="true" /> {t("codestudio.repo.historyNote")}
        </p>
      </section>

      <section className="cs2-card cs2-repo-row">
        <span>
          <Bug size={16} aria-hidden="true" /> {t("codestudio.repo.issues", { count: company.bugs.length })}
        </span>
        <button type="button" className="cs2-btn" onClick={() => onNavigate("bugs")}>
          {t("codestudio.repo.seeIssues")}
        </button>
        <span>
          <Users size={16} aria-hidden="true" /> {t("codestudio.repo.contributors", { count: Math.max(1, devs.length) })}
        </span>
        <button type="button" className="cs2-btn" onClick={() => onNavigate("team")}>
          {t("codestudio.repo.seeTeam")}
        </button>
      </section>
    </div>
  );
}
