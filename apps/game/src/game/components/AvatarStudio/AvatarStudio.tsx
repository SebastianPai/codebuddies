"use client";

import { useMemo, useRef, useState } from "react";
import Draggable from "react-draggable";

import AvatarInventory from "../Avatar/AvatarInventory";
import AvatarPreview from "../AvatarEditor/AvatarPreview";
import RarityText from "../shared/RarityText";
import { useDialogBehavior } from "../shared/useDialogBehavior";
import { useWindowChrome } from "../shared/useWindowChrome";
import { useTranslation } from "../../../i18n/useTranslation";
import styles from "./AvatarStudio.module.css";
import chromeStyles from "../shared/windowChrome.module.css";

interface Props {
  inventory: any[];
  avatar?: any;
  username?: string;
  nameEffectId?: string | null;
  onClose: () => void;
  onEquipAvatarItem?: (item: any, color?: number) => void;
}

export default function AvatarStudio({
  inventory,
  avatar,
  username,
  nameEffectId,
  onClose,
  onEquipAvatarItem,
}: Props) {
  const t = useTranslation();
  const nodeRef = useRef<HTMLDivElement>(null);
  useDialogBehavior(nodeRef, onClose);
  const { isSheet, draggableProps } = useWindowChrome();
  const [search, setSearch] = useState("");
  const displayUsername = username || t("avatar.studioDefaultUsername");

  const avatarItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    return inventory.filter((inv) => {
      if (inv.item?.type !== "AVATAR") return false;
      if (!term) return true;
      return (
        inv.item?.name?.toLowerCase().includes(term) ||
        inv.item?.avatarData?.slot?.toLowerCase().includes(term)
      );
    });
  }, [inventory, search]);

  const section = (
    <section
      ref={nodeRef}
      className={`${styles.window} ${isSheet ? styles.sheet : ""}`}
      aria-label={t("avatar.studioWindowAriaLabel")}
    >
      <header className={styles.header}>
        <div>
          <span>Avatar Studio</span>
          <h2>{t("avatar.studioTitle")}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("avatar.studioCloseAriaLabel")}
          className={chromeStyles.closeHitArea}
        >
          {t("common.close")}
        </button>
      </header>

      <div className={styles.body}>
        <aside className={styles.previewPanel}>
          <div className={styles.avatarStage}>
            <AvatarPreview
              avatarSlots={avatar?.slots || []}
              skinColor={avatar?.skinColor}
              width={132}
              height={132}
            />
          </div>
          <strong>
            <RarityText effect={nameEffectId}>{displayUsername}</RarityText>
          </strong>
          <p>{t("avatar.studioDescription")}</p>
        </aside>

        <main className={styles.itemsPanel}>
          <label className={styles.search}>
            {t("avatar.studioSearchLabel")}
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("avatar.studioSearchPlaceholder")}
            />
          </label>

          {avatarItems.length ? (
            <AvatarInventory
              inventory={avatarItems}
              avatar={avatar}
              onEquipAvatarItem={onEquipAvatarItem}
            />
          ) : (
            <div className={styles.empty}>
              <strong>{t("avatar.studioEmptyTitle")}</strong>
              <span>{t("avatar.studioEmptyHint")}</span>
            </div>
          )}
        </main>
      </div>
    </section>
  );

  if (isSheet) return section;

  return (
    <Draggable nodeRef={nodeRef} handle={`.${styles.header}`} cancel="button" {...draggableProps}>
      {section}
    </Draggable>
  );
}
