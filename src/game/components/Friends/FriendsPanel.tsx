"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Draggable from "react-draggable";
import { Mail, Search, Users, X } from "lucide-react";

import styles from "./FriendsPanel.module.css";
import PersonRow from "./PersonRow";
import {
  Friend,
  FriendRequest,
  SearchResult,
  acceptFriendRequest,
  blockFriendship,
  getFriendRequests,
  getFriends,
  getSentRequests,
  rejectFriendRequest,
  removeFriendship,
  searchUsers,
  sendFriendRequest,
} from "../../network/friendships";
import { requestGameConfirm, showGameAlert } from "../../utils/dialog";
import { audioManager } from "../../audio/AudioManager";
import { useChat } from "../Chat/ChatProvider";

type TabType = "friends" | "requests" | "search";

type Props = {
  onClose: () => void;
};

export default function FriendsPanel({ onClose }: Props) {
  const { openChat, openProfile } = useChat();
  const nodeRef = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState<TabType>("friends");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [received, setReceived] = useState<FriendRequest[]>([]);
  const [sent, setSent] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

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
    void loadAll();
  }, []);

  // Búsqueda con debounce (mismo criterio que apps/web/app/(site)/friends/page.tsx).
  useEffect(() => {
    if (activeTab !== "search" || !search.trim()) {
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
  }, [search, activeTab]);

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
        title: "No se pudo aceptar",
        message: "Intenta de nuevo en unos segundos.",
        confirmLabel: "Entendido",
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
        title: "No se pudo rechazar",
        message: "Intenta de nuevo en unos segundos.",
        confirmLabel: "Entendido",
        tone: "danger",
      });
    }
  };

  const handleRemove = async (friendshipId: string, username: string) => {
    const confirmed = await requestGameConfirm({
      title: "Eliminar amigo",
      message: `¿Seguro que quieres eliminar a ${username} de tu lista de amigos?`,
      confirmLabel: "Eliminar",
      cancelLabel: "Cancelar",
      tone: "danger",
    });
    if (!confirmed) return;

    try {
      await removeFriendship(friendshipId);
      await loadAll();
    } catch {
      await showGameAlert({
        title: "No se pudo eliminar",
        message: "Intenta de nuevo en unos segundos.",
        confirmLabel: "Entendido",
        tone: "danger",
      });
    }
  };

  const handleBlock = async (friendshipId: string, username: string) => {
    const confirmed = await requestGameConfirm({
      title: "Bloquear usuario",
      message: `${username} ya no podrá enviarte solicitudes ni mensajes.`,
      confirmLabel: "Bloquear",
      cancelLabel: "Cancelar",
      tone: "danger",
    });
    if (!confirmed) return;

    try {
      await blockFriendship(friendshipId);
      await loadAll();
    } catch {
      await showGameAlert({
        title: "No se pudo bloquear",
        message: "Intenta de nuevo en unos segundos.",
        confirmLabel: "Entendido",
        tone: "danger",
      });
    }
  };

  const handleSendRequest = async (userId: string) => {
    try {
      await sendFriendRequest(userId);
      setSearchResults((current) =>
        current.map((entry) =>
          entry.id === userId
            ? { ...entry, friendship: { ...entry.friendship, status: "PENDING", direction: "OUTGOING" } }
            : entry,
        ),
      );
      audioManager.play("click");
    } catch {
      await showGameAlert({
        title: "No se pudo enviar la solicitud",
        message: "Intenta de nuevo en unos segundos.",
        confirmLabel: "Entendido",
        tone: "danger",
      });
    }
  };

  const searchActionFor = (result: SearchResult) => {
    if (result.friendship.status === "ACCEPTED") {
      return { label: "Ya son amigos", onClick: () => {}, tone: "ghost" as const, disabled: true };
    }
    if (result.friendship.status === "PENDING" && result.friendship.direction === "OUTGOING") {
      return { label: "Solicitud enviada", onClick: () => {}, tone: "ghost" as const, disabled: true };
    }
    if (result.friendship.status === "PENDING" && result.friendship.direction === "INCOMING") {
      return { label: "Te escribió", onClick: () => setActiveTab("requests"), tone: "primary" as const };
    }
    return { label: "Agregar", onClick: () => void handleSendRequest(result.id), tone: "primary" as const };
  };

  const requestsBadge = received.length;

  const content = useMemo(() => {
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
        return <div className={styles.empty}>Aún no tienes amigos agregados. Busca a alguien en "Buscar".</div>;
      }
      return friends.map((entry) => (
        <PersonRow
          key={entry.id}
          username={entry.friend.username}
          avatarUrl={entry.friend.avatarUrl}
          online={entry.online}
          subtitle={entry.friend.level ? `Nivel ${entry.friend.level}` : undefined}
          onClick={() => openProfile(entry.friend.username)}
          actions={[
            {
              label: "Mensaje",
              tone: "primary",
              onClick: () => openChat(entry.friend.id, entry.friend.username, entry.friend.avatarUrl),
            },
            { label: "Eliminar", tone: "ghost", onClick: () => void handleRemove(entry.id, entry.friend.username) },
            { label: "Bloquear", tone: "danger", onClick: () => void handleBlock(entry.id, entry.friend.username) },
          ]}
        />
      ));
    }

    if (activeTab === "requests") {
      return (
        <>
          <div className={styles.sectionLabel}>RECIBIDAS</div>
          {received.length === 0 && <div className={styles.empty}>No tienes solicitudes pendientes.</div>}
          {received.map((request) => (
            <PersonRow
              key={request.id}
              username={request.requester.username}
              avatarUrl={request.requester.avatarUrl}
              onClick={() => openProfile(request.requester.username)}
              actions={[
                { label: "Aceptar", tone: "primary", onClick: () => void handleAccept(request.id) },
                { label: "Rechazar", tone: "ghost", onClick: () => void handleReject(request.id) },
              ]}
            />
          ))}

          <div className={styles.sectionLabel}>ENVIADAS</div>
          {sent.length === 0 && <div className={styles.empty}>No has enviado solicitudes.</div>}
          {sent.map((request) => (
            <PersonRow
              key={request.id}
              username={request.addressee.username}
              avatarUrl={request.addressee.avatarUrl}
              subtitle="Pendiente"
              actions={[{ label: "Cancelar", tone: "ghost", onClick: () => void handleReject(request.id) }]}
            />
          ))}
        </>
      );
    }

    // search
    if (!search.trim()) {
      return <div className={styles.empty}>Escribe un nombre de usuario para buscar.</div>;
    }
    if (searching) {
      return (
        <>
          <div className={styles.skeleton} />
          <div className={styles.skeleton} />
        </>
      );
    }
    if (!searchResults.length) {
      return <div className={styles.empty}>No se encontraron usuarios.</div>;
    }
    return searchResults.map((result) => (
      <PersonRow
        key={result.id}
        username={result.username}
        avatarUrl={result.avatarUrl}
        online={result.online}
        subtitle={result.mutualCount > 0 ? `${result.mutualCount} amigos en común` : undefined}
        onClick={() => openProfile(result.username)}
        actions={[searchActionFor(result)]}
      />
    ));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, loading, friends, received, sent, search, searching, searchResults]);

  return (
    <Draggable nodeRef={nodeRef} handle={`.${styles.windowHeader}`}>
      <div ref={nodeRef} className={styles.window}>
        <div className={styles.windowHeader}>
          <span className={styles.title}>AMIGOS</span>
          <button className={styles.closeBtn} aria-label="Cerrar amigos" onClick={onClose}>
            <X size={14} />
          </button>
        </div>

        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === "friends" ? styles.active : ""}`}
            onClick={() => setActiveTab("friends")}
          >
            <Users size={14} /> Amigos
          </button>
          <button
            className={`${styles.tab} ${activeTab === "requests" ? styles.active : ""}`}
            onClick={() => setActiveTab("requests")}
          >
            <Mail size={14} /> Solicitudes
            {requestsBadge > 0 && <span className={styles.badge}>{requestsBadge}</span>}
          </button>
          <button
            className={`${styles.tab} ${activeTab === "search" ? styles.active : ""}`}
            onClick={() => setActiveTab("search")}
          >
            <Search size={14} /> Buscar
          </button>
        </div>

        {activeTab === "search" && (
          <div className={styles.searchBox}>
            <input
              placeholder="Buscar por nombre de usuario..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              autoFocus
            />
          </div>
        )}

        <div className={styles.list}>{content}</div>
      </div>
    </Draggable>
  );
}
