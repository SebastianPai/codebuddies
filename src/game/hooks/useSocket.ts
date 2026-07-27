// hooks/useSocket.ts
"use client";

import { useEffect, useState } from "react";
import { Socket } from "socket.io-client";
import { createSocket, getSocket } from "../network/socket";

export function useSocket(): Socket | null {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    let s = getSocket();

    // 🔥 si no existe, lo creamos
    if (!s) {
      s = createSocket();
    }

    // 🔥 esperar a que conecte si aún no está listo
    if (!s.connected) {
      s.on("connect", () => {
        console.log("✅ Socket listo en hook");
        setSocket(s);
        s.emit("avatar:get"); // 🔥 CLAVE
      });
    } else {
      setSocket(s);
      s.emit("avatar:get"); // 🔥 CLAVE
    }

    return () => {
      // no desconectamos → singleton global
    };
  }, []);

  return socket;
}
