"use client";

import { useEffect, useState } from "react";
import { Socket } from "socket.io-client";

export interface EnergyStatus {
  current: number;
  max: number;
  regenMinutes: number;
  nextRegenAt: string | null;
}

interface PlayerStats {
  level: number;
  experience: number;
  coins: number;
  diamonds?: number;
  energy?: EnergyStatus;
}

export function usePlayerStats(socket: Socket | null) {
  const [stats, setStats] = useState<PlayerStats | null>(null);

  useEffect(() => {
    if (!socket) return;

    socket.emit("player:stats:get");

    const handleStats = (data: PlayerStats) => {
      setStats(data);
    };

    socket.on("player:stats", handleStats);

    return () => {
      socket.off("player:stats", handleStats);
    };
  }, [socket]);

  return stats;
}
