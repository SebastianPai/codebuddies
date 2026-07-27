"use client";

import { useEffect, useRef, useState } from "react";
import Draggable from "react-draggable";
import { X } from "lucide-react";

import styles from "./MessagesPanel.module.css";
import {
  Conversation,
  MessageRequestItem,
  acceptMessageRequest,
  getInbox,
  getMessageRequests,
  rejectMessageRequest,
} from "../../network/messages";
import { useChat } from "./ChatProvider";
import { audioManager } from "../../audio/AudioManager";

type Props = {
  onClose: () => void;
};

export default function MessagesPanel({ onClose }: Props) {
  const { openChat } = useChat();
  const nodeRef = useRef<HTMLDivElement>(null);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [requests, setRequests] = useState<MessageRequestItem[]>([]);

  const load = async () => {
    try {
      const [inbox, pending] = await Promise.all([getInbox(), getMessageRequests()]);
      setConversations(inbox);
      setRequests(pending);
    } catch {
      // silencioso: se puede reintentar cerrando y reabriendo el panel
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    const refresh = () => void load();
    const handleNewMessage = () => {
      void load();
      audioManager.play("notify");
    };

    window.addEventListener("codebuddies:message:new", handleNewMessage);
    window.addEventListener("codebuddies:message:seen", refresh);
    window.addEventListener("codebuddies:conversation:deleted", refresh);

    return () => {
      window.removeEventListener("codebuddies:message:new", handleNewMessage);
      window.removeEventListener("codebuddies:message:seen", refresh);
      window.removeEventListener("codebuddies:conversation:deleted", refresh);
    };
  }, []);

  const handleAcceptRequest = async (id: string) => {
    try {
      await acceptMessageRequest(id);
      audioManager.play("notify");
      await load();
    } catch {
      // el usuario puede reintentar desde el panel
    }
  };

  const handleRejectRequest = async (id: string) => {
    try {
      await rejectMessageRequest(id);
      await load();
    } catch {
      // el usuario puede reintentar desde el panel
    }
  };

  return (
    <Draggable nodeRef={nodeRef} handle={`.${styles.windowHeader}`}>
      <div ref={nodeRef} className={styles.window}>
        <div className={styles.windowHeader}>
          <span className={styles.title}>MENSAJES</span>
          <button className={styles.closeBtn} aria-label="Cerrar mensajes" onClick={onClose}>
            <X size={14} />
          </button>
        </div>

        {requests.length > 0 && (
          <>
            <div className={styles.sectionLabel}>SOLICITUDES DE MENSAJE</div>
            <div className={styles.list}>
              {requests.map((request) => (
                <div key={request.id} className={styles.requestRow}>
                  <div className={styles.requestBody}>
                    <span className={styles.requestUser}>{request.sender.username}</span>: {request.body}
                  </div>
                  <div className={styles.requestActions}>
                    <button
                      className={`${styles.miniBtn} ${styles.primary}`}
                      onClick={() => void handleAcceptRequest(request.id)}
                    >
                      Aceptar
                    </button>
                    <button className={styles.miniBtn} onClick={() => void handleRejectRequest(request.id)}>
                      Rechazar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className={styles.sectionLabel}>CONVERSACIONES</div>
        <div className={styles.list}>
          {conversations.length === 0 && (
            <div className={styles.empty}>
              No tienes conversaciones aún. Escríbele a un amigo desde el panel de Amigos.
            </div>
          )}
          {conversations.map((conversation) => (
            <div
              key={conversation.id}
              className={styles.conversationRow}
              onClick={() =>
                openChat(conversation.partner.id, conversation.partner.username, conversation.partner.avatarUrl)
              }
            >
              {conversation.partner.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className={styles.avatar} src={conversation.partner.avatarUrl} alt={conversation.partner.username} />
              ) : (
                <div className={styles.avatarFallback}>
                  {conversation.partner.username.slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className={styles.conversationInfo}>
                <div className={styles.conversationUser}>{conversation.partner.username}</div>
                {conversation.lastMessage && (
                  <div className={styles.conversationPreview}>{conversation.lastMessage.body}</div>
                )}
              </div>
              {conversation.unreadCount > 0 && (
                <span className={styles.unreadBadge}>{conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </Draggable>
  );
}
