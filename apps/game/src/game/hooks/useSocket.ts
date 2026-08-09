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

    const handleConnect = () => {
      setSocket(s);
      s.emit("avatar:get"); // 🔥 CLAVE
    };

    // 🔥 esperar a que conecte si aún no está listo
    if (!s.connected) {
      s.on("connect", handleConnect);
    } else {
      handleConnect();
    }

    return () => {
      // El socket es un singleton global (no lo desconectamos acá), pero SÍ
      // hay que quitar este listener puntual: sin esto, cada mount/remount
      // (StrictMode, o los 3 componentes que usan este hook) apilaba un
      // "connect" nuevo para siempre, y cada reconexión disparaba todos los
      // acumulados a la vez.
      s?.off("connect", handleConnect);
    };
  }, []);

  return socket;
}
