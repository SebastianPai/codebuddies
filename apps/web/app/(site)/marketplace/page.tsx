"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { api } from "../../../utils/api";
import CachedImage from "../../../components/shared/CachedImage";
import { useTranslation } from "../../../src/i18n/useTranslation";
import { Button, EmptyState, ErrorState, Skeleton } from "../../../src/shared/ui";
import { useTrackToolUsed, trackToolAction } from "../../../components/analytics/tool-tracking";

type SortKey = "newest" | "favorites" | "sales" | "rating" | "popular";
type TabKey = "all" | "favorites" | "mostFavorites" | SortKey;

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
};

const tabs: Array<{ key: TabKey; labelKey: string; sort?: SortKey }> = [
  { key: "all", labelKey: "site.marketplaceTabAll", sort: "popular" },
  { key: "favorites", labelKey: "site.marketplaceTabFavorites" },
  { key: "mostFavorites", labelKey: "site.marketplaceTabMostFavorites", sort: "favorites" },
  { key: "sales", labelKey: "site.marketplaceTabSales", sort: "sales" },
  { key: "rating", labelKey: "site.marketplaceTabRating", sort: "rating" },
  { key: "newest", labelKey: "site.marketplaceTabNewest", sort: "newest" },
];

export default function MarketplacePage() {
  const t = useTranslation();
  useTrackToolUsed("marketplace", "marketplace");
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const activeSort = useMemo(
    () => tabs.find((tab) => tab.key === activeTab)?.sort ?? "popular",
    [activeTab],
  );

  const loadFavorites = async () => {
    try {
      const favorites = await api.get<MarketplaceItem[]>("/marketplace/me/favorites");
      setFavoriteIds(new Set(favorites.map((item) => item.id)));
      if (activeTab === "favorites") setItems(favorites);
    } catch {
      if (activeTab === "favorites") setItems([]);
    }
  };

  const load = async (tab = activeTab) => {
    setLoading(true);
    setError("");
    const selected = tabs.find((item) => item.key === tab);
    const params = new URLSearchParams();
    if (search.trim()) params.set("q", search.trim());
    if (selected?.sort) params.set("sort", selected.sort);

    try {
      if (tab === "favorites") {
        const favorites = await api.get<MarketplaceItem[]>("/marketplace/me/favorites");
        setItems(favorites);
        setFavoriteIds(new Set(favorites.map((item) => item.id)));
      } else {
        setItems(await api.get<MarketplaceItem[]>(`/marketplace?${params.toString()}`));
        void loadFavorites();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("site.marketplaceLoadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const selectTab = (tab: TabKey) => {
    setActiveTab(tab);
    void load(tab);
  };

  const toggleFavorite = async (item: MarketplaceItem) => {
    const wasFavorite = favoriteIds.has(item.id);
    setFavoriteIds((current) => {
      const next = new Set(current);
      if (wasFavorite) next.delete(item.id);
      else next.add(item.id);
      return next;
    });
    setItems((current) =>
      current
        .map((entry) =>
          entry.id === item.id
            ? { ...entry, favoritesCount: Math.max(0, entry.favoritesCount + (wasFavorite ? -1 : 1)) }
            : entry,
        )
        .filter((entry) => activeTab !== "favorites" || entry.id !== item.id || !wasFavorite),
    );
    try {
      await api.post(`/marketplace/${item.id}/favorite`);
      // La compra real (POST /marketplace/:id/buy) vive en apps/game, que
      // no tiene GTM instalado -- acá en apps/web la única acción real
      // confirmada por el backend es esta.
      trackToolAction("marketplace", "marketplace", "favorite");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("site.favoritesUpdateError"));
      void load();
    }
  };

  return (
    <main className="min-h-screen bg-[rgb(var(--background))] px-6 py-10 text-[rgb(var(--text))]">
      <section className="mx-auto max-w-7xl space-y-8">
        <div className="overflow-hidden rounded-[32px] border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-8 shadow-2xl">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[rgb(var(--primary))]">
            {t("site.creativeCommunityLabel")}
          </p>
          <div className="mt-3 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-4xl font-black tracking-tight md:text-6xl">Marketplace</h1>
              <p className="mt-3 max-w-2xl text-[rgb(var(--secondary-text))]">
                {t("site.marketplaceDescription")}
              </p>
            </div>
            <Link href="/creator/marketplace" className="rounded-2xl bg-[rgb(var(--button))] px-5 py-3 text-center font-black text-[rgb(var(--button-text))] transition hover:brightness-110">
              {t("site.wantToBeCreator")}
            </Link>
          </div>
        </div>

        <div className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4">
          <div className="flex flex-col gap-3 md:flex-row">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void load();
              }}
              placeholder={t("site.searchItemPlaceholder")}
              className="flex-1 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-4 py-3 text-[rgb(var(--text))] outline-none focus:border-[rgb(var(--primary))]"
            />
            <button onClick={() => void load()} className="rounded-2xl bg-[rgb(var(--button))] px-5 py-3 font-black text-[rgb(var(--button-text))]">
              {t("site.searchButton")}
            </button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={`${tab.key}:${tab.labelKey}`}
                onClick={() => selectTab(tab.key)}
                className={`rounded-full border px-4 py-2 text-sm font-black transition ${
                  activeTab === tab.key && activeSort === (tab.sort ?? activeSort)
                    ? "border-[rgb(var(--button))] bg-[rgb(var(--button))] text-[rgb(var(--button-text))]"
                    : "border-[rgb(var(--border))] bg-[rgb(var(--background))] text-[rgb(var(--secondary-text))] hover:border-[rgb(var(--primary))]"
                }`}
              >
                {t(tab.labelKey)}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="space-y-3">
            <ErrorState message={error} />
            <Button variant="primary" onClick={() => void load()}>
              {t("common.refresh")}
            </Button>
          </div>
        )}

        {loading ? (
          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-72" />
            ))}
          </div>
        ) : error && !items.length ? null : items.length ? (
          <div className="grid gap-5 md:grid-cols-3 xl:grid-cols-4">
            {items.map((item) => {
              const isFavorite = favoriteIds.has(item.id);

              return (
                <article key={item.id} className="group overflow-hidden rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] transition hover:-translate-y-1 hover:border-[rgb(var(--primary)/0.6)]">
                  <div className="relative grid h-44 place-items-center bg-gradient-to-br from-zinc-900 to-black">
                    <button
                      onClick={() => void toggleFavorite(item)}
                      aria-label={isFavorite ? t("site.removeFavoriteAria") : t("site.addFavoriteAria")}
                      aria-pressed={isFavorite}
                      className={`absolute right-3 top-3 rounded-full p-2 transition ${
                        isFavorite ? "bg-[rgb(var(--error))] text-black" : "bg-white/10 text-white hover:bg-white/20"
                      }`}
                    >
                      <Heart size={16} fill={isFavorite ? "currentColor" : "none"} />
                    </button>
                    {item.previewUrl || item.spriteUrl ? (
                      <CachedImage src={item.previewUrl || item.spriteUrl} alt={item.title} className="h-32 w-32 object-contain [image-rendering:pixelated]" />
                    ) : (
                      <div className="rounded-2xl border border-dashed border-zinc-700 px-4 py-3 text-sm text-zinc-400">
                        {t("site.noPreviewText")}
                      </div>
                    )}
                  </div>
                  <div className="space-y-3 p-5">
                    <div>
                      <h2 className="line-clamp-1 text-lg font-black">{item.title}</h2>
                      <p className="line-clamp-2 text-sm text-[rgb(var(--secondary-text))]">{item.description || t("site.communityItemFallback")}</p>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[rgb(var(--secondary-text))]">
                        {t("site.byCreatorPrefix")} <b className="text-[rgb(var(--text))]">{item.creator.user.username}</b>
                        {item.creator.verified ? " ✓" : ""}
                      </span>
                      <span className="rounded-full bg-[rgb(var(--button))] px-3 py-1 font-black text-[rgb(var(--button-text))]">
                        {item.priceCoins} Coins
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-[rgb(var(--secondary-text))]">
                      <span>{item.ratingAverage.toFixed(1)} {t("site.ratingUnit")}</span>
                      <span>{item.salesCount} {t("site.salesUnit")}</span>
                      <span>{item.favoritesCount} {t("site.favoritesUnit")}</span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState title={activeTab === "favorites" ? t("site.noFavoritesYet") : t("site.noPublishedItemsYet")} />
        )}
      </section>
    </main>
  );
}
