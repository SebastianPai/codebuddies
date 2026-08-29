"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useAuth } from "../../hooks/useAuth";
import GlobalChatWindows from "./GlobalChatWindows";
import { useTranslation } from "../../src/i18n/useTranslation";
import { getRealtimeUrl } from "../../src/config/env";

type ChatContextType = {
  unread: number;
  openChats: string[];
  openChat: (conversationId: string) => void;
  closeChat: (conversationId: string) => void;
};

const ChatContext = createContext<ChatContextType | null>(null);

export function useGlobalChat() {
  const context = useContext(ChatContext);
  if (!context)
    throw new Error("useGlobalChat must be used inside GlobalChatProvider");
  return context;
}

export default function GlobalChatProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const myId = user?.userId || user?.id || "";
  const t = useTranslation();

  const [unread, setUnread] = useState(0);
  const [openChats, setOpenChats] = useState<string[]>([]);

  // ==================== REALTIME ====================
  useEffect(() => {
    if (!myId) return;

    const token = localStorage.getItem("token");
    let es: EventSource | null = null;

    if (token) {
      // Antes usaba una ruta relativa ("/api/realtime/events"), que
      // apuntaba al origen del FRONTEND (codebuddies.tech) en vez del
      // backend real -- esa ruta no existe ahí, así que el navegador
      // reintentaba la conexión SSE cada pocos segundos para siempre,
      // cada vez con un 404. Mismo host que ya usa Navbar.tsx para su
      // propia conexión a /realtime/events.
      es = new EventSource(
        `${getRealtimeUrl()}/realtime/events?token=${encodeURIComponent(token)}`,
      );

      const handleNewMessage = (event: MessageEvent) => {
        try {
          const payload = JSON.parse(event.data);
          const conversationId = payload.conversationId as string;

          if (!conversationId) return;

          setUnread((prev) => prev + 1);
          // ← Eliminado: ya NO abrimos automáticamente la burbuja
        } catch (err) {
          console.error(err);
        }
      };

      es.addEventListener("message:new", handleNewMessage);
    }

    // Custom Events
    const handleCustomNewMessage = (event: Event) => {
      const payload = (event as CustomEvent).detail;
      const conversationId = payload.conversationId as string;

      if (!conversationId) return;

      setUnread((prev) => prev + 1);
      // ← También eliminado aquí
    };

    window.addEventListener("codebuddies:message:new", handleCustomNewMessage);

    return () => {
      es?.close();
      window.removeEventListener(
        "codebuddies:message:new",
        handleCustomNewMessage,
      );
    };
  }, [myId]);

  const openChat = useCallback((conversationId: string) => {
    setOpenChats((prev) => {
      if (prev.includes(conversationId)) return prev;
      return [...prev, conversationId].slice(-10);
    });
    setUnread(0);
  }, []);

  const closeChat = useCallback((conversationId: string) => {
    setOpenChats((prev) => prev.filter((id) => id !== conversationId));
  }, []);

  return (
    <ChatContext.Provider value={{ unread, openChats, openChat, closeChat }}>
      {children}
      <GlobalChatWindows />
      {unread > 0 && (
        <button
          onClick={() => setUnread(0)}
          className="fixed bottom-6 right-6 z-[9999] rounded-full bg-blue-600 px-4 py-2 font-bold text-white shadow-xl hover:bg-blue-700"
        >
          {t("chat.unreadMessages", { count: unread })}
        </button>
      )}
    </ChatContext.Provider>
  );
}
