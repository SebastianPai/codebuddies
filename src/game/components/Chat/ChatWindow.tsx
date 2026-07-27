"use client";

import { useEffect, useRef, useState } from "react";

import styles from "./ChatWindow.module.css";
import {
  ChatMessage,
  getConversationMessages,
  markConversationRead,
  sendMessage,
  sendTyping,
} from "../../network/messages";
import { audioManager } from "../../audio/AudioManager";

type Props = {
  conversationId: string;
  partnerId: string;
  partnerUsername: string;
  partnerAvatarUrl?: string | null;
  onClose: () => void;
  onViewProfile: () => void;
};

const TYPING_DEBOUNCE_MS = 1500;

// El backend emite "message:new" a TODOS los participantes de la conversación,
// incluido quien lo envió — sin esto, un mensaje propio se agrega dos veces
// (una al recibir la respuesta de sendMessage(), otra al llegar el eco por SSE).
function appendIfNew(current: ChatMessage[], incoming: ChatMessage) {
  if (current.some((message) => message.id === incoming.id)) return current;
  return [...current, incoming];
}

export default function ChatWindow({
  conversationId,
  partnerId,
  partnerUsername,
  partnerAvatarUrl,
  onClose,
  onViewProfile,
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [sending, setSending] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    void getConversationMessages(conversationId).then((data) => {
      if (!cancelled) setMessages(data);
    });
    void markConversationRead(conversationId);

    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  useEffect(() => {
    const handleNewMessage = (event: Event) => {
      // El backend emite { conversationId, message } (RealtimeService.emitToUser
      // envuelve el payload tal cual), no el mensaje aplanado.
      const detail = (event as CustomEvent<{ conversationId: string; message: ChatMessage }>)
        .detail;
      if (!detail?.message || detail.conversationId !== conversationId) return;

      const incoming = detail.message;
      setMessages((current) => appendIfNew(current, incoming));
      setPartnerTyping(false);

      if (incoming.senderId === partnerId) {
        audioManager.play("notify");
      }
      void markConversationRead(conversationId);
    };

    const handleTyping = (event: Event) => {
      const detail = (event as CustomEvent<{ conversationId: string; isTyping: boolean }>).detail;
      if (!detail || detail.conversationId !== conversationId) return;
      setPartnerTyping(detail.isTyping);
    };

    window.addEventListener("codebuddies:message:new", handleNewMessage);
    window.addEventListener("codebuddies:message:typing", handleTyping);

    return () => {
      window.removeEventListener("codebuddies:message:new", handleNewMessage);
      window.removeEventListener("codebuddies:message:typing", handleTyping);
    };
  }, [conversationId, partnerId]);

  const handleDraftChange = (value: string) => {
    setDraft(value);

    void sendTyping(conversationId, true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      void sendTyping(conversationId, false);
    }, TYPING_DEBOUNCE_MS);
  };

  const handleSend = async () => {
    const body = draft.trim();
    if (!body || sending) return;

    setSending(true);
    setDraft("");
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    void sendTyping(conversationId, false);

    try {
      const created = await sendMessage(conversationId, body);
      setMessages((current) => appendIfNew(current, created));
    } catch {
      setDraft(body);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={styles.window}>
      <div className={styles.header} onClick={onViewProfile}>
        {partnerAvatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className={styles.avatar} src={partnerAvatarUrl} alt={partnerUsername} />
        ) : (
          <div className={styles.avatarFallback}>{partnerUsername.slice(0, 1).toUpperCase()}</div>
        )}
        <span className={styles.username}>{partnerUsername}</span>
        <button
          className={styles.closeBtn}
          aria-label="Cerrar chat"
          onClick={(event) => {
            event.stopPropagation();
            onClose();
          }}
        >
          ✕
        </button>
      </div>

      <div className={styles.messages} ref={listRef}>
        {messages.length === 0 && <div className={styles.empty}>Aún no hay mensajes. ¡Saluda!</div>}
        {messages.map((message) => {
          // Una conversación DIRECT sólo tiene 2 participantes: si el
          // remitente no es el partner, el mensaje es propio (evita tener
          // que conocer el propio userId aquí).
          const isOwn = message.senderId !== partnerId;
          const time = new Date(message.createdAt).toLocaleTimeString("es-CO", {
            hour: "2-digit",
            minute: "2-digit",
          });
          return (
            <div key={message.id} className={`${styles.bubbleRow} ${isOwn ? styles.own : ""}`}>
              <div className={styles.bubble}>{message.body}</div>
              <span className={styles.messageTime}>{time}</span>
            </div>
          );
        })}
      </div>

      {partnerTyping && <div className={styles.typing}>{partnerUsername} está escribiendo...</div>}

      <div className={styles.inputRow}>
        <input
          placeholder="Escribe un mensaje..."
          value={draft}
          onChange={(event) => handleDraftChange(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && void handleSend()}
        />
        <button
          className={styles.sendBtn}
          aria-label="Enviar mensaje"
          onClick={() => void handleSend()}
          disabled={!draft.trim() || sending}
        >
          ➤
        </button>
      </div>
    </div>
  );
}
