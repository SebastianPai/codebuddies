"use client";

import { useState, type CSSProperties } from "react";
import { Bike, Bot, Cloud, Lock, Network, Play, Rocket, ShoppingCart } from "lucide-react";
import Modal from "../shared/Modal";
import type { Catalog, Profile } from "./types";
import { Stars, money } from "./ui";
import { useTranslation } from "../../../i18n/useTranslation";

const APP_TYPE_ICONS: Record<string, typeof Rocket> = {
  network: Network,
  cart: ShoppingCart,
  bike: Bike,
  play: Play,
  cloud: Cloud,
  bot: Bot,
};

type Props = {
  catalog: Catalog;
  profile: Profile;
  onFound: (appTypeId: string, name: string) => Promise<void>;
  onClose: () => void;
};

// Elegir tipo de app es la decisión más importante de la partida: cada
// tipo juega distinto (qué features rinden, cuánto cuestan los servidores,
// cuánto se van los usuarios). Los difíciles se desbloquean con nivel.
export default function FoundingModal({ catalog, profile, onFound, onClose }: Props) {
  const t = useTranslation();
  const [name, setName] = useState("");
  const [appTypeId, setAppTypeId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const selected = catalog.appTypes.find((type) => type.id === appTypeId);
  const validName = name.trim().length >= 3;

  const submit = async () => {
    if (!selected || !validName) return;
    setSubmitting(true);
    setError("");
    try {
      await onFound(selected.id, name.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSubmitting(false);
    }
  };

  return (
    <Modal title={t("codestudio.found.title")} onClose={onClose}>
      <div className="cs2-detail cs2-found">
        <label className="cs2-field">
          <span>{t("codestudio.found.nameLabel")}</span>
          <input
            autoFocus
            value={name}
            maxLength={40}
            placeholder={t("codestudio.found.namePlaceholder")}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void submit();
            }}
          />
        </label>

        <span className="cs2-field-label">{t("codestudio.found.typeLabel")}</span>
        <div className="cs2-apptypes">
          {catalog.appTypes.map((type) => {
            const Icon = APP_TYPE_ICONS[type.icon ?? ""] ?? Rocket;
            const locked = profile.level < type.minFounderLevel;
            return (
              <button
                key={type.id}
                type="button"
                disabled={locked}
                className={`cs2-apptype ${appTypeId === type.id ? "active" : ""} ${locked ? "locked" : ""}`}
                style={{ "--apptype": type.color ?? "#22d3ee" } as CSSProperties}
                onClick={() => setAppTypeId(type.id)}
              >
                <div className="cs2-mini-head">
                  <b>
                    <Icon size={16} /> {type.name}
                  </b>
                  <Stars value={type.difficulty} />
                </div>
                <p>{type.description}</p>
                {locked ? (
                  <small className="cs2-lock">
                    <Lock size={11} /> {t("codestudio.career.unlocksAt", { level: type.minFounderLevel })}
                  </small>
                ) : (
                  <small>{t("codestudio.found.startingCash", { amount: money(type.startingCash + profile.startingCashBonus) })}</small>
                )}
              </button>
            );
          })}
        </div>

        {error && <p className="cs2-warn-text">{error}</p>}
        <button type="button" className="cs2-btn cs2-btn-primary cs2-btn-block" disabled={!selected || !validName || submitting} onClick={() => void submit()}>
          <Rocket size={15} /> {submitting ? t("codestudio.found.founding") : t("codestudio.found.submit")}
        </button>
      </div>
    </Modal>
  );
}
