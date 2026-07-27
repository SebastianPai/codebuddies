"use client";

import { Socket } from "socket.io-client";

export function useEquipAvatar(socket: Socket | null) {
  const equipItem = (slot: string, itemId: string, color?: number | null) => {
    if (!socket) return;

    socket.emit("avatar:equip", {
      slot,
      itemId,
      color,
    });
  };

  const unequipItem = (slot: string) => {
    if (!socket) return;

    socket.emit("avatar:equip", {
      slot,
      itemId: "0",
    });
  };

  return {
    equipItem,
    unequipItem,
  };
}
