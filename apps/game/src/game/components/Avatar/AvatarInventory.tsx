"use client";

import { useState } from "react";

import AvatarSlotFilter from "./AvatarSlotFilter";
import AvatarItemCard from "./AvatarItemCard";
import ItemGrid from "../shared/ItemGrid";

interface Props {
  inventory: any[];

  avatar?: any;

  onEquipAvatarItem?: (item: any, color?: number) => void;
}

export default function AvatarInventory({
  inventory,
  avatar,
  onEquipAvatarItem,
}: Props) {
  const [slotFilter, setSlotFilter] = useState("ALL");

  const equippedIds = new Set(
    avatar?.slots
      ?.filter((slot: any) => slot.itemId)
      ?.map((slot: any) => slot.itemId) || [],
  );

  const filteredInventory =
    slotFilter === "ALL"
      ? inventory
      : inventory.filter((inv) => inv.item.avatarData?.slot === slotFilter);

  return (
    <>
      <AvatarSlotFilter value={slotFilter} onChange={setSlotFilter} />

      <ItemGrid isEmpty={filteredInventory.length === 0} empty="No tienes objetos en esta categoría.">
        {filteredInventory.map((inv) => (
          <AvatarItemCard
            key={inv.id}
            inv={inv}
            equipped={equippedIds.has(inv.item.id)}
            onEquipAvatarItem={onEquipAvatarItem}
          />
        ))}
      </ItemGrid>
    </>
  );
}
