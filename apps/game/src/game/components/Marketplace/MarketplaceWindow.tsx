"use client";

import { useEffect, useMemo, useState } from "react";
import { Socket } from "socket.io-client";
import { Heart } from "lucide-react";
import { getSharedAuthToken } from "../../network/auth";
import { requestGameConfirm, showGameAlert } from "../../utils/dialog";
import { audioManager } from "../../audio/AudioManager";
import Modal from "../shared/Modal";
import Button from "../shared/Button";
import ItemGrid from "../shared/ItemGrid";
import ItemCard from "../shared/ItemCard";
import UserBadges from "../shared/UserBadges";
import styles from "./MarketplaceWindow.module.css";
import { useTranslation } from "../../../i18n/useTranslation";
import { getApiUrl, getWebUrl } from "../../../config/env";
import tabsOverflow from "../shared/tabsOverflow.module.css";

const API_URL = getApiUrl();
const WEB_URL = getWebUrl();

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
  const t = useTranslation();
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
  // Antes no había ningún guard: un doble clic en "Comprar" (común con lag)
  // disparaba dos POST /marketplace/:id/buy concurrentes. A diferencia de
  // Shop.tsx (que compra por WebSocket fire-and-forget y necesita un timeout
  // de seguridad por si el servidor nunca responde), acá alcanza con el
  // propio await de la petición HTTP para saber cuándo volver a habilitar.
  const [buyingId, setBuyingId] = useState<string | null>(null);

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
      throw new Error(payload.message || t("common.genericError"));
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
      setError(err instanceof Error ? err.message : t("commerce.marketplaceLoadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);

  const buy = async (item: MarketplaceItem) => {
    if (buyingId) return;

    const confirmed = await requestGameConfirm({
      title: t("commerce.marketplaceBuyTitle"),
      message: t("commerce.marketplaceBuyMessage", { title: item.title, price: item.priceCoins }),
      confirmLabel: t("commerce.shopBuy"),
      cancelLabel: t("common.cancel"),
    });
    if (!confirmed) return;

    setBuyingId(item.id);
    try {
      await request(`/marketplace/${item.id}/buy`, { method: "POST" });
      socket?.emit("inventory:get");
      // Antes comprar acá era silencioso (a diferencia de Shop.tsx, que sí
      // reproduce "coin" al comprar) — mismo tipo de compra, distinta
      // sensación.
      audioManager.play("coin");
      window.dispatchEvent(new CustomEvent("fx:sparkle"));
      await showGameAlert({
        title: t("commerce.marketplacePurchaseSuccessTitle"),
        message: t("commerce.marketplacePurchaseSuccessMessage"),
        confirmLabel: t("commerce.marketplaceGreatLabel"),
        tone: "success",
      });
      await loadMarketplace();
    } catch (err) {
      await showGameAlert({
        title: t("commerce.marketplacePurchaseFailTitle"),
        message: err instanceof Error ? err.message : t("commerce.marketplaceRetryMessage"),
        confirmLabel: t("common.understood"),
        tone: "danger",
      });
    } finally {
      setBuyingId(null);
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
    <Modal
      variant="floating"
      title={t("commerce.marketplaceTitle")}
      onClose={onClose}
      style={{ width: "min(960px, calc(100vw - 24px))", height: "min(760px, calc(100dvh - 24px))" }}
    >
      <div className={`${styles.tabs} ${tabsOverflow.scrollRow}`}>
        <button className={tab === "marketplace" ? styles.active : ""} onClick={() => setTab("marketplace")}>
          {t("commerce.marketplaceTabBuy")}
        </button>
        <button className={tab === "favorites" ? styles.active : ""} onClick={() => setTab("favorites")}>
          {t("commerce.marketplaceTabFavorites")}
        </button>
        <button className={tab === "creator" ? styles.active : ""} onClick={() => setTab("creator")}>
          {t("commerce.marketplaceTabCreate")}
        </button>
      </div>

      {loading ? (
        <div className={styles.skeletonGrid}>
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className={styles.skeleton} />
          ))}
        </div>
      ) : error ? (
        <div className={styles.empty}>
          <strong>{t("commerce.marketplaceLoadFailedTitle")}</strong>
          <span>{error}</span>
          <button onClick={() => void loadAll()}>{t("common.retry")}</button>
        </div>
      ) : tab === "marketplace" || tab === "favorites" ? (
        <div className={styles.body}>
          {tab === "marketplace" && (
            <div className={styles.toolbar}>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void loadMarketplace();
                }}
                placeholder={t("commerce.marketplaceSearchPlaceholder")}
                aria-label={t("commerce.marketplaceSearchAriaLabel")}
              />
              <button onClick={() => void loadMarketplace()}>{t("common.search")}</button>
            </div>
          )}

          <ItemGrid
            isEmpty={visibleItems.length === 0}
            empty={
              <>
                <strong>{t("commerce.marketplaceEmptyTitle")}</strong>
                <span>{t("commerce.marketplaceEmptyMessage")}</span>
              </>
            }
          >
            {visibleItems.map((item) => {
              const isFavorite = favoriteIds.has(item.id);
              return (
                <ItemCard
                  key={item.id}
                  item={{
                    ...item.publishedItem,
                    imageUrl: item.previewUrl || item.spriteUrl,
                    type: item.publishedItem?.type || "WORLD",
                  }}
                  title={item.title}
                  footer={
                    <div className={styles.cardFooter}>
                      <p className={styles.description}>{item.description || t("commerce.marketplaceDescriptionFallback")}</p>
                      <div className={styles.author}>
                        {t("commerce.marketplaceByAuthor")} <b>{item.creator.user.username}</b>
                        <UserBadges verified={item.creator.verified} isCreator size={12} />
                      </div>
                      <div className={styles.metrics}>
                        <span>{t("commerce.marketplaceRatingLabel", { rating: item.ratingAverage.toFixed(1) })}</span>
                        <span>{t("commerce.marketplaceSalesLabel", { count: item.salesCount })}</span>
                        <span>{t("commerce.marketplaceFavsLabel", { count: item.favoritesCount })}</span>
                      </div>
                      <div className={styles.actions}>
                        <Button
                          variant={isFavorite ? "danger" : "secondary"}
                          size="sm"
                          onClick={() => void favorite(item)}
                        >
                          <Heart size={13} fill={isFavorite ? "currentColor" : "none"} />
                          {isFavorite ? t("commerce.marketplaceRemoveFavorite") : t("commerce.marketplaceAddFavorite")}
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          disabled={buyingId === item.id}
                          onClick={() => void buy(item)}
                        >
                          {buyingId === item.id ? (
                            t("commerce.shopBuying")
                          ) : (
                            <span className="cb-fx-text-goldRank">
                              {t("commerce.marketplacePriceCoins", { price: item.priceCoins })}
                            </span>
                          )}
                        </Button>
                      </div>
                    </div>
                  }
                />
              );
            })}
          </ItemGrid>
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
    </Modal>
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
  const t = useTranslation();

  if (!eligibility) {
    return <div className={styles.empty}>{t("commerce.marketplaceCreatorLoading")}</div>;
  }

  if (!eligibility.isCreator) {
    return (
      <div className={styles.creatorLayout}>
        <div className={styles.panel}>
          <h3>{t("commerce.marketplaceCreatorRequirementsTitle")}</h3>
          {eligibility.checks.map((check) => (
            <div key={check.key} className={styles.check}>
              <span>{check.label}</span>
              <b className={check.passed ? styles.ok : styles.bad}>
                {check.passed ? t("commerce.marketplaceCreatorCheckReady") : `${check.current}/${check.required}`}
              </b>
            </div>
          ))}
        </div>
        <div className={styles.panel}>
          <h3>{t("commerce.marketplaceApplicationTitle")}</h3>
          {eligibility.latestApplication ? (
            <div className={styles.empty}>
              <strong>{t("commerce.marketplaceApplicationStatus", { status: eligibility.latestApplication.status })}</strong>
              <span>{eligibility.latestApplication.adminMessage || t("commerce.marketplaceApplicationPendingMessage")}</span>
            </div>
          ) : (
            <>
              <textarea
                value={applicationMessage}
                onChange={(event) => setApplicationMessage(event.target.value)}
                placeholder={t("commerce.marketplaceApplicationPlaceholder")}
              />
              <button disabled={!eligibility.canApply} className={styles.primary} onClick={() => void onApply()}>
                {t("commerce.marketplaceBecomeCreatorButton")}
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
        <h3>{t("commerce.marketplaceCreatorDashboardTitle")}</h3>
        <div className={styles.statGrid}>
          <Stat label={t("commerce.marketplaceStatPublished")} value={dashboard?.stats.published ?? 0} />
          <Stat label={t("commerce.marketplaceStatPending")} value={dashboard?.stats.pending ?? 0} />
          <Stat label={t("commerce.marketplaceStatRejected")} value={dashboard?.stats.rejected ?? 0} />
          <Stat label={t("commerce.marketplaceStatWallet")} value={dashboard?.wallet?.availableBalance ?? 0} />
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
        <h3>{t("commerce.marketplaceCreateWithEditorTitle")}</h3>
        <p className={styles.helpText}>
          {t("commerce.marketplaceCreateWithEditorHelp")}
        </p>
        <button className={styles.primary} onClick={() => window.open(`${WEB_URL}/creator/marketplace/create`, "_blank", "noopener,noreferrer")}>
          {t("commerce.marketplaceOpenCreatorStudio")}
        </button>
      </div>

      <div className={`${styles.panel} ${styles.full}`}>
        <h3>{t("commerce.marketplaceMyPublicationsTitle")}</h3>
        {dashboard?.recentContents?.length ? (
          <div className={styles.table}>
            {dashboard.recentContents.map((content) => (
              <div key={content.id} className={styles.row}>
                <span>{content.title}</span>
                <b>{content.status}</b>
                <em className="cb-fx-text-goldRank">
                  {t("commerce.marketplacePriceCoins", { price: content.priceCoins })}
                </em>
                {["DRAFT", "CHANGES_REQUESTED"].includes(content.status) && (
                  <>
                    <button onClick={() => window.open(`${WEB_URL}/creator/marketplace/${content.id}/edit`, "_blank", "noopener,noreferrer")}>
                      {t("common.edit")}
                    </button>
                    <button onClick={() => void onSubmit(content.id)}>{t("common.send")}</button>
                  </>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.empty}>{t("commerce.marketplaceNoContentYet")}</div>
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
