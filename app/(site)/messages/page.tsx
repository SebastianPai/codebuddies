"use client";

import Image from "next/image";
import Link from "next/link";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Ban,
  BellOff,
  CheckCheck,
  ExternalLink,
  MessageCircle,
  MoreVertical,
  Send,
  Smile,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import { useAuth } from "../../../hooks/useAuth";
import { api } from "../../../utils/api";
import { useTranslation } from "../../../src/i18n/useTranslation";
import { Button, ErrorState, Skeleton } from "../../../src/shared/ui";

const EMOJIS = [
  "👍",
  "❤️",
  "😂",
  "😮",
  "😢",
  "🔥",
  "👏",
  "🚀",
  "✅",
  "💡",
  "🎉",
  "👀",
];

type UserLite = {
  id: string;
  username: string;
  avatarUrl: string | null;
  online?: boolean;
};

type Friendship = {
  id: string;
  friend?: UserLite;
  requester: UserLite;
  addressee: UserLite;
};

type Message = {
  id: string;
  body: string;
  senderId: string;
  deliveredAt?: string | null;
  seenAt?: string | null;
  createdAt: string;
  sender: UserLite;
};

type Conversation = {
  id: string;
  partner: UserLite | null;
  participants: Array<{
    userId: string;
    user: UserLite;
    lastReadAt?: string | null;
  }>;
  lastMessage?: Message | null;
  unreadCount: number;
};

type MessageRequest = { id: string; sender: UserLite; createdAt: string };
type Reaction = { userId: string; emoji: string };

export default function MessagesPage() {
  const { user } = useAuth();
  const myId = user?.userId || user?.id || "";
  const t = useTranslation();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [requests, setRequests] = useState<MessageRequest[]>([]);
  const [friends, setFriends] = useState<UserLite[]>([]);
  const [messagesByConversation, setMessagesByConversation] = useState<
    Record<string, Message[]>
  >({});
  const [activeId, setActiveId] = useState("");
  const [bodyByConversation, setBodyByConversation] = useState<
    Record<string, string>
  >({});
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
  const [reactions, setReactions] = useState<Record<string, Reaction[]>>({});
  const [mutedChats, setMutedChats] = useState<Record<string, boolean>>({});
  const [locallyDeleted, setLocallyDeleted] = useState<Record<string, boolean>>(
    {},
  );
  const [clearedChats, setClearedChats] = useState<Record<string, boolean>>({});
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [emojiFor, setEmojiFor] = useState<string | null>(null);
  const [reactionFor, setReactionFor] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [filter, setFilter] = useState("");
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const visibleConversations = conversations.filter(
    (item) => !locallyDeleted[item.id],
  );

  const active = useMemo(
    () =>
      visibleConversations.find(
        (conversation) => conversation.id === activeId,
      ) ?? null,
    [activeId, visibleConversations],
  );

  const load = useCallback(async () => {
    try {
      const [conversationData, requestData, friendshipData] = await Promise.all([
        api.get<Conversation[]>("/messages/conversations"),
        api.get<MessageRequest[]>("/messages/requests"),
        api.get<Friendship[]>("/friendships"),
      ]);
      setConversations(conversationData);
      setRequests(requestData);
      setFriends(
        friendshipData.map(
          (item) => item.friend ?? item.addressee ?? item.requester,
        ),
      );
      setLoadError(false);
    } catch {
      setLoadError(true);
    } finally {
      setInitialLoading(false);
    }
  }, []);

  const openConversation = useCallback(
    async (conversationId: string) => {
      setActiveId(conversationId);
      try {
        const data = await api.get<Message[]>(
          `/messages/conversations/${conversationId}/messages`,
        );
        setMessagesByConversation((prev) => ({
          ...prev,
          [conversationId]: data,
        }));
        setClearedChats((prev) => ({ ...prev, [conversationId]: false }));
        await api.patch(`/messages/conversations/${conversationId}/read`);
        await load();
      } catch {
        toast.error(t("common.unexpectedError"));
      }
    },
    [load, t],
  );

  // Realtime Events
  useEffect(() => {
    const handleNewMessage = (event: Event) => {
      const payload = (event as CustomEvent).detail;
      const conversationId = payload.conversationId as string;
      const message = payload.message as Message;

      void load();

      setMessagesByConversation((prev) => ({
        ...prev,
        [conversationId]: prev[conversationId]?.some(
          (item) => item.id === message.id,
        )
          ? prev[conversationId]
          : [...(prev[conversationId] ?? []), message],
      }));

      if (conversationId === activeId) {
        void api.patch(`/messages/conversations/${conversationId}/read`);
      }
    };

    const handleSeen = (event: Event) => {
      const payload = (event as CustomEvent).detail;
      patchMessages(payload.conversationId, (message) =>
        message.senderId === myId
          ? { ...message, seenAt: payload.seenAt }
          : message,
      );
    };

    const handleDelivered = (event: Event) => {
      const payload = (event as CustomEvent).detail;
      patchMessages(payload.conversationId, (message) =>
        message.senderId === myId
          ? {
              ...message,
              deliveredAt: message.deliveredAt ?? new Date().toISOString(),
            }
          : message,
      );
    };

    const handleTyping = (event: Event) => {
      const payload = (event as CustomEvent).detail;
      setTypingUsers((prev) => ({
        ...prev,
        [payload.conversationId]: payload.isTyping,
      }));
    };

    const handleReaction = (event: Event) => {
      const payload = (event as CustomEvent).detail;
      setReactions((prev) => ({
        ...prev,
        [payload.messageId]: [
          ...(prev[payload.messageId] ?? []).filter(
            (item) => item.userId !== payload.userId,
          ),
          { userId: payload.userId, emoji: payload.emoji },
        ],
      }));
    };

    const handleDeleted = (event: Event) => {
      const payload = (event as CustomEvent).detail;
      setLocallyDeleted((prev) => ({
        ...prev,
        [payload.conversationId]: true,
      }));
    };

    const handlePresence = (event: Event) => {
      const payload = (event as CustomEvent).detail;
      const userId = payload.userId as string;
      const online = payload.online as boolean | undefined;

      setConversations((prev) =>
        prev.map((conversation) => {
          if (conversation.partner?.id === userId) {
            return {
              ...conversation,
              partner: {
                ...conversation.partner!, // ← Non-null assertion aquí
                online,
              },
            };
          }
          return conversation;
        }),
      );

      setFriends((prev) =>
        prev.map((friend) =>
          friend.id === userId ? { ...friend, online } : friend,
        ),
      );
    };

    const handleNotification = () => void load();

    window.addEventListener("codebuddies:message:new", handleNewMessage);
    window.addEventListener("codebuddies:message:seen", handleSeen);
    window.addEventListener("codebuddies:message:delivered", handleDelivered);
    window.addEventListener("codebuddies:message:typing", handleTyping);
    window.addEventListener("codebuddies:message:reaction", handleReaction);
    window.addEventListener("codebuddies:conversation:deleted", handleDeleted);
    window.addEventListener("codebuddies:presence:update", handlePresence);
    window.addEventListener("codebuddies:notification:new", handleNotification);

    return () => {
      window.removeEventListener("codebuddies:message:new", handleNewMessage);
      window.removeEventListener("codebuddies:message:seen", handleSeen);
      window.removeEventListener(
        "codebuddies:message:delivered",
        handleDelivered,
      );
      window.removeEventListener("codebuddies:message:typing", handleTyping);
      window.removeEventListener(
        "codebuddies:message:reaction",
        handleReaction,
      );
      window.removeEventListener(
        "codebuddies:conversation:deleted",
        handleDeleted,
      );
      window.removeEventListener("codebuddies:presence:update", handlePresence);
      window.removeEventListener(
        "codebuddies:notification:new",
        handleNotification,
      );
    };
  }, [activeId, load, myId]);

  function patchMessages(
    conversationId: string,
    patch: (message: Message) => Message,
  ) {
    setMessagesByConversation((prev) => ({
      ...prev,
      [conversationId]: (prev[conversationId] ?? []).map(patch),
    }));
  }

  useEffect(() => {
    void load();
  }, [load]);

  async function startChat(friend: UserLite) {
    try {
      const response = await api.post<{
        id?: string;
        requiresApproval?: boolean;
      }>("/messages/conversations", { userId: friend.id });
      setShowNew(false);
      if (response.requiresApproval) return void load();
      if (response.id) await openConversation(response.id);
    } catch {
      toast.error(t("common.unexpectedError"));
    }
  }

  async function acceptRequest(requestId: string) {
    try {
      const conversation = await api.patch<{ id: string }>(
        `/messages/requests/${requestId}/accept`,
      );
      await load();
      await openConversation(conversation.id);
    } catch {
      toast.error(t("common.unexpectedError"));
    }
  }

  async function sendMessage(conversationId: string) {
    const text = bodyByConversation[conversationId]?.trim();
    if (!text) return;
    setBodyByConversation((prev) => ({ ...prev, [conversationId]: "" }));
    try {
      await api.post(`/messages/conversations/${conversationId}/messages`, {
        body: text,
      });
    } catch {
      // Restore the draft so the user doesn't silently lose what they typed.
      setBodyByConversation((prev) => ({ ...prev, [conversationId]: text }));
      toast.error(t("common.unexpectedError"));
    }
  }

  async function setTyping(conversationId: string, value: string) {
    setBodyByConversation((prev) => ({ ...prev, [conversationId]: value }));
    try {
      await api.post(`/messages/conversations/${conversationId}/typing`, {
        isTyping: true,
      });
    } catch {
      // Typing pings are best-effort; a transient failure isn't worth surfacing.
    }

    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      void api
        .post(`/messages/conversations/${conversationId}/typing`, {
          isTyping: false,
        })
        .catch(() => {});
    }, 900);
  }

  async function react(
    conversationId: string,
    messageId: string,
    emoji: string,
  ) {
    setReactionFor(null);
    try {
      await api.post(
        `/messages/conversations/${conversationId}/messages/${messageId}/reactions`,
        { emoji },
      );
    } catch {
      toast.error(t("common.unexpectedError"));
    }
  }

  async function blockPartner(conversation: Conversation) {
    if (!conversation.partner) return;
    try {
      await api.post("/friendships/blocks", { userId: conversation.partner.id });
      setLocallyDeleted((prev) => ({ ...prev, [conversation.id]: true }));
    } catch {
      toast.error(t("common.unexpectedError"));
    }
  }

  async function deleteConversation(conversationId: string) {
    try {
      await api.patch(`/messages/conversations/${conversationId}/delete`);
      setLocallyDeleted((prev) => ({ ...prev, [conversationId]: true }));
    } catch {
      toast.error(t("common.unexpectedError"));
    }
  }

  const filteredFriends = friends.filter((friend) =>
    friend.username.toLowerCase().includes(filter.toLowerCase()),
  );

  return (
    <>
      <main className="mx-auto flex h-[calc(100vh-96px)] max-w-7xl overflow-hidden rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))]">
        <aside className="flex w-96 flex-col border-r border-[rgb(var(--border))]">
          <div className="border-b border-[rgb(var(--border))] p-5">
            <h1 className="flex items-center gap-3 text-3xl font-black">
              <MessageCircle className="text-[rgb(var(--primary))]" />
              {t("chat.messagesTitle")}
            </h1>
          </div>

          <div className="border-b border-[rgb(var(--border))] p-4">
            <button
              onClick={() => setShowNew(true)}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[rgb(var(--button))] py-3 font-black text-[rgb(var(--button-text))]"
            >
              <UserPlus size={18} /> {t("chat.newChatButton")}
            </button>
          </div>

          {!!requests.length && (
            <div className="border-b border-[rgb(var(--border))] p-3">
              {requests.map((request) => (
                <button
                  key={request.id}
                  onClick={() => acceptRequest(request.id)}
                  className="flex w-full items-center justify-between rounded-lg p-3 text-left hover:bg-[rgb(var(--border)/0.4)]"
                >
                  <span>@{request.sender.username}</span>
                  <span className="text-xs text-[rgb(var(--primary))]">
                    {t("chat.acceptRequestAction")}
                  </span>
                </button>
              ))}
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-3">
            {initialLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </div>
            ) : loadError ? (
              <div className="space-y-3 p-2">
                <ErrorState message={t("common.unexpectedError")} />
                <Button variant="primary" onClick={() => void load()} className="w-full">
                  {t("common.refresh")}
                </Button>
              </div>
            ) : !visibleConversations.length ? (
              <p className="p-4 text-center text-sm text-[rgb(var(--secondary-text))]">
                {t("chat.noMessagesYetFallback")}
              </p>
            ) : (
              visibleConversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => openConversation(conversation.id)}
                className={`flex w-full items-center gap-3 rounded-lg p-3 text-left hover:bg-[rgb(var(--border)/0.4)] ${
                  activeId === conversation.id ? "bg-[rgb(var(--border)/0.5)]" : ""
                }`}
              >
                <Avatar user={conversation.partner} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-bold">
                      @{conversation.partner?.username ?? t("chat.unknownUserFallback")}
                    </p>
                    {!!conversation.unreadCount && (
                      <span className="rounded-full bg-[rgb(var(--button))] px-2 text-xs font-black text-[rgb(var(--button-text))]">
                        {conversation.unreadCount}
                      </span>
                    )}
                  </div>
                  <p className="truncate text-sm text-[rgb(var(--secondary-text))]">
                    {conversation.lastMessage?.body ?? t("chat.noMessagesYetFallback")}
                  </p>
                </div>
              </button>
              ))
            )}
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          {active ? (
            <ChatPanel
              conversation={active}
              messages={
                clearedChats[active.id]
                  ? []
                  : (messagesByConversation[active.id] ?? [])
              }
              myId={myId}
              body={bodyByConversation[active.id] ?? ""}
              typing={!!typingUsers[active.id]}
              reactions={reactions}
              menuFor={menuFor}
              emojiOpen={emojiFor === active.id}
              reactionFor={reactionFor}
              onMenu={setMenuFor}
              onEmoji={() =>
                setEmojiFor(emojiFor === active.id ? null : active.id)
              }
              onReactionFor={setReactionFor}
              onBody={(value) => setTyping(active.id, value)}
              onSend={() => sendMessage(active.id)}
              onReact={(messageId, emoji) => react(active.id, messageId, emoji)}
              onMute={() =>
                setMutedChats((prev) => ({
                  ...prev,
                  [active.id]: !prev[active.id],
                }))
              }
              onClear={() =>
                setClearedChats((prev) => ({ ...prev, [active.id]: true }))
              }
              onDelete={() => deleteConversation(active.id)}
              onBlock={() => blockPartner(active)}
              muted={!!mutedChats[active.id]}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center text-center text-[rgb(var(--secondary-text))]">
              <div>
                <MessageCircle size={72} className="mx-auto mb-4" />
                <p className="text-xl font-bold">{t("chat.selectConversationPrompt")}</p>
              </div>
            </div>
          )}
        </section>
      </main>

      {showNew && (
        <div
          // bg-black/70: modal scrim intentionally stays outside the token system
          // regardless of theme (same rationale as the shared Dialog component).
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
        >
          <div className="w-full max-w-md rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))]">
            <div className="border-b border-[rgb(var(--border))] p-4">
              <h2 className="text-xl font-black">{t("chat.newChatButton")}</h2>
              <input
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                placeholder={t("chat.searchFriendsPlaceholder")}
                className="mt-3 w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-4 py-3 outline-none"
              />
            </div>
            <div className="max-h-96 overflow-y-auto p-2">
              {filteredFriends.map((friend) => (
                <button
                  key={friend.id}
                  onClick={() => startChat(friend)}
                  className="flex w-full items-center gap-3 rounded-lg p-3 text-left hover:bg-[rgb(var(--border)/0.4)]"
                >
                  <Avatar user={friend} />
                  <span className="font-bold">@{friend.username}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowNew(false)}
              className="w-full border-t border-[rgb(var(--border))] p-4 text-[rgb(var(--secondary-text))]"
            >
              {t("common.cancel")}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/* ==================== COMPONENTES AUXILIARES ==================== */

type ChatPanelProps = {
  conversation: Conversation;
  messages: Message[];
  myId: string;
  body: string;
  typing: boolean;
  reactions: Record<string, Reaction[]>;
  menuFor: string | null;
  emojiOpen: boolean;
  reactionFor: string | null;
  muted: boolean;
  compact?: boolean;
  onMenu: (id: string | null) => void;
  onEmoji: () => void;
  onReactionFor: (id: string | null) => void;
  onBody: (value: string) => void;
  onSend: () => void;
  onReact: (messageId: string, emoji: string) => void;
  onMute: () => void;
  onClear: () => void;
  onDelete: () => void;
  onBlock: () => void;
};

function ChatPanel(props: ChatPanelProps) {
  // ... (mantengo tu ChatPanel original completo)
  const t = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const previousCountRef = useRef(props.messages.length);
  const isAtBottomRef = useRef(true);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [newMessageCount, setNewMessageCount] = useState(0);

  const syncBottomState = useCallback(() => {
    const node = scrollRef.current;
    if (!node) return;
    const nextIsAtBottom =
      node.scrollHeight - node.scrollTop - node.clientHeight < 48;
    isAtBottomRef.current = nextIsAtBottom;
    setIsAtBottom(nextIsAtBottom);
    if (nextIsAtBottom) setNewMessageCount(0);
  }, []);

  const handleScroll = useCallback(() => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      syncBottomState();
    });
  }, [syncBottomState]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight, behavior });
    isAtBottomRef.current = true;
    setIsAtBottom(true);
    setNewMessageCount(0);
  }, []);

  useEffect(() => {
    const previousCount = previousCountRef.current;
    const nextCount = props.messages.length;
    const addedCount = Math.max(nextCount - previousCount, 0);
    previousCountRef.current = nextCount;

    if (addedCount === 0) return;

    const lastMessage = props.messages[nextCount - 1];
    if (isAtBottomRef.current || lastMessage?.senderId === props.myId) {
      requestAnimationFrame(() => scrollToBottom("smooth"));
      return;
    }
    setNewMessageCount((count) => count + addedCount);
  }, [props.messages, props.myId, scrollToBottom]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <>
      {!props.compact && (
        <header className="flex items-center gap-3 border-b border-[rgb(var(--border))] p-4">
          <Avatar user={props.conversation.partner} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-black">
              @{props.conversation.partner?.username}
            </p>
            <p
              className={
                props.conversation.partner?.online
                  ? "text-sm text-[rgb(var(--success-text))]"
                  : "text-sm text-[rgb(var(--secondary-text))]"
              }
            >
              {props.conversation.partner?.online ? t("chat.online") : t("site.offlineStatus")}
            </p>
          </div>
          <OptionsMenu {...props} />
        </header>
      )}

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="relative flex-1 overflow-y-auto bg-[rgb(var(--background))] p-4"
      >
        <MessageList
          messages={props.messages}
          myId={props.myId}
          reactions={props.reactions}
          reactionFor={props.reactionFor}
          onReactionFor={props.onReactionFor}
          onReact={props.onReact}
        />
        {props.typing && (
          <div className="w-fit animate-pulse rounded-2xl bg-[rgb(var(--card))] px-4 py-2 text-sm text-[rgb(var(--secondary-text))]">
            {t("chat.typingIndicator")}
          </div>
        )}
      </div>

      <footer className="relative border-t border-[rgb(var(--border))] p-3">
        {props.emojiOpen && (
          <EmojiPicker
            className="absolute bottom-16 left-3"
            onPick={(emoji) => props.onBody(`${props.body}${emoji}`)}
          />
        )}
        <div className="flex gap-2">
          <button
            onClick={props.onEmoji}
            aria-label={t("chat.openEmojiPickerAction")}
            className="rounded-lg border border-[rgb(var(--border))] px-3"
          >
            <Smile size={18} />
          </button>
          <input
            value={props.body}
            onChange={(e) => props.onBody(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && props.onSend()}
            placeholder={t("chat.messageInputPlaceholder")}
            className="min-w-0 flex-1 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2 outline-none focus:border-[rgb(var(--primary))]"
          />
          <button
            onClick={props.onSend}
            disabled={!props.body.trim()}
            aria-label={t("chat.sendAction")}
            className="rounded-lg bg-[rgb(var(--button))] px-4 text-[rgb(var(--button-text))] disabled:opacity-50"
          >
            <Send size={18} />
          </button>
        </div>
      </footer>
    </>
  );
}

const MessageList = memo(function MessageList({
  messages,
  myId,
  reactions,
  reactionFor,
  onReactionFor,
  onReact,
}: {
  messages: Message[];
  myId: string;
  reactions: Record<string, Reaction[]>;
  reactionFor: string | null;
  onReactionFor: (id: string | null) => void;
  onReact: (messageId: string, emoji: string) => void;
}) {
  return (
    <>
      {messages.map((message) => {
        const mine = message.senderId === myId;
        return (
          <div
            key={message.id}
            className={`group flex animate-[fadeIn_.16s_ease-out] ${mine ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`relative max-w-[78%] rounded-2xl px-4 py-2 ${mine ? "rounded-br-md bg-[rgb(var(--button))] text-[rgb(var(--button-text))]" : "rounded-bl-md bg-[rgb(var(--card))]"}`}
            >
              <p className="whitespace-pre-wrap wrap-break-word">{message.body}</p>
              {!!reactions[message.id]?.length && (
                <div className="mt-1 flex gap-1">
                  {reactions[message.id].map((reaction) => (
                    <span
                      key={`${reaction.userId}-${reaction.emoji}`}
                      className="rounded-full bg-black/10 px-1.5 text-xs"
                    >
                      {reaction.emoji}
                    </span>
                  ))}
                </div>
              )}
              <p className="mt-1 flex items-center justify-end gap-1 text-[11px] opacity-70">
                {new Date(message.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                {mine &&
                  (message.seenAt ? (
                    <CheckCheck size={13} className="text-[rgb(var(--success))]" />
                  ) : (
                    <CheckCheck size={13} />
                  ))}
              </p>
              <button
                onClick={() =>
                  onReactionFor(reactionFor === message.id ? null : message.id)
                }
                className="absolute -bottom-2 -left-2 hidden rounded-full bg-[rgb(var(--card))] p-1 shadow group-hover:block"
              >
                <Smile size={14} />
              </button>
              {reactionFor === message.id && (
                <EmojiPicker
                  className="absolute bottom-7 left-0"
                  onPick={(emoji) => onReact(message.id, emoji)}
                />
              )}
            </div>
          </div>
        );
      })}
    </>
  );
});

function OptionsMenu(props: ChatPanelProps) {
  const t = useTranslation();
  const open = props.menuFor === props.conversation.id;
  return (
    <div className="relative">
      <button
        onClick={() => props.onMenu(open ? null : props.conversation.id)}
        aria-label={t("chat.moreOptionsAction")}
        aria-expanded={open}
        className="rounded-lg p-2 hover:bg-[rgb(var(--border)/0.4)]"
      >
        <MoreVertical size={18} />
      </button>
      {open && (
        <div className="absolute right-0 top-10 z-20 w-48 overflow-hidden rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] shadow-xl">
          <button
            onClick={props.onMute}
            className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-[rgb(var(--border)/0.4)]"
          >
            <BellOff size={15} /> {props.muted ? t("chat.unmuteAction") : t("chat.muteAction")}
          </button>
          <Link
            href={`/u/${props.conversation.partner?.username}`}
            className="flex items-center gap-2 px-3 py-2 hover:bg-[rgb(var(--border)/0.4)]"
          >
            <ExternalLink size={15} /> {t("chat.viewProfileAction")}
          </Link>
          <button
            onClick={props.onBlock}
            className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-[rgb(var(--border)/0.4)]"
          >
            <Ban size={15} /> {t("chat.blockUserAction")}
          </button>
          <button
            onClick={props.onClear}
            className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-[rgb(var(--border)/0.4)]"
          >
            <X size={15} /> {t("chat.clearLocalAction")}
          </button>
          <button
            onClick={props.onDelete}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-[rgb(var(--error-text))] hover:bg-[rgb(var(--error)/0.15)]"
          >
            <Trash2 size={15} /> {t("common.delete")}
          </button>
        </div>
      )}
    </div>
  );
}

function EmojiPicker({
  onPick,
  className = "",
}: {
  onPick: (emoji: string) => void;
  className?: string;
}) {
  return (
    <div
      className={`z-30 grid w-52 grid-cols-6 gap-1 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-2 shadow-xl ${className}`}
    >
      {EMOJIS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => onPick(emoji)}
          className="rounded-md p-1.5 text-lg hover:bg-[rgb(var(--border)/0.4)]"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

function Avatar({ user }: { user?: UserLite | null }) {
  return (
    <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-[rgb(var(--border))]">
      {user?.avatarUrl ? (
        <Image src={user.avatarUrl} alt={user.username} width={44} height={44} />
      ) : (
        <span className="flex h-full items-center justify-center font-black">
          {user?.username?.[0]?.toUpperCase() ?? "?"}
        </span>
      )}
      {user?.online && (
        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border border-[rgb(var(--card))] bg-[rgb(var(--success))]" />
      )}
    </div>
  );
}
