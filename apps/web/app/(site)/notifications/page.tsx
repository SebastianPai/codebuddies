"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { RefreshCcw } from "lucide-react";
import { api } from "../../../utils/api";
import {
  GamificationEmpty,
  GamificationError,
  GamificationSkeleton,
} from "../../../components/gamification/GamificationState";
import { getNotificationIcon } from "../../../components/notifications/notificationIcons";
import { useGlobalNotifications } from "../../../components/notifications/GlobalNotificationsProvider";
import { useTranslation } from "../../../src/i18n/useTranslation";

type NotificationItem = {
  id: string;
  title: string;
  body: string | null;
  readAt: string | null;
  createdAt: string;
  category: string;
  priority: string;
  icon: string;
  link?: string | null;
  actionLabel?: string | null;
  relativeTime: string;
  read: boolean;
};

export default function NotificationsPage() {
  const t = useTranslation();
  const { resetUnread } = useGlobalNotifications();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<{ items: NotificationItem[]; unreadCount: number }>(
        "/notifications",
      );
      setItems(data.items);
      setUnreadCount(data.unreadCount);
      resetUnread();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("site.notificationsLoadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const categories = useMemo(
    () => Array.from(new Set(items.map((item) => item.category))).sort(),
    [items],
  );
  const filtered = category ? items.filter((item) => item.category === category) : items;

  const markAllRead = async () => {
    try {
      await api.patch("/notifications/read-all");
      await load();
    } catch {
      toast.error(t("common.unexpectedError"));
    }
  };

  const markRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      await load();
    } catch {
      toast.error(t("common.unexpectedError"));
    }
  };

  if (loading) return <GamificationSkeleton />;
  if (error) return <GamificationError message={error} onRetry={() => void load()} />;

  return (
    <div className="py-8 text-[rgb(var(--text))]">
      <section className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-4xl font-black">{t("site.notificationsTitle")}</h1>
            <p className="mt-2 text-sm text-[rgb(var(--secondary-text))]">
              {t("site.notificationsDescription")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => void load()}
              className="inline-flex items-center gap-2 rounded-md border border-[rgb(var(--border))] px-4 py-3 font-bold"
            >
              <RefreshCcw size={16} />
              {t("common.refresh")}
            </button>
            <button
              onClick={() => void markAllRead()}
              className="rounded-md bg-[rgb(var(--button))] px-4 py-3 font-bold text-[rgb(var(--button-text))]"
            >
              {t("site.markAllRead", { count: unreadCount })}
            </button>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <FilterButton active={!category} label={t("common.all")} onClick={() => setCategory("")} />
          {categories.map((item) => (
            <FilterButton
              key={item}
              active={category === item}
              label={item}
              onClick={() => setCategory(item)}
            />
          ))}
        </div>
      </section>

      <section className="mt-6 space-y-3">
        {filtered.length ? (
          filtered.map((item) => (
            <article
              key={item.id}
              className={`rounded-lg border p-4 ${
                item.read
                  ? "border-[rgb(var(--border))] bg-[rgb(var(--card))]"
                  : "border-[rgb(var(--button)/0.4)] bg-[rgb(var(--button)/0.1)]"
              }`}
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <button
                  type="button"
                  onClick={() => void markRead(item.id)}
                  className="flex min-w-0 flex-1 items-start gap-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--primary))]"
                  aria-label={t("site.markNotificationAsRead", { title: item.title })}
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[rgb(var(--button))] text-[rgb(var(--button-text))]">
                    {getNotificationIcon(item.icon)}
                  </span>
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-black">{item.title}</span>
                      <span className="rounded-md border border-[rgb(var(--border))] px-2 py-1 text-xs font-bold text-[rgb(var(--secondary-text))]">
                        {item.category}
                      </span>
                      <span className="rounded-md bg-[rgb(var(--button))] px-2 py-1 text-xs font-bold text-[rgb(var(--button-text))]">
                        {item.priority}
                      </span>
                    </span>
                    {item.body ? <span className="mt-1 block text-sm text-[rgb(var(--secondary-text))]">{item.body}</span> : null}
                    <span className="mt-2 block text-xs text-[rgb(var(--secondary-text))]">{item.relativeTime}</span>
                  </span>
                </button>
                {item.link ? (
                  <Link
                    href={item.link}
                    className="rounded-md border border-[rgb(var(--border))] px-3 py-2 text-sm font-bold hover:border-[rgb(var(--primary))] hover:text-[rgb(var(--primary))]"
                  >
                    {item.actionLabel ?? t("site.openAction")}
                  </Link>
                ) : null}
              </div>
            </article>
          ))
        ) : (
          <GamificationEmpty
            title={t("site.noNotificationsTitle")}
            description={t("site.noNotificationsDescription")}
          />
        )}
      </section>
    </div>
  );
}

function FilterButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-3 py-2 text-sm font-bold ${
        active
          ? "bg-[rgb(var(--button))] text-[rgb(var(--button-text))]"
          : "border border-[rgb(var(--border))] text-[rgb(var(--text))]"
      }`}
    >
      {label}
    </button>
  );
}
