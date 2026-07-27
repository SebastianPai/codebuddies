// hooks/useAvatar.ts
"use client";

import { useEffect, useState } from "react";
import { Socket } from "socket.io-client";

// 🔥 Tipos basados en tu backend
interface Sprite {
  imageUrl: string;
  frameWidth: number;
  frameHeight: number;
  framesCount: number;
  rows: number;
  animation: {
    speed: number;
    loop: boolean;
  };
}

interface ParsedSlot {
  slot: string;
  itemId: string | null;
  imageUrl?: string | null;
  layer?: number;
  color?: number | null;
  colorable?: boolean;
  sprites: Sprite[];
}

export interface ParsedAvatar {
  slots: ParsedSlot[];
  skinColor: number;
}

// 🔥 Hook
export function useAvatar(socket: Socket | null) {
  const [avatar, setAvatar] = useState<ParsedAvatar | null>(null);

  useEffect(() => {
    if (!socket) return;

    // 🔥 pedir avatar
    socket.emit("avatar:get");

    // 🔥 handlers tipados
    const handleAvatar = (data: ParsedAvatar) => {
      console.log("🔥 Avatar recibido:", data);
      setAvatar(data);
    };

    const handleUpdate = (data: { playerId: string; avatar: ParsedAvatar }) => {
      console.log("🔄 Avatar update:", data);
      setAvatar(data.avatar);
    };

    socket.on("avatar:current", handleAvatar);
    socket.on("playerAvatarUpdated", handleUpdate);

    return () => {
      socket.off("avatar:current", handleAvatar);
      socket.off("playerAvatarUpdated", handleUpdate);
    };
  }, [socket]);

  return avatar;
}
