"use client";

import { Plus, ThumbsDown, ThumbsUp } from "lucide-react";
import type { Catalog, CompanyView } from "./types";
import { ProgressBar } from "./ui";
import { AvatarPortrait, ROLE_SHORT, SkinPortrait, tierOf } from "./EmployeeCard";
import { useTranslation } from "../../../i18n/useTranslation";

// Plantilla estilo FIFA: el equipo en una "cancha" por líneas (liderazgo,
// producto, calidad, operación, crecimiento), con huecos para contratar,
// la media del equipo y la química (qué tan bien se complementan).

type Employee = CompanyView["employees"][number];

const LINES: Array<{ key: string; roles: string[]; slots: number }> = [
  { key: "leadership", roles: ["product-manager"], slots: 1 },
  { key: "product", roles: ["fullstack", "frontend", "backend"], slots: 3 },
  { key: "quality", roles: ["qa", "ux"], slots: 2 },
  { key: "operations", roles: ["devops", "support"], slots: 2 },
  { key: "growth", roles: ["marketing", "community-manager", "data-scientist"], slots: 2 },
];

const BUILDERS = new Set(["fullstack", "frontend", "backend"]);

/** Química 0-100 y por qué: equipos que se complementan rinden más. */
export function chemistryOf(employees: Employee[]) {
  const reasons: Array<{ tone: "good" | "bad"; key: string; params?: Record<string, number> }> = [];
  if (employees.length === 0) return { value: 0, reasons };
  let value = 50;
  const builders = employees.filter((employee) => BUILDERS.has(employee.roleSlug)).length;
  const has = (slug: string) => employees.some((employee) => employee.roleSlug === slug);
  const qa = employees.filter((employee) => employee.roleSlug === "qa").length;
  const juniors = employees.filter((employee) => employee.seniority?.key === "junior").length;
  const seniors = employees.filter((employee) => employee.seniority?.key === "senior" || employee.seniority?.key === "lead").length;
  const bad = employees.filter((employee) => employee.trait?.tone === "bad").length;

  const add = (delta: number, tone: "good" | "bad", key: string, params?: Record<string, number>) => {
    value += delta;
    reasons.push({ tone, key, params });
  };
  if (builders >= 2 && has("product-manager")) add(15, "good", "pm");
  else if (builders >= 2) add(-10, "bad", "noPm");
  if (builders >= 3 && qa === 0) add(-10, "bad", "noQa");
  else if (qa > 0) add(8, "good", "qa");
  if (juniors > 0 && seniors === 0) add(-10, "bad", "juniorsAlone");
  else if (juniors > 0 && seniors > 0) add(10, "good", "mentoring");
  if (employees.some((employee) => employee.trait?.key === "mentor")) add(8, "good", "mentor");
  if (bad / employees.length > 0.4) add(-15, "bad", "badTraits", { count: bad });
  if (builders === 0) add(-15, "bad", "noBuilders");
  return { value: Math.max(0, Math.min(100, value)), reasons };
}

function MiniCard({ employee }: { employee: Employee }) {
  const overall = employee.card?.overall ?? employee.performance ?? 60;
  return (
    <div className={`cs2-squad-card cs2-fut-${tierOf(overall)}`} title={`${employee.name} · ${employee.roleName}`}>
      <b>{overall}</b>
      <span className="cs2-squad-portrait">
        {!employee.skin?.spriteSheetUrl && employee.avatar ? (
          <AvatarPortrait avatar={employee.avatar} label={employee.name} />
        ) : (
          <SkinPortrait skin={employee.skin} label={employee.name} />
        )}
      </span>
      <small>{employee.name.split(" ")[0]}</small>
      <i>{ROLE_SHORT[employee.roleSlug] ?? employee.roleSlug.slice(0, 3).toUpperCase()}</i>
    </div>
  );
}

export default function SquadBoard({ company, catalog, onHire }: { company: CompanyView; catalog: Catalog; onHire: (role: { id: string; name: string }) => void }) {
  const t = useTranslation();
  const employees = company.employees;
  const average = employees.length ? Math.round(employees.reduce((sum, employee) => sum + (employee.card?.overall ?? 60), 0) / employees.length) : 0;
  const chemistry = chemistryOf(employees);
  const roleBySlug = new Map(catalog.roles.map((role) => [role.slug, role]));

  return (
    <section className="cs2-card cs2-squad">
      <header className="cs2-squad-head">
        <div>
          <span className="cs2-eyebrow">{t("codestudio.squad.eyebrow")}</span>
          <h3>{t("codestudio.squad.title")}</h3>
        </div>
        <div className="cs2-squad-scores">
          <div>
            <span>{t("codestudio.squad.average")}</span>
            <b>{average || "—"}</b>
          </div>
          <div>
            <span>{t("codestudio.squad.chemistry")}</span>
            <b>{chemistry.value}</b>
          </div>
        </div>
      </header>
      <ProgressBar value={chemistry.value} tone={chemistry.value >= 70 ? "good" : chemistry.value >= 45 ? "warn" : "bad"} />

      <div className="cs2-pitch">
        {LINES.map((line) => {
          const members = employees.filter((employee) => line.roles.includes(employee.roleSlug));
          const empty = Math.max(0, line.slots - members.length);
          // Cada hueco sugiere un rol distinto de la línea, empezando por los que faltan.
          const suggested = [...line.roles].sort(
            (a, b) => members.filter((employee) => employee.roleSlug === a).length - members.filter((employee) => employee.roleSlug === b).length,
          );
          return (
            <div key={line.key} className="cs2-pitch-line">
              <span className="cs2-pitch-label">{t(`codestudio.squad.line.${line.key}`)}</span>
              <div className="cs2-pitch-row">
                {members.map((employee) => (
                  <MiniCard key={employee.id} employee={employee} />
                ))}
                {Array.from({ length: empty }, (_, index) => roleBySlug.get(suggested[index % suggested.length]))
                  .filter((role): role is NonNullable<typeof role> => Boolean(role))
                  .map((role, index) => (
                    <button
                      key={`empty-${index}`}
                      type="button"
                      className="cs2-squad-empty"
                      onClick={() => onHire({ id: role.id, name: role.name })}
                      aria-label={t("codestudio.squad.hire", { role: role.name })}
                      title={t("codestudio.squad.hire", { role: role.name })}
                    >
                      <Plus size={18} />
                      <small>{ROLE_SHORT[role.slug] ?? role.name}</small>
                    </button>
                  ))}
              </div>
            </div>
          );
        })}
      </div>

      {chemistry.reasons.length > 0 && (
        <ul className="cs2-candidate-reasons">
          {chemistry.reasons.map((reason) => (
            <li key={reason.key} className={`cs2-tone-${reason.tone}`}>
              {reason.tone === "good" ? <ThumbsUp size={12} /> : <ThumbsDown size={12} />}
              <span>{t(`codestudio.squad.reason.${reason.key}`, reason.params)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
