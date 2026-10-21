"use client";

import ItemCard from "../shared/ItemCard";
import Button from "../shared/Button";
import ColorSwatchPicker from "../shared/ColorSwatchPicker";
import { useTranslation } from "../../../i18n/useTranslation";
import { paletteColors } from "@codebuddies/world-objects";
import { useIsPremium } from "../../hooks/useIsPremium";
import styles from "./AvatarItemCard.module.css";

interface Props {
  inv: any;

  equipped: boolean;

  onEquipAvatarItem?: (item: any, color?: number) => void;
}

export default function AvatarItemCard({
  inv,
  equipped,
  onEquipAvatarItem,
}: Props) {
  const t = useTranslation();
  const slot = inv.item.avatarData?.slot;
  // Piel para el cuerpo, paleta general para el resto (free + premium,
  // compartidas con la API en packages/world-objects/palettes.ts).
  const palette = paletteColors(slot === "BODY" ? "SKIN" : "COLOR");
  const isPremium = useIsPremium();
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
              colors={palette.free}
              premiumColors={palette.premium}
              isPremium={isPremium}
              onSelect={(color) => onEquipAvatarItem?.(inv.item, color)}
              className={styles.colorPicker}
            />
          )}
        </div>
      }
    />
  );
}
