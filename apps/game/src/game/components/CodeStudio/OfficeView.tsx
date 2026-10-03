"use client";

import { useCallback, useEffect, useState } from "react";
import { sileo } from "sileo";
import { Armchair, Building2, Coffee, CookingPot, DoorOpen, Droplets, Gift, Monitor, Table2, Users } from "lucide-react";
import type { CompanyView } from "./types";
import { claimCodeStudioOfficeKit, createCodeStudioOffice, getCodeStudioOffice, type OfficeState } from "../../network/codestudio";
import { CoinIcon } from "../shared/ThemeIcons";
import { useTranslation } from "../../../i18n/useTranslation";

// Oficina de la empresa: una sala del juego donde trabajan los empleados.
// Puestos (escritorio + silla + PC) y comodidades cambian el rendimiento;
// sin oficina trabajan desde casa sin castigo (ver api content/office.ts).

const AMENITY_ICONS: Record<string, typeof Coffee> = { snacks: CookingPot, water: Droplets, coffee: Coffee };

export default function OfficeView({ company, onChange }: { company: CompanyView; onChange?: () => void }) {
  const t = useTranslation();
  const [office, setOffice] = useState<OfficeState | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    getCodeStudioOffice(company.id)
      .then(setOffice)
      .catch(() => setOffice(null));
  }, [company.id]);

  useEffect(() => {
    load();
  }, [load, company.employees.length]);

  const goToOffice = (roomId: string) => {
    const socket = (typeof window !== "undefined" && (window as { phaserSocket?: { emit: (event: string, data: unknown) => void } }).phaserSocket) || null;
    socket?.emit("joinRoom", { roomId });
    window.dispatchEvent(new Event("codestudio:close-pc"));
  };

  const create = async (layoutId: string) => {
    setBusy(true);
    try {
      await createCodeStudioOffice(company.id, layoutId);
      load();
      onChange?.();
    } catch (err) {
      sileo.error({ title: t("codestudio.errors.actionFailed"), description: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(false);
    }
  };

  const claimKit = async () => {
    setBusy(true);
    try {
      const { granted } = await claimCodeStudioOfficeKit(company.id);
      sileo.success({ title: t("codestudio.office.kitClaimed", { count: granted }) });
      load();
      onChange?.();
    } catch (err) {
      sileo.error({ title: t("codestudio.errors.actionFailed"), description: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(false);
    }
  };

  if (!office) return <p className="cs2-muted">{t("codestudio.common.loading")}</p>;

  if (!office.room) {
    return (
      <div className="cs2-stack">
        <section className="cs2-card">
          <span className="cs2-eyebrow">
            <Building2 size={13} /> {t("codestudio.office.title")}
          </span>
          <h3>{t("codestudio.office.createTitle")}</h3>
          <p className="cs2-muted">{t("codestudio.office.createText")}</p>
        </section>
        <div className="cs2-office-maps">
          {office.layouts.map((layout) => (
            <article key={layout.id} className="cs2-card cs2-office-map">
              <div className="cs2-office-map-preview">
                {layout.previewImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={layout.previewImageUrl} alt="" loading="lazy" />
                ) : (
                  <Building2 size={28} />
                )}
              </div>
              <b>{layout.name}</b>
              <small className="cs2-muted">
                {layout.width} × {layout.height}
              </small>
              <button type="button" className={`cs2-btn ${layout.price === 0 ? "cs2-btn-primary" : ""}`} disabled={busy} onClick={() => void create(layout.id)}>
                {layout.price === 0 ? (
                  t("codestudio.office.free")
                ) : (
                  <>
                    <CoinIcon size={14} /> {layout.price}
                  </>
                )}
              </button>
            </article>
          ))}
          {office.layouts.length === 0 && <p className="cs2-muted">{t("codestudio.office.noMaps")}</p>}
        </div>
      </div>
    );
  }

  const summary = office.summary;
  const counts = office.counts;
  return (
    <div className="cs2-stack">
      <section className="cs2-card cs2-office-head">
        <div>
          <span className="cs2-eyebrow">
            <Building2 size={13} /> {t("codestudio.office.title")}
          </span>
          <h3>{office.room.name}</h3>
          <p className="cs2-muted">{t("codestudio.office.visitText")}</p>
        </div>
        <button type="button" className="cs2-btn cs2-btn-primary" onClick={() => goToOffice(office.room!.id)}>
          <DoorOpen size={16} /> {t("codestudio.office.go")}
        </button>
      </section>

      <section className="cs2-stats">
        <div className={`cs2-stat ${summary.unseated > 0 ? "cs2-tone-warn" : "cs2-tone-good"}`}>
          <span>{t("codestudio.office.stations")}</span>
          <b>
            {summary.seated}/{company.employees.length}
          </b>
          <small>{summary.unseated > 0 ? t("codestudio.office.unseated", { count: summary.unseated }) : t("codestudio.office.allSeated")}</small>
        </div>
        <div className="cs2-stat">
          <span>{t("codestudio.office.bonus")}</span>
          <b>+{Math.round(summary.bonus * 100)}%</b>
          <small>{t("codestudio.office.bonusHint")}</small>
        </div>
      </section>

      <section className="cs2-card">
        <h3>
          <Users size={16} /> {t("codestudio.office.furnitureTitle")}
        </h3>
        <p className="cs2-muted">{t("codestudio.office.furnitureText")}</p>
        <div className="cs2-office-items">
          {(
            [
              ["desk", Table2],
              ["chair", Armchair],
              ["pc", Monitor],
            ] as const
          ).map(([key, Icon]) => (
            <span key={key} className="cs2-chip">
              <Icon size={14} /> {t(`codestudio.office.item.${key}`)}: {counts?.[key] ?? 0}
            </span>
          ))}
          {(["snacks", "water", "coffee"] as const).map((key) => {
            const Icon = AMENITY_ICONS[key];
            const has = (counts?.[key] ?? 0) > 0;
            return (
              <span key={key} className={`cs2-chip ${has ? "cs2-tone-good" : ""}`}>
                <Icon size={14} /> {t(`codestudio.office.item.${key}`)}
              </span>
            );
          })}
        </div>
      </section>

      {office.kit.available && (
        <section className="cs2-card cs2-office-kit">
          <Gift size={20} />
          <div>
            <b>{t("codestudio.office.kitTitle")}</b>
            <p className="cs2-muted">{t("codestudio.office.kitText")}</p>
          </div>
          <button type="button" className="cs2-btn cs2-btn-primary" disabled={busy || office.kit.pending === 0} onClick={() => void claimKit()}>
            {office.kit.pending > 0 ? t("codestudio.office.kitClaim", { count: office.kit.pending }) : t("codestudio.office.kitDone")}
          </button>
        </section>
      )}
    </div>
  );
}
