"use client";

import { useEffect, useState } from "react";
import { Briefcase, Building2, DoorOpen, Trophy, Users } from "lucide-react";
import styles from "./WorkInfo.module.css";
import { getPublicCareer, type Career } from "../../network/profiles";
import { useTranslation } from "../../../i18n/useTranslation";

// "Dónde trabaja" (estilo LinkedIn) en el menú rápido y en el perfil del
// juego: su empresa de CodeStudio, cargo, etapa y puesto en el ranking. Con
// oficina, un clic lleva a la sala.

function goToRoom(roomId: string) {
  const socket = (window as { phaserSocket?: { emit: (event: string, data: unknown) => void } }).phaserSocket;
  socket?.emit("joinRoom", { roomId });
}

export function useCareer(username: string) {
  const [career, setCareer] = useState<Career | null>(null);
  useEffect(() => {
    let cancelled = false;
    getPublicCareer(username)
      .then((data) => !cancelled && setCareer(data))
      .catch(() => !cancelled && setCareer(null));
    return () => {
      cancelled = true;
    };
  }, [username]);
  return career;
}

/** Una línea: "CEO en Acme · MVP". */
export function WorkLine({ career, onNavigate }: { career: Career | null; onNavigate?: () => void }) {
  const t = useTranslation();
  const current = career?.current;
  if (!current) return null;
  const content = (
    <>
      <Briefcase size={12} />
      <span>{t("friends.work.line", { role: current.role, company: current.name })}</span>
      <small>{current.stage}</small>
    </>
  );
  if (!current.officeRoomId) return <div className={styles.line}>{content}</div>;
  return (
    <button
      type="button"
      className={`${styles.line} ${styles.link}`}
      title={t("friends.work.goOffice")}
      onClick={() => {
        goToRoom(current.officeRoomId!);
        onNavigate?.();
      }}
    >
      {content}
    </button>
  );
}

/** Sección "Experiencia" del perfil: todas sus empresas. */
export function WorkExperience({ career, onNavigate }: { career: Career | null; onNavigate?: () => void }) {
  const t = useTranslation();
  if (!career || career.companies.length === 0) return null;
  const date = (value: string) => new Date(value).toLocaleDateString(undefined, { month: "short", year: "numeric" });
  return (
    <div className={styles.experience}>
      <div className={styles.title}>{t("friends.work.experience")}</div>
      {career.companies.map((company) => (
        <div key={company.id} className={`${styles.job} ${company.active ? "" : styles.closed}`}>
          <span className={styles.logo} style={{ background: company.appType.color ?? undefined }}>
            <Building2 size={14} />
          </span>
          <div className={styles.jobInfo}>
            <b>{company.name}</b>
            <span>
              {t("friends.work.role", { role: company.role, equity: company.equity })} · {company.appType.name}
            </span>
            <small>
              {date(company.since)} – {company.until ? date(company.until) : t("friends.work.present")} · {company.stage}
            </small>
            <div className={styles.metrics}>
              <span>
                <Users size={11} /> {t("friends.work.users", { count: company.activeUsers.toLocaleString() })}
              </span>
              {company.rank && (
                <span>
                  <Trophy size={11} /> #{company.rank}
                </span>
              )}
              {!company.active && <span>{t("friends.work.closed")}</span>}
            </div>
          </div>
          {company.officeRoomId && company.active && (
            <button
              type="button"
              className={styles.office}
              title={t("friends.work.goOffice")}
              aria-label={t("friends.work.goOffice")}
              onClick={() => {
                goToRoom(company.officeRoomId!);
                onNavigate?.();
              }}
            >
              <DoorOpen size={14} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
