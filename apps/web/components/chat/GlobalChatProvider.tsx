"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import GlobalChatWindows from "./GlobalChatWindows";
import { useTranslation } from "../../src/i18n/useTranslation";

type ChatContextType = {
  unread: number;
  openChats: string[];
  openChat: (conversationId: string) => void;
  closeChat: (conversationId: string) => void;
  // true en /messages: ahí la bandeja completa ya está en pantalla, así que
  // no se muestran burbujas, toasts ni el contador flotante.
  onMessagesPage: boolean;
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
  const pathname = usePathname() ?? "";
  const onMessagesPage = pathname.startsWith("/messages");

  const [unread, setUnread] = useState(0);
  const [openChats, setOpenChats] = useState<string[]>([]);

  // ==================== REALTIME ====================
  // Escucha solo los eventos que ya reenvía Navbar (codebuddies:*) desde su
  // única conexión SSE. Antes este provider abría una SEGUNDA EventSource
  // por pestaña (el doble de conexiones abiertas en el servidor) y además
  // contaba cada mensaje dos veces — incluidos los que uno mismo envía, que
  // hacían aparecer el aviso flotante de "mensajes sin leer" al escribir.
  useEffect(() => {
    if (!myId) return;

    const handleNewMessage = (event: Event) => {
      const payload = (event as CustomEvent).detail;
      if (!payload?.conversationId) return;
      if (payload.message?.senderId === myId) return;
      if (window.location.pathname.startsWith("/messages")) return;
      setUnread((prev) => prev + 1);
    };

    window.addEventListener("codebuddies:message:new", handleNewMessage);
    return () =>
      window.removeEventListener("codebuddies:message:new", handleNewMessage);
  }, [myId]);

  // Entrar a /messages cuenta como "visto".
  useEffect(() => {
    if (onMessagesPage) setUnread(0);
  }, [onMessagesPage]);

  const openChat = useCallback((conversationId: string) => {
    setOpenChats((prev) => {
      if (prev.includes(conversationId)) return prev;
      // Máximo 3 ventanas: más que eso tapa la pantalla.
      return [...prev, conversationId].slice(-3);
    });
    setUnread(0);
  }, []);

  const closeChat = useCallback((conversationId: string) => {
    setOpenChats((prev) => prev.filter((id) => id !== conversationId));
  }, []);

  const value = useMemo(
    () => ({ unread, openChats, openChat, closeChat, onMessagesPage }),
    [unread, openChats, openChat, closeChat, onMessagesPage],
  );

  return (
    <ChatContext.Provider value={value}>
      {children}
      {myId && <GlobalChatWindows />}
      {myId && unread > 0 && !onMessagesPage && openChats.length === 0 && (
        <Link
          href="/messages"
          onClick={() => setUnread(0)}
          className="fixed bottom-4 right-4 z-[9990] inline-flex items-center gap-2 rounded-full bg-[rgb(var(--button))] px-4 py-2.5 text-sm font-bold text-[rgb(var(--button-text))] shadow-xl transition hover:brightness-110 sm:bottom-6 sm:right-6"
        >
          <MessageCircle size={16} />
          {t("chat.unreadMessages", { count: unread })}
        </Link>
      )}
    </ChatContext.Provider>
  );
}
