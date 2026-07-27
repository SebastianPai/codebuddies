"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Minus, Send, Smile, X } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { api } from "../../utils/api";
import { useGlobalChat } from "./GlobalChatProvider";
import { useTranslation } from "../../src/i18n/useTranslation";

type UserLite = {
  id: string;
  username: string;
  avatarUrl: string | null;
  online?: boolean;
};

type Message = {
  id: string;
  body: string;
  senderId: string;
  createdAt: string;
  sender: UserLite;
};

type Conversation = {
  id: string;
  partner: UserLite | null;
  lastMessage?: Message | null;
};

type Notification = {
  id: string;
  conversationId: string;
  message: Message;
  timestamp: number;
};

function Avatar({ user }: { user?: UserLite | null }) {
  return (
    <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-zinc-800">
      {user?.avatarUrl ? (
        <Image src={user.avatarUrl} alt="" width={44} height={44} />
      ) : (
        <span className="flex h-full items-center justify-center font-black">
          {user?.username?.[0]?.toUpperCase() ?? "?"}
        </span>
      )}
      {user?.online && (
        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border border-black bg-emerald-400" />
      )}
    </div>
  );
}

// ==================== TOAST NOTIFICACIÓN (Estilo iPhone) ====================
function MessageToast({
  notification,
  onOpen,
  index,
}: {
  notification: Notification;
  onOpen: () => void;
  index: number;
}) {
  const t = useTranslation();
  return (
    <div
      onClick={onOpen}
      className="w-80 cursor-pointer rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 shadow-2xl transition-all hover:scale-[1.02] active:scale-[0.98]"
      style={{
        transform: `translateY(-${index * 12}px) scale(${1 - index * 0.04})`,
        zIndex: 100 - index,
        opacity: 1 - index * 0.12,
      }}
    >
      <div className="flex gap-3">
        <Avatar user={notification.message.sender} />
        <div className="flex-1 min-w-0">
          <p className="font-bold">@{notification.message.sender.username}</p>
          <p className="text-sm text-zinc-300 line-clamp-2 mt-0.5">
            {notification.message.body}
          </p>
          <p className="text-xs text-zinc-500 mt-2">{t("chat.justNow")}</p>
        </div>
      </div>
    </div>
  );
}

function MiniBubble({ conversation, myId, onClose, onOpen }: any) {
  const t = useTranslation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [newMessageCount, setNewMessageCount] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);

  const loadMessages = useCallback(async () => {
    try {
      const data = await api.get<Message[]>(
        `/messages/conversations/${conversation.id}/messages`,
      );
      setMessages(data);
    } catch (err) {
      console.error(err);
    }
  }, [conversation.id]);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight, behavior });
    isAtBottomRef.current = true;
    setNewMessageCount(0);
  };

  const handleScroll = () => {
    const node = scrollRef.current;
    if (!node) return;
    isAtBottomRef.current =
      node.scrollHeight - node.scrollTop - node.clientHeight < 60;
    if (isAtBottomRef.current) setNewMessageCount(0);
  };

  useEffect(() => {
    if (!collapsed) loadMessages();
  }, [collapsed, loadMessages]);

  useEffect(() => {
    const handleNewMessage = (event: Event) => {
      const payload = (event as CustomEvent).detail;
      if (payload.conversationId !== conversation.id) return;

      const newMsg = payload.message as Message;
      setMessages((prev) => [...prev, newMsg]);

      if (!isAtBottomRef.current && newMsg.senderId !== myId) {
        setNewMessageCount((c) => c + 1);
      } else {
        scrollToBottom("smooth");
      }
    };

    window.addEventListener("codebuddies:message:new", handleNewMessage);
    return () =>
      window.removeEventListener("codebuddies:message:new", handleNewMessage);
  }, [conversation.id, myId]);

  const sendMessage = async () => {
    const text = body.trim();
    if (!text) return;
    setBody("");
    await api.post(`/messages/conversations/${conversation.id}/messages`, {
      body: text,
    });
  };

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="relative h-14 w-14 shrink-0 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card))] shadow-2xl hover:scale-105 transition"
      >
        <Avatar user={conversation.partner} />
      </button>
    );
  }

  return (
    <div className="flex h-[440px] w-80 shrink-0 flex-col overflow-hidden rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] shadow-2xl">
      <div className="flex items-center gap-2 border-b border-[rgb(var(--border))] p-3">
        <button
          onClick={onOpen}
          className="flex flex-1 items-center gap-2 text-left"
        >
          <Avatar user={conversation.partner} />
          <div>
            <p className="font-bold">@{conversation.partner?.username}</p>
            <p className="text-xs text-emerald-400">{t("chat.online")}</p>
          </div>
        </button>
        <button
          onClick={() => setCollapsed(true)}
          className="p-2 hover:bg-zinc-800 rounded-lg"
        >
          <Minus size={18} />
        </button>
        <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-lg">
          <X size={18} />
        </button>
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto bg-[rgb(var(--background))] p-4 space-y-3"
      >
        {messages.map((msg) => {
          const isMine = msg.senderId === myId;
          return (
            <div
              key={msg.id}
              className={`flex ${isMine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[78%] rounded-2xl px-4 py-2.5 ${isMine ? "bg-[rgb(var(--primary))] text-black rounded-br-none" : "bg-zinc-800 rounded-bl-none"}`}
              >
                <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                <p className="text-[10px] mt-1 opacity-70 text-right">
                  {new Date(msg.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-[rgb(var(--border))] p-3">
        <div className="flex gap-2">
          <button className="rounded-xl border border-[rgb(var(--border))] p-2.5">
            <Smile size={20} />
          </button>
          <input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder={t("chat.messagePlaceholder")}
            className="flex-1 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-4 py-2 outline-none focus:border-[rgb(var(--primary))]"
          />
          <button
            onClick={sendMessage}
            disabled={!body.trim()}
            className="bg-[rgb(var(--primary))] text-black rounded-xl px-4 disabled:opacity-50"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GlobalChatWindows() {
  const { openChats, closeChat, openChat } = useGlobalChat();
  const { user } = useAuth();
  const myId = user?.userId || user?.id || "";

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const loadConversations = useCallback(async () => {
    if (!myId) return;
    try {
      const data = await api.get<Conversation[]>("/messages/conversations");
      setConversations(data);
    } catch (err) {
      console.error(err);
    }
  }, [myId]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Escuchar nuevos mensajes
  useEffect(() => {
    const handleNewMessage = (event: Event) => {
      const payload = (event as CustomEvent).detail;
      if (!payload.message || payload.message.senderId === myId) return;

      const newNotif: Notification = {
        id: Date.now().toString(),
        conversationId: payload.conversationId,
        message: payload.message,
        timestamp: Date.now(),
      };

      setNotifications((prev) => [newNotif, ...prev].slice(0, 3));
    };

    window.addEventListener("codebuddies:message:new", handleNewMessage);
    return () =>
      window.removeEventListener("codebuddies:message:new", handleNewMessage);
  }, [myId]);

  const visibleChats = openChats
    .map((id) => conversations.find((c) => c.id === id))
    .filter(Boolean) as Conversation[];

  return (
    <>
      {/* Notificaciones apiladas estilo iPhone */}
      <div className="fixed bottom-28 right-6 z-[10000] flex flex-col gap-3">
        {notifications.map((notif, index) => (
          <MessageToast
            key={notif.id}
            notification={notif}
            index={index}
            onOpen={() => {
              openChat(notif.conversationId);
              setNotifications([]); // ← Borra TODAS las notificaciones al abrir
            }}
          />
        ))}
      </div>

      {/* Burbujas de chat */}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-row-reverse items-end gap-3 max-w-[calc(100vw-2rem)] overflow-x-auto pb-4">
        {visibleChats.map((conv) => (
          <MiniBubble
            key={conv.id}
            conversation={conv}
            myId={myId}
            onClose={() => closeChat(conv.id)}
            onOpen={() => openChat(conv.id)}
          />
        ))}
      </div>
    </>
  );
}
