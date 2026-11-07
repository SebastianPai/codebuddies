"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Draggable from "react-draggable";
import { Mail, Search, Sparkles, Users, X } from "lucide-react";

import styles from "./FriendsPanel.module.css";
import PersonRow from "./PersonRow";
import {
  Friend,
  FriendRequest,
  SearchResult,
  acceptFriendRequest,
  blockUser,
  getFriendRequests,
  getFriends,
  getSentRequests,
  getSuggestions,
  rejectFriendRequest,
  removeFriendship,
  searchUsers,
  sendFriendRequest,
} from "../../network/friendships";
import { requestGameConfirm, showGameAlert } from "../../utils/dialog";
import { audioManager } from "../../audio/AudioManager";
import { useChat } from "../Chat/ChatProvider";
import { useDialogBehavior } from "../shared/useDialogBehavior";
import { useWindowChrome } from "../shared/useWindowChrome";
import { useTranslation } from "../../../i18n/useTranslation";
import chromeStyles from "../shared/windowChrome.module.css";
import tabsOverflow from "../shared/tabsOverflow.module.css";

type TabType = "friends" | "requests" | "suggestions";

type Props = {
  onClose: () => void;
};

export default function FriendsPanel({ onClose }: Props) {
  const t = useTranslation();
  const { openChat, openProfile } = useChat();
  const nodeRef = useRef<HTMLDivElement>(null);
  // Antes este panel no tenía cierre con Escape ni foco atrapado con Tab
  // (a diferencia de Modal/PCWindows, que sí lo usan) — un usuario de
  // teclado podía tabular hacia el canvas del juego detrás del panel.
  useDialogBehavior(nodeRef, onClose);
  const { isSheet, draggableProps } = useWindowChrome();

  const [activeTab, setActiveTab] = useState<TabType>("friends");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [received, setReceived] = useState<FriendRequest[]>([]);
  const [sent, setSent] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [friendsList, receivedList, sentList] = await Promise.all([
        getFriends(),
        getFriendRequests(),
        getSentRequests(),
      ]);
      setFriends(friendsList);
      setReceived(receivedList);
      setSent(sentList);
    } catch {
      // Silencioso: no bloquear el panel por un fallo de carga puntual.
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoadingSuggestions(true);
    void getSuggestions()
      .then(setSuggestions)
      .catch(() => setSuggestions([]))
      .finally(() => setLoadingSuggestions(false));
  }, []);

  useEffect(() => {
    void loadAll();
  }, []);

  // Búsqueda con debounce (mismo criterio que apps/web/app/(site)/friends/page.tsx).
  useEffect(() => {
    if (search.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const results = await searchUsers(search.trim());
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  // Tiempo real: nuevas solicitudes / aceptaciones / presencia.
  useEffect(() => {
    const handleRequest = () => void loadAll();
    const handleAccepted = () => {
      void loadAll();
      audioManager.play("notify");
    };
    const handlePresence = (event: Event) => {
      const detail = (event as CustomEvent<{ userId: string; online: boolean }>).detail;
      if (!detail) return;
      setFriends((current) =>
        current.map((entry) =>
          entry.friend.id === detail.userId ? { ...entry, online: detail.online } : entry,
        ),
      );
    };

    window.addEventListener("codebuddies:friendship:request", handleRequest);
    window.addEventListener("codebuddies:friendship:accepted", handleAccepted);
    window.addEventListener("codebuddies:presence:update", handlePresence);

    return () => {
      window.removeEventListener("codebuddies:friendship:request", handleRequest);
      window.removeEventListener("codebuddies:friendship:accepted", handleAccepted);
      window.removeEventListener("codebuddies:presence:update", handlePresence);
    };
  }, []);

  const handleAccept = async (requestId: string) => {
    try {
      await acceptFriendRequest(requestId);
      audioManager.play("notify");
      await loadAll();
    } catch {
      await showGameAlert({
        title: t("friends.acceptFailedTitle"),
        message: t("common.actionFailedMessage"),
        confirmLabel: t("common.understood"),
        tone: "danger",
      });
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      await rejectFriendRequest(requestId);
      await loadAll();
    } catch {
      await showGameAlert({
        title: t("friends.rejectFailedTitle"),
        message: t("common.actionFailedMessage"),
        confirmLabel: t("common.understood"),
        tone: "danger",
      });
    }
  };

  const handleRemove = async (friendshipId: string, username: string) => {
    const confirmed = await requestGameConfirm({
      title: t("quickmenu.friendActionAccepted"),
      message: t("friends.removeConfirmMessage", { username }),
      confirmLabel: t("common.delete"),
      cancelLabel: t("common.cancel"),
      tone: "danger",
    });
    if (!confirmed) return;

    try {
      await removeFriendship(friendshipId);
      await loadAll();
    } catch {
      await showGameAlert({
        title: t("friends.removeFailedTitle"),
        message: t("common.actionFailedMessage"),
        confirmLabel: t("common.understood"),
        tone: "danger",
      });
    }
  };

  // Se bloquea por usuario (POST /friendships/blocks): bloquear "la amistad"
  // solo funcionaba si el otro había mandado la solicitud.
  const handleBlock = async (userId: string, username: string) => {
    const confirmed = await requestGameConfirm({
      title: t("friends.blockConfirmTitle"),
      message: t("friends.blockConfirmMessage", { username }),
      confirmLabel: t("friends.blockConfirmButton"),
      cancelLabel: t("common.cancel"),
      tone: "danger",
    });
    if (!confirmed) return;

    try {
      await blockUser(userId);
      await loadAll();
    } catch {
      await showGameAlert({
        title: t("friends.blockFailedTitle"),
        message: t("common.actionFailedMessage"),
        confirmLabel: t("common.understood"),
        tone: "danger",
      });
    }
  };

  // Cancelar una solicitud enviada = borrarla (rechazar solo lo puede hacer quien la recibe).
  const handleCancel = async (friendshipId: string) => {
    try {
      await removeFriendship(friendshipId);
      await loadAll();
    } catch {
      await showGameAlert({
        title: t("friends.removeFailedTitle"),
        message: t("common.actionFailedMessage"),
        confirmLabel: t("common.understood"),
        tone: "danger",
      });
    }
  };

  const handleSendRequest = async (userId: string) => {
    try {
      await sendFriendRequest(userId);
      const markPending = (entry: SearchResult) =>
        entry.id === userId
          ? { ...entry, friendship: { ...entry.friendship, status: "PENDING" as const, direction: "OUTGOING" as const } }
          : entry;
      setSearchResults((current) => current.map(markPending));
      setSuggestions((current) => current.map(markPending));
      audioManager.play("click");
    } catch {
      await showGameAlert({
        title: t("friends.sendRequestFailedTitle"),
        message: t("common.actionFailedMessage"),
        confirmLabel: t("common.understood"),
        tone: "danger",
      });
    }
  };

  const searchActionFor = (result: SearchResult) => {
    // Defensivo: si algún endpoint (ej. sugerencias) no manda friendship,
    // se trata como "sin relación" en vez de romper el panel entero.
    if (!result.friendship) {
      return { label: t("common.add"), onClick: () => void handleSendRequest(result.id), tone: "primary" as const };
    }
    if (result.friendship.status === "ACCEPTED") {
      return { label: t("friends.alreadyFriends"), onClick: () => {}, tone: "ghost" as const, disabled: true };
    }
    if (result.friendship.status === "PENDING" && result.friendship.direction === "OUTGOING") {
      return {
        label: t("quickmenu.friendActionPendingOutgoing"),
        onClick: () => {},
        tone: "ghost" as const,
        disabled: true,
      };
    }
    if (result.friendship.status === "PENDING" && result.friendship.direction === "INCOMING") {
      return { label: t("friends.wroteToYou"), onClick: () => setActiveTab("requests"), tone: "primary" as const };
    }
    return { label: t("common.add"), onClick: () => void handleSendRequest(result.id), tone: "primary" as const };
  };

  const requestsBadge = received.length;
  // Los conectados primero.
  const sortedFriends = useMemo(
    () => [...friends].sort((a, b) => Number(Boolean(b.online)) - Number(Boolean(a.online)) || a.friend.username.localeCompare(b.friend.username)),
    [friends],
  );
  const onlineCount = friends.filter((f) => f.online).length;
  const searchingNow = search.trim().length >= 2;

  const content = useMemo(() => {
    // Con algo escrito en el buscador, se muestran los resultados (en cualquier pestaña).
    if (searchingNow) {
      if (searching) {
        return (
          <>
            <div className={styles.skeleton} />
            <div className={styles.skeleton} />
          </>
        );
      }
      if (!searchResults.length) return <div className={styles.empty}>{t("friends.noUsersFound")}</div>;
      return (
        <>
          <div className={styles.sectionLabel}>{t("friends.searchResultsLabel")}</div>
          {searchResults.map((result) => (
            <PersonRow
              key={result.id}
              username={result.username}
              avatarUrl={result.avatarUrl}
              nameEffectId={result.nameEffectId}
              online={result.online}
              subtitle={result.mutualCount > 0 ? t("friends.mutualFriendsCount", { count: result.mutualCount }) : undefined}
              onClick={() => openProfile(result.username)}
              actions={[searchActionFor(result)]}
            />
          ))}
        </>
      );
    }

    if (activeTab === "friends") {
      if (loading) {
        return (
          <>
            <div className={styles.skeleton} />
            <div className={styles.skeleton} />
          </>
        );
      }
      if (!friends.length) {
        return (
          <div className={styles.empty}>
            {t("friends.emptyFriends")}
            <div>
              <button className={styles.emptyCta} onClick={() => setActiveTab("suggestions")}>
                {t("friends.emptyFriendsCta")}
              </button>
            </div>
          </div>
        );
      }
      return sortedFriends.map((entry) => (
        <PersonRow
          key={entry.id}
          username={entry.friend.username}
          avatarUrl={entry.friend.avatarUrl}
          nameEffectId={entry.friend.nameEffectId}
          online={entry.online}
          subtitle={entry.friend.level ? t("friends.levelSubtitle", { level: entry.friend.level }) : undefined}
          onClick={() => openProfile(entry.friend.username)}
          actions={[
            {
              label: t("quickmenu.message"),
              tone: "primary",
              onClick: () =>
                openChat(entry.friend.id, entry.friend.username, entry.friend.avatarUrl, entry.friend.nameEffectId),
            },
          ]}
          menuLabel={t("friends.moreOptions")}
          menu={[
            { label: t("friends.viewProfile"), onClick: () => openProfile(entry.friend.username) },
            { label: t("common.delete"), onClick: () => void handleRemove(entry.id, entry.friend.username) },
            { label: t("friends.blockConfirmButton"), tone: "danger", onClick: () => void handleBlock(entry.friend.id, entry.friend.username) },
          ]}
        />
      ));
    }

    if (activeTab === "requests") {
      return (
        <>
          <div className={styles.sectionLabel}>{t("friends.receivedSection")}</div>
          {received.length === 0 && <div className={styles.empty}>{t("friends.emptyReceivedRequests")}</div>}
          {received.map((request) => (
            <PersonRow
              key={request.id}
              username={request.requester.username}
              avatarUrl={request.requester.avatarUrl}
              nameEffectId={request.requester.nameEffectId}
              onClick={() => openProfile(request.requester.username)}
              actions={[
                { label: t("common.accept"), tone: "primary", onClick: () => void handleAccept(request.id) },
                { label: t("friends.rejectAction"), tone: "ghost", onClick: () => void handleReject(request.id) },
              ]}
            />
          ))}

          <div className={styles.sectionLabel}>{t("friends.sentSection")}</div>
          {sent.length === 0 && <div className={styles.empty}>{t("friends.emptySentRequests")}</div>}
          {sent.map((request) => (
            <PersonRow
              key={request.id}
              username={request.addressee.username}
              avatarUrl={request.addressee.avatarUrl}
              nameEffectId={request.addressee.nameEffectId}
              subtitle={t("friends.pendingLabel")}
              actions={[{ label: t("common.cancel"), tone: "ghost", onClick: () => void handleCancel(request.id) }]}
            />
          ))}
        </>
      );
    }

    if (activeTab === "suggestions") {
      if (loadingSuggestions) {
        return (
          <>
            <div className={styles.skeleton} />
            <div className={styles.skeleton} />
          </>
        );
      }
      if (!suggestions.length) {
        return <div className={styles.empty}>{t("friends.emptySuggestions")}</div>;
      }
      return suggestions.map((result) => (
        <PersonRow
          key={result.id}
          username={result.username}
          avatarUrl={result.avatarUrl}
          nameEffectId={result.nameEffectId}
          online={result.online}
          subtitle={result.mutualCount > 0 ? t("friends.mutualFriendsCount", { count: result.mutualCount }) : undefined}
          onClick={() => openProfile(result.username)}
          actions={[searchActionFor(result)]}
        />
      ));
    }

    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, loading, friends, sortedFriends, received, sent, searchingNow, searching, searchResults, loadingSuggestions, suggestions]);

  const panel = (
    <div ref={nodeRef} className={`${styles.window} ${isSheet ? styles.sheet : ""}`}>
      <div className={styles.windowHeader}>
        <span className={styles.title}>
          {t("friends.title")}
          {onlineCount > 0 && <span className={styles.headerSub}>{t("friends.onlineCount", { count: onlineCount })}</span>}
        </span>
        <button
          className={`${styles.closeBtn} ${chromeStyles.closeHitArea}`}
          aria-label={t("friends.closeAriaLabel")}
          onClick={onClose}
        >
          <X size={14} />
        </button>
      </div>

        <div className={`${styles.tabs} ${tabsOverflow.scrollRow}`}>
          <button
            className={`${styles.tab} ${activeTab === "friends" ? styles.active : ""}`}
            onClick={() => setActiveTab("friends")}
          >
            <Users size={14} /> {t("friends.tabFriends")}
          </button>
          <button
            className={`${styles.tab} ${activeTab === "requests" ? styles.active : ""}`}
            onClick={() => setActiveTab("requests")}
          >
            <Mail size={14} /> {t("friends.tabRequests")}
            {requestsBadge > 0 && <span className={styles.badge}>{requestsBadge}</span>}
          </button>
          <button
            className={`${styles.tab} ${activeTab === "suggestions" ? styles.active : ""}`}
            onClick={() => setActiveTab("suggestions")}
          >
            <Sparkles size={14} /> {t("friends.tabSuggestions")}
          </button>
        </div>

      <div className={styles.searchTop}>
        <Search size={16} />
        <input
          placeholder={t("friends.searchInputPlaceholder")}
          aria-label={t("common.search")}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <div className={styles.list}>{content}</div>
    </div>
  );

  if (isSheet) return panel;

  return (
    <Draggable nodeRef={nodeRef} handle={`.${styles.windowHeader}`} cancel="button" {...draggableProps}>
      {panel}
    </Draggable>
  );
}
