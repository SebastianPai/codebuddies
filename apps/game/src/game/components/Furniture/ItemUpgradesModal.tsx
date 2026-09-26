"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Coins, Lock, Sparkles } from "lucide-react";
import Modal from "../shared/Modal";
import Button from "../shared/Button";
import { apiGet, apiPost } from "../../network/http";
import { useTranslation } from "../../../i18n/useTranslation";
import styles from "./ItemUpgradesModal.module.css";

type Upgrade = {
  id: string;
  name: string;
  description: string | null;
  priceCoins: number;
  unlockStates: string[];
  requiresId: string | null;
  owned: boolean;
  available: boolean;
};

type UpgradesPayload = {
  itemId: string;
  ownsItem: boolean;
  upgrades: Upgrade[];
};

export type UpgradesTarget = {
  itemId: string;
  name: string;
  imageUrl: string | null;
  /** Dueño del objeto clickeado: sus mejoras son las que valen en la sala. */
  ownerId: string;
};

// Mejoras desbloqueables de un objeto (ej. TV: "Encendido", "Canales"). Se
// compran una vez y valen para todas tus copias de ese objeto. El servidor
// valida propiedad, requisitos y monedas; acá solo se muestra el estado.
export default function ItemUpgradesModal({
  target,
  currentUserId,
  onClose,
  onPurchased,
}: {
  target: UpgradesTarget;
  currentUserId: string | null;
  onClose: () => void;
  onPurchased: () => void;
}) {
  const t = useTranslation();
  const [data, setData] = useState<UpgradesPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [buying, setBuying] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await apiGet<UpgradesPayload>(`/items/${target.itemId}/upgrades`));
      setError(null);
    } catch {
      setError(t("buildmode.upgradesLoadError"));
    }
    // t fuera a propósito: no recargar al cambiar idioma.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target.itemId]);

  useEffect(() => {
    void load();
  }, [load]);

  const buy = async (upgrade: Upgrade) => {
    setBuying(upgrade.id);
    setNotice(null);
    try {
      await apiPost(`/item-upgrades/${upgrade.id}/buy`);
      setNotice(t("buildmode.upgradeBought", { name: upgrade.name }));
      onPurchased();
      await load();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : t("buildmode.upgradeBuyError"));
    } finally {
      setBuying(null);
    }
  };

  const viewingOthers = Boolean(currentUserId && target.ownerId && currentUserId !== target.ownerId);

  return (
    <Modal title={t("buildmode.upgradesTitle")} onClose={onClose} style={{ width: "min(440px, calc(100vw - 24px))" }}>
      <div className={styles.header}>
        {target.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={target.imageUrl} alt="" className={styles.thumb} />
        ) : (
          <span className={styles.thumb}>
            <Sparkles size={18} />
          </span>
        )}
        <div className={styles.headerText}>
          <strong>{target.name}</strong>
          <span>{t("buildmode.upgradesSubtitle")}</span>
        </div>
      </div>

      {viewingOthers && <p className={styles.hint}>{t("buildmode.upgradesOthersHint")}</p>}
      {error && <p className={styles.error}>{error}</p>}
      {notice && <p className={styles.notice}>{notice}</p>}

      {!data && !error && <p className={styles.hint}>{t("buildmode.upgradesLoading")}</p>}

      {data && data.upgrades.length === 0 && <p className={styles.hint}>{t("buildmode.upgradesEmpty")}</p>}

      {data && data.upgrades.length > 0 && (
        <ul className={styles.list}>
          {data.upgrades.map((upgrade) => (
            <li key={upgrade.id} className={`${styles.card} ${upgrade.owned ? styles.owned : ""}`}>
              <div className={styles.cardBody}>
                <strong>{upgrade.name}</strong>
                {upgrade.description && <p>{upgrade.description}</p>}
                <span className={styles.unlocks}>
                  {t("buildmode.upgradeUnlocks")}: {upgrade.unlockStates.join(", ")}
                </span>
              </div>
              <div className={styles.cardAction}>
                {upgrade.owned ? (
                  <span className={styles.ownedBadge}>
                    <Check size={13} /> {t("buildmode.upgradeOwned")}
                  </span>
                ) : !data.ownsItem ? (
                  <span className={styles.lockedBadge}>
                    <Lock size={12} /> {t("buildmode.upgradeNeedItem")}
                  </span>
                ) : !upgrade.available ? (
                  <span className={styles.lockedBadge}>
                    <Lock size={12} /> {t("buildmode.upgradeNeedsPrevious")}
                  </span>
                ) : (
                  <Button variant="primary" size="sm" onClick={() => void buy(upgrade)} disabled={buying !== null}>
                    <Coins size={13} /> {buying === upgrade.id ? "…" : upgrade.priceCoins}
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
