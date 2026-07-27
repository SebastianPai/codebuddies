"use client";

import { useEffect, useState } from "react";
import { Socket } from "socket.io-client";

export function useInventory(socket: Socket | null) {
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // =========================
  // LOAD INVENTORY
  // =========================

  useEffect(() => {
    if (!socket) return;

    // PEDIR INVENTARIO
    socket.emit("inventory:get");

    // RECIBIR INVENTARIO
    const handleInventory = (data: any[]) => {
      const normalized = data.map((entry) => {
        const item = entry.item ?? {
          id: entry.itemId,
          name: entry.name,
          description: entry.description,
          imageUrl: entry.imageUrl,
          type: entry.type,
          rarity: entry.rarity,
          colorable: entry.colorable,
          avatarData: entry.avatarData,
          worldData: entry.worldData,
        };

        return {
          ...entry,
          amount: entry.amount ?? entry.quantity ?? 1,
          quantity: entry.quantity ?? entry.amount ?? 1,
          item,
        };
      });

      console.log("Inventory:", normalized);

      setInventory(normalized);
      setLoading(false);
    };

    const handleRefresh = () => {
      socket.emit("inventory:get");
    };

    socket.on("inventory:data", handleInventory);
    socket.on("inventory:refresh", handleRefresh);

    return () => {
      socket.off("inventory:data", handleInventory);
      socket.off("inventory:refresh", handleRefresh);
    };
  }, [socket]);

  return {
    inventory,
    loading,
  };
}

