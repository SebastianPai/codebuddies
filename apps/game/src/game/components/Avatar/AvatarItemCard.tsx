"use client";

import ItemCard from "../shared/ItemCard";
import Button from "../shared/Button";
import ColorSwatchPicker from "../shared/ColorSwatchPicker";
import { useTranslation } from "../../../i18n/useTranslation";
import styles from "./AvatarItemCard.module.css";

interface Props {
  inv: any;

  equipped: boolean;

  onEquipAvatarItem?: (item: any, color?: number) => void;
}

const SKIN_COLORS = [
  0xf6d6bd, 0xeac086, 0xd9a066, 0xc68642, 0x8d5524, 0x5c3820,
];

const CLOTHES_COLORS = [
  0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff, 0xff6600,
  0x9900ff, 0xff1493, 0x00ff99, 0xffadad, 0xffd6a5, 0xfdffb6, 0xcaffbf,
  0x9bf6ff, 0xbdb2ff, 0xffffff, 0xd6d6d6, 0x888888, 0x444444, 0x000000,
];

export default function AvatarItemCard({
  inv,
  equipped,
  onEquipAvatarItem,
}: Props) {
  const t = useTranslation();
  const slot = inv.item.avatarData?.slot;
  const colors = slot === "BODY" ? SKIN_COLORS : CLOTHES_COLORS;
  const translation = inv.item.translations?.[0];
  const itemName = translation?.name ?? t("avatar.itemCardUnnamed");
  const itemDescription = translation?.description ?? "";

  return (
    <ItemCard
      item={inv.item}
      rarity={inv.item?.rarity}
      title={itemName}
      stackCount={inv.amount}
      selected={equipped}
      footer={
        <div className={styles.footer}>
          {itemDescription && <small className={styles.description}>{itemDescription}</small>}

          {equipped ? (
            <div className={styles.actions}>
              <Button variant="secondary" size="sm" fullWidth disabled>
                {t("avatar.itemCardEquipped")}
              </Button>
              <Button
                variant="danger"
                size="sm"
                fullWidth
                onClick={() => onEquipAvatarItem?.({ ...inv.item, id: "0" })}
              >
                {t("avatar.itemCardRemove")}
              </Button>
            </div>
          ) : (
            <Button variant="primary" size="sm" fullWidth onClick={() => onEquipAvatarItem?.(inv.item)}>
              {t("avatar.itemCardEquip")}
            </Button>
          )}

          {inv.item.colorable && equipped && (
            <ColorSwatchPicker
              colors={colors}
              onSelect={(color) => onEquipAvatarItem?.(inv.item, color)}
              className={styles.colorPicker}
            />
          )}
        </div>
      }
    />
  );
}
