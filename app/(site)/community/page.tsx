"use client";

import { useEffect, useState } from "react";
import { api } from "../../../utils/api";
import { useTranslation } from "../../../src/i18n/useTranslation";

type FeedItem = {
  id: string;
  type: string;
  title: string;
  createdAt: string;
  user: { username: string; avatarUrl: string | null };
};

export default function CommunityPage() {
  const t = useTranslation();
  const [feed, setFeed] = useState<FeedItem[]>([]);

  useEffect(() => {
    api.get<FeedItem[]>("/community/feed").then(setFeed).catch(() => setFeed([]));
  }, []);

  return (
    <div className="py-12">
      <h1 className="text-5xl font-black">{t("site.community")}</h1>
      <p className="mt-3 text-[rgb(var(--secondary-text))]">
        {t("site.communityDescription")}
      </p>
      <div className="mt-8 space-y-4">
        {feed.map((item) => (
          <article key={`${item.type}-${item.id}`} className="rounded-lg border border-[rgb(var(--border))] p-5">
            <p className="text-xs font-bold uppercase text-[rgb(var(--primary))]">{item.type}</p>
            <h2 className="mt-1 text-xl font-black">{item.title}</h2>
            <p className="mt-2 text-sm text-[rgb(var(--secondary-text))]">
              {item.user.username} - {new Date(item.createdAt).toLocaleString()}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
