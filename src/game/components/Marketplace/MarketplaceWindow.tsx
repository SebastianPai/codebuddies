"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Socket } from "socket.io-client";
import ItemPreview from "../UI/ItemPreview";
import { getSharedAuthToken } from "../../network/auth";
import { requestGameConfirm, showGameAlert } from "../../utils/dialog";
import { useDialogBehavior } from "../shared/useDialogBehavior";
import Button from "../shared/Button";
import styles from "./MarketplaceWindow.module.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL || "http://localhost:3000";

type Tab = "marketplace" | "favorites" | "creator";

type MarketplaceItem = {
  id: string;
  title: string;
  description?: string;
  previewUrl?: string;
  spriteUrl?: string;
  priceCoins: number;
  ratingAverage: number;
  salesCount: number;
  favoritesCount: number;
  creator: {
    verified: boolean;
    user: { username: string; avatarUrl?: string };
  };
  publishedItem?: any;
};

type Eligibility = {
  canApply: boolean;
  isCreator: boolean;
  latestApplication?: { status: string; adminMessage?: string };
  checks: Array<{
    key: string;
    label: string;
    passed: boolean;
    current: number;
    required: number;
  }>;
};

type Dashboard = {
  stats: Record<string, number>;
  wallet?: {
    availableBalance: number;
    historicalTotal: number;
    totalSales: number;
    totalCommissions: number;
  };
  recentContents: Array<{
    id: string;
    title: string;
    status: string;
    priceCoins: number;
    previewUrl?: string;
  }>;
  comments: Array<{ id: string; message: string; content?: { title: string } }>;
};

type Props = {
  socket: Socket | null;
  onClose: () => void;
};

export default function MarketplaceWindow({ socket, onClose }: Props) {
  const windowRef = useRef<HTMLElement>(null);
  useDialogBehavior(windowRef, onClose);

  const [tab, setTab] = useState<Tab>("marketplace");
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [favoriteItems, setFavoriteItems] = useState<MarketplaceItem[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [eligibility, setEligibility] = useState<Eligibility | null>(null);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [applicationMessage, setApplicationMessage] = useState("");

  const token = useMemo(() => getSharedAuthToken(), []);

  const request = async <T,>(path: string, options: RequestInit = {}) => {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      credentials: "include",
      headers: {
        ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.message || "No se pudo completar la accion");
    }
    if (response.status === 204) return {} as T;
    return response.json() as Promise<T>;
  };

  const loadMarketplace = async () => {
    const query = search.trim() ? `?q=${encodeURIComponent(search.trim())}` : "";
    setItems(await request<MarketplaceItem[]>(`/marketplace${query}`));
  };

  const loadFavorites = async () => {
    const favorites = await request<MarketplaceItem[]>("/marketplace/me/favorites");
    setFavoriteItems(favorites);
    setFavoriteIds(new Set(favorites.map((item) => item.id)));
  };

  const loadCreator = async () => {
    const currentEligibility = await request<Eligibility>("/creator/marketplace/eligibility");
    setEligibility(currentEligibility);
    if (currentEligibility.isCreator) {
      setDashboard(await request<Dashboard>("/creator/marketplace/dashboard"));
    } else {
      setDashboard(null);
    }
  };

  const loadAll = async () => {
    setLoading(true);
    setError("");
    try {
      await Promise.all([loadMarketplace(), loadFavorites(), loadCreator()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error cargando Marketplace");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);

  const buy = async (item: MarketplaceItem) => {
    const confirmed = await requestGameConfirm({
      title: "Comprar contenido",
      message: `Quieres comprar ${item.title} por ${item.priceCoins} Coins?`,
      confirmLabel: "Comprar",
      cancelLabel: "Cancelar",
    });
    if (!confirmed) return;

    try {
      await request(`/marketplace/${item.id}/buy`, { method: "POST" });
      socket?.emit("inventory:get");
      await showGameAlert({
        title: "Compra realizada",
        message: "El objeto fue agregado a tu inventario.",
        confirmLabel: "Genial",
        tone: "success",
      });
      await loadMarketplace();
    } catch (err) {
      await showGameAlert({
        title: "No se pudo comprar",
        message: err instanceof Error ? err.message : "Intentalo de nuevo.",
        confirmLabel: "Entendido",
        tone: "danger",
      });
    }
  };

  const favorite = async (item: MarketplaceItem) => {
    const wasFavorite = favoriteIds.has(item.id);
    setFavoriteIds((current) => {
      const next = new Set(current);
      if (wasFavorite) next.delete(item.id);
      else next.add(item.id);
      return next;
    });
    setItems((current) =>
      current.map((entry) =>
        entry.id === item.id
          ? { ...entry, favoritesCount: Math.max(0, entry.favoritesCount + (wasFavorite ? -1 : 1)) }
          : entry,
      ),
    );
    setFavoriteItems((current) =>
      wasFavorite
        ? current.filter((entry) => entry.id !== item.id)
        : [{ ...item, favoritesCount: item.favoritesCount + 1 }, ...current],
    );
    try {
      await request(`/marketplace/${item.id}/favorite`, { method: "POST" });
    } catch {
      await Promise.all([loadMarketplace(), loadFavorites()]);
    }
  };

  const apply = async () => {
    await request("/creator/marketplace/apply", {
      method: "POST",
      body: JSON.stringify({ message: applicationMessage }),
    });
    await loadCreator();
  };

  const submit = async (id: string) => {
    await request(`/creator/marketplace/contents/${id}/submit`, { method: "POST" });
    await loadCreator();
  };

  const visibleItems = tab === "favorites" ? favoriteItems : items;

  return (
    <section
      ref={windowRef}
      className={styles.window}
      role="dialog"
      aria-modal="true"
      aria-label="Marketplace de creadores"
    >
      <header className={styles.header}>
        <div>
          <span>Creator Platform</span>
          <h2>Marketplace</h2>
        </div>
        <Button variant="secondary" size="sm" onClick={onClose} aria-label="Cerrar Marketplace">
          Cerrar
        </Button>
      </header>

      <nav className={styles.tabs} aria-label="Secciones de Marketplace">
        <button className={tab === "marketplace" ? styles.active : ""} onClick={() => setTab("marketplace")}>
          Comprar
        </button>
        <button className={tab === "favorites" ? styles.active : ""} onClick={() => setTab("favorites")}>
          Favoritos
        </button>
        <button className={tab === "creator" ? styles.active : ""} onClick={() => setTab("creator")}>
          Crear
        </button>
      </nav>

      {loading ? (
        <div className={styles.grid}>
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className={styles.skeleton} />
          ))}
        </div>
      ) : error ? (
        <div className={styles.empty}>
          <strong>No se pudo cargar</strong>
          <span>{error}</span>
          <button onClick={() => void loadAll()}>Reintentar</button>
        </div>
      ) : tab === "marketplace" || tab === "favorites" ? (
        <div className={styles.body}>
          {tab === "marketplace" && <div className={styles.toolbar}>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void loadMarketplace();
              }}
              placeholder="Buscar objetos de la comunidad..."
              aria-label="Buscar en Marketplace"
            />
            <button onClick={() => void loadMarketplace()}>Buscar</button>
          </div>}

          {visibleItems.length ? (
            <div className={styles.grid}>
              {visibleItems.map((item) => {
                const isFavorite = favoriteIds.has(item.id);
                return (
                <article key={item.id} className={styles.card}>
                  <div className={styles.preview}>
                    <ItemPreview
                      item={{
                        ...item.publishedItem,
                        imageUrl: item.previewUrl || item.spriteUrl,
                        type: item.publishedItem?.type || "WORLD",
                      }}
                      alt={item.title}
                    />
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.description || "Contenido de la comunidad."}</p>
                  <div className={styles.author}>
                    por <b>{item.creator.user.username}</b>
                    {item.creator.verified && <span>Verified</span>}
                  </div>
                  <div className={styles.metrics}>
                    <span>{item.ratingAverage.toFixed(1)} estrellas</span>
                    <span>{item.salesCount} ventas</span>
                    <span>{item.favoritesCount} favs</span>
                  </div>
                  <div className={styles.actions}>
                    <button
                      className={isFavorite ? styles.favoriteActive : ""}
                      onClick={() => void favorite(item)}
                    >
                      {isFavorite ? "♥ Quitar" : "♡ Favorito"}
                    </button>
                    <button className={styles.primary} onClick={() => void buy(item)}>
                      {item.priceCoins} Coins
                    </button>
                  </div>
                </article>
              );})}
            </div>
          ) : (
            <div className={styles.empty}>
              <strong>Marketplace vacío</strong>
              <span>Aun no hay objetos publicados por la comunidad.</span>
            </div>
          )}
        </div>
      ) : (
        <CreatorPanel
          eligibility={eligibility}
          dashboard={dashboard}
          applicationMessage={applicationMessage}
          setApplicationMessage={setApplicationMessage}
          onApply={apply}
          onSubmit={submit}
        />
      )}
    </section>
  );
}

function CreatorPanel({
  eligibility,
  dashboard,
  applicationMessage,
  setApplicationMessage,
  onApply,
  onSubmit,
}: {
  eligibility: Eligibility | null;
  dashboard: Dashboard | null;
  applicationMessage: string;
  setApplicationMessage: (value: string) => void;
  onApply: () => Promise<void>;
  onSubmit: (id: string) => Promise<void>;
}) {
  if (!eligibility) {
    return <div className={styles.empty}>Cargando informacion de creador...</div>;
  }

  if (!eligibility.isCreator) {
    return (
      <div className={styles.creatorLayout}>
        <div className={styles.panel}>
          <h3>Requisitos para ser Creador</h3>
          {eligibility.checks.map((check) => (
            <div key={check.key} className={styles.check}>
              <span>{check.label}</span>
              <b className={check.passed ? styles.ok : styles.bad}>
                {check.passed ? "Listo" : `${check.current}/${check.required}`}
              </b>
            </div>
          ))}
        </div>
        <div className={styles.panel}>
          <h3>Solicitud</h3>
          {eligibility.latestApplication ? (
            <div className={styles.empty}>
              <strong>Estado: {eligibility.latestApplication.status}</strong>
              <span>{eligibility.latestApplication.adminMessage || "El equipo revisara tu solicitud."}</span>
            </div>
          ) : (
            <>
              <textarea
                value={applicationMessage}
                onChange={(event) => setApplicationMessage(event.target.value)}
                placeholder="Cuenta que quieres crear para CodeBuddies..."
              />
              <button disabled={!eligibility.canApply} className={styles.primary} onClick={() => void onApply()}>
                Convertirme en Creador
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.creatorLayout}>
      <div className={styles.panel}>
        <h3>Creator Dashboard</h3>
        <div className={styles.statGrid}>
          <Stat label="Publicados" value={dashboard?.stats.published ?? 0} />
          <Stat label="Pendientes" value={dashboard?.stats.pending ?? 0} />
          <Stat label="Rechazados" value={dashboard?.stats.rejected ?? 0} />
          <Stat label="Wallet" value={dashboard?.wallet?.availableBalance ?? 0} />
        </div>
        <div className={styles.chart}>
          {["draft", "pending", "published", "rejected"].map((key) => (
            <span
              key={key}
              style={{ height: `${Math.max(12, Math.min(100, (dashboard?.stats[key] ?? 0) * 18))}%` }}
              title={key}
            />
          ))}
        </div>
      </div>

      <div className={styles.panel}>
        <h3>Crear con el editor profesional</h3>
        <p className={styles.helpText}>
          Para evitar editores duplicados, la creacion y edicion se hacen en Creator Studio con el mismo ItemEditor que usa el admin.
        </p>
        <button className={styles.primary} onClick={() => window.open(`${WEB_URL}/creator/marketplace/create`, "_blank", "noopener,noreferrer")}>
          Abrir Creator Studio
        </button>
      </div>

      <div className={`${styles.panel} ${styles.full}`}>
        <h3>Mis publicaciones</h3>
        {dashboard?.recentContents?.length ? (
          <div className={styles.table}>
            {dashboard.recentContents.map((content) => (
              <div key={content.id} className={styles.row}>
                <span>{content.title}</span>
                <b>{content.status}</b>
                <em>{content.priceCoins} Coins</em>
                {["DRAFT", "CHANGES_REQUESTED"].includes(content.status) && (
                  <>
                    <button onClick={() => window.open(`${WEB_URL}/creator/marketplace/${content.id}/edit`, "_blank", "noopener,noreferrer")}>
                      Editar
                    </button>
                    <button onClick={() => void onSubmit(content.id)}>Enviar</button>
                  </>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.empty}>Todavia no tienes objetos creados.</div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className={styles.stat}>
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}
