"use client";

// Provee dos cosas que necesitan compartir FriendsPanel, MessagesPanel,
// ChatWindow y ProfileModal sin acoplarse entre sí: abrir un chat 1:1
// (crea/reutiliza la conversación y apila la ventana) y abrir el modal de
// perfil de un usuario.
// Un solo contexto para ambas porque "Mensaje" y "Ver perfil" son las dos
// acciones que salen de cualquier fila de persona en toda la feature.

import { createContext, useCallback, useContext, useState } from "react";
import styles from "./ChatProvider.module.css";
import ChatWindow from "./ChatWindow";
import ProfileModal from "../Friends/ProfileModal";
import { createDirectConversation } from "../../network/messages";
import { showGameAlert } from "../../utils/dialog";
import { useTranslation } from "../../../i18n/useTranslation";

const MAX_OPEN_CHATS = 3;

type OpenChat = {
  conversationId: string;
  partnerId: string;
  partnerUsername: string;
  partnerAvatarUrl?: string | null;
  partnerNameEffectId?: string | null;
};

type ChatContextType = {
  openChat: (
    partnerId: string,
    partnerUsername: string,
    partnerAvatarUrl?: string | null,
    partnerNameEffectId?: string | null,
  ) => void;
  openProfile: (username: string) => void;
};

const ChatContext = createContext<ChatContextType | null>(null);

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat debe usarse dentro de <ChatProvider>");
  }
  return context;
}

export default function ChatProvider({ children }: { children: React.ReactNode }) {
  const t = useTranslation();
  const [openChats, setOpenChats] = useState<OpenChat[]>([]);
  const [viewingProfile, setViewingProfile] = useState<string | null>(null);

  const openChat = useCallback(
    async (
      partnerId: string,
      partnerUsername: string,
      partnerAvatarUrl?: string | null,
      partnerNameEffectId?: string | null,
    ) => {
      setOpenChats((current) => {
        if (current.some((chat) => chat.partnerId === partnerId)) return current;
        return current;
      });

      try {
        const result = await createDirectConversation(partnerId);

        if ("requiresApproval" in result && result.requiresApproval) {
          await showGameAlert({
            title: t("chat.requestSentTitle"),
            message: t("chat.requestSentMessage", { username: partnerUsername }),
            confirmLabel: t("common.understood"),
            tone: "default",
          });
          return;
        }

        if (!("id" in result)) return;

        setOpenChats((current) => {
          if (current.some((chat) => chat.conversationId === result.id)) return current;

          const next = [
            ...current,
            { conversationId: result.id, partnerId, partnerUsername, partnerAvatarUrl, partnerNameEffectId },
          ];

          return next.length > MAX_OPEN_CHATS ? next.slice(next.length - MAX_OPEN_CHATS) : next;
        });
      } catch {
        await showGameAlert({
          title: t("chat.openFailedTitle"),
          message: t("common.actionFailedMessage"),
          confirmLabel: t("common.understood"),
          tone: "danger",
        });
      }
    },
    [],
  );

  const closeChat = useCallback((conversationId: string) => {
    setOpenChats((current) => current.filter((chat) => chat.conversationId !== conversationId));
  }, []);

  const openProfile = useCallback((username: string) => {
    setViewingProfile(username);
  }, []);

  return (
    <ChatContext.Provider value={{ openChat, openProfile }}>
      {children}

      <div className={styles.stack}>
        {openChats.map((chat) => (
          <ChatWindow
            key={chat.conversationId}
            conversationId={chat.conversationId}
            partnerId={chat.partnerId}
            partnerUsername={chat.partnerUsername}
            partnerAvatarUrl={chat.partnerAvatarUrl}
            partnerNameEffectId={chat.partnerNameEffectId}
            onClose={() => closeChat(chat.conversationId)}
            onViewProfile={() => openProfile(chat.partnerUsername)}
          />
        ))}
      </div>

      {viewingProfile && (
        <ProfileModal
          username={viewingProfile}
          onClose={() => setViewingProfile(null)}
          onOpenChat={(partnerId, partnerUsername, partnerAvatarUrl, partnerNameEffectId) => {
            setViewingProfile(null);
            void openChat(partnerId, partnerUsername, partnerAvatarUrl, partnerNameEffectId);
          }}
        />
      )}
    </ChatContext.Provider>
  );
}
