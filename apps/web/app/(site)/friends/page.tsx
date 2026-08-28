"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Check, Search, ShieldBan, UserMinus, UserPlus, Users, X } from "lucide-react";
import { api } from "../../../utils/api";
import { useTranslation } from "../../../src/i18n/useTranslation";
import { Button, ErrorState, Skeleton } from "../../../src/shared/ui";
import { useTrackToolUsed, trackToolAction } from "../../../components/analytics/tool-tracking";

type UserLite = {
  id: string;
  username: string;
  avatarUrl: string | null;
  level?: number;
  experience?: number;
  online?: boolean;
};

type Friendship = {
  id: string;
  requesterId: string;
  addresseeId: string;
  requester: UserLite;
  addressee: UserLite;
  friend?: UserLite;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "BLOCKED";
};

type SearchUser = UserLite & {
  mutualCount: number;
  friendship?: { id?: string; status: string; direction?: "OUTGOING" | "INCOMING" };
};

export default function FriendsPage() {
  const t = useTranslation();
  useTrackToolUsed("friends", "social");
  const [tab, setTab] = useState<"friends" | "received" | "sent" | "search">("friends");
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [received, setReceived] = useState<Friendship[]>([]);
  const [sent, setSent] = useState<Friendship[]>([]);
  const [suggestions, setSuggestions] = useState<SearchUser[]>([]);
  const [results, setResults] = useState<SearchUser[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [friendsData, receivedData, sentData, suggestionData] = await Promise.all([
        api.get<Friendship[]>("/friendships"),
        api.get<Friendship[]>("/friendships/requests"),
        api.get<Friendship[]>("/friendships/sent"),
        api.get<SearchUser[]>("/friendships/suggestions"),
      ]);
      setFriends(friendsData);
      setReceived(receivedData);
      setSent(sentData);
      setSuggestions(suggestionData);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const refresh = () => void load();
    window.addEventListener("codebuddies:friendship:request", refresh);
    window.addEventListener("codebuddies:friendship:accepted", refresh);
    window.addEventListener("codebuddies:presence:update", refresh);
    return () => {
      window.removeEventListener("codebuddies:friendship:request", refresh);
      window.removeEventListener("codebuddies:friendship:accepted", refresh);
      window.removeEventListener("codebuddies:presence:update", refresh);
    };
  }, [load]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (tab !== "search" || query.trim().length < 2) {
        setResults([]);
        return;
      }
      try {
        setResults(await api.get<SearchUser[]>(`/friendships/search?q=${encodeURIComponent(query.trim())}`));
      } catch {
        setResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, tab]);

  async function act(id: string, action: "accept" | "reject" | "remove" | "block") {
    setBusyId(id);
    try {
      if (action === "remove") await api.delete(`/friendships/${id}`);
      else await api.patch(`/friendships/${id}/${action}`);
      if (action === "accept") trackToolAction("friends", "social", "accept_request");
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function add(userId: string) {
    setBusyId(userId);
    try {
      await api.post("/friendships/requests", { userId });
      trackToolAction("friends", "social", "send_request");
      await load();
      if (query) {
        setResults(await api.get<SearchUser[]>(`/friendships/search?q=${encodeURIComponent(query.trim())}`));
      }
    } finally {
      setBusyId(null);
    }
  }

  const visible = tab === "friends" ? friends : tab === "received" ? received : sent;
  const people = query.trim().length >= 2 ? results : suggestions;

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-4xl font-black">
            <Users className="h-9 w-9 text-[rgb(var(--primary))]" />
            {t("site.friendsTitle")}
          </h1>
          <p className="mt-2 text-[rgb(var(--secondary-text))]">{t("site.friendsDescription")}</p>
        </div>
        <Link
          href="/friends/challenges"
          className="rounded-lg border border-[rgb(var(--primary))] px-4 py-2 text-sm font-bold text-[rgb(var(--primary))] transition hover:bg-[rgb(var(--primary))] hover:text-black"
        >
          {t("site.challengesTitle")}
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap gap-2 border-b border-[rgb(var(--border))]">
        {[
          ["friends", t("site.friendsTitle"), friends.length],
          ["received", t("site.tabRequests"), received.length],
          ["sent", t("site.tabSent"), sent.length],
          ["search", t("site.tabFind"), suggestions.length],
        ].map(([id, label, count]) => (
          <button
            key={id}
            onClick={() => setTab(id as typeof tab)}
            className={`px-4 py-3 text-sm font-bold ${tab === id ? "border-b-2 border-[rgb(var(--primary))] text-[rgb(var(--primary))]" : "text-[rgb(var(--secondary-text))]"}`}
          >
            {label} <span className="text-xs opacity-70">{count}</span>
          </button>
        ))}
      </div>

      {tab === "search" ? (
        <section>
          <div className="relative mb-5">
            <Search className="absolute left-4 top-3.5 h-5 w-5 text-[rgb(var(--secondary-text))]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("site.searchUsernamePlaceholder")}
              className="w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] py-3 pl-12 pr-4 outline-none focus:border-[rgb(var(--primary))]"
            />
          </div>
          <div className="space-y-3">
            {people.map((user) => (
              <PersonRow key={user.id} user={user}>
                <FriendButton user={user} busy={busyId === user.id || busyId === user.friendship?.id} onAdd={add} onAct={act} />
              </PersonRow>
            ))}
            {!people.length && <Empty text={query ? t("site.noUsersFound") : t("site.noSuggestionsYet")} />}
          </div>
        </section>
      ) : loadError ? (
        <div className="space-y-4">
          <ErrorState message={t("common.unexpectedError")} />
          <Button variant="primary" onClick={() => void load()}>
            {t("common.refresh")}
          </Button>
        </div>
      ) : loading ? (
        <div className="space-y-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : (
        <section className="space-y-3">
          {visible.map((friendship) => {
            const user = friendship.friend ?? (tab === "sent" ? friendship.addressee : friendship.requester);
            return (
              <PersonRow key={friendship.id} user={user}>
                {tab === "received" && (
                  <>
                    <IconButton label={t("site.acceptAction")} busy={busyId === friendship.id} onClick={() => act(friendship.id, "accept")} icon={<Check />} />
                    <IconButton label={t("site.rejectAction")} busy={busyId === friendship.id} onClick={() => act(friendship.id, "reject")} icon={<X />} />
                  </>
                )}
                {tab === "sent" && <span className="text-sm font-semibold text-[rgb(var(--warning-text))]">{t("site.requestSentLabel")}</span>}
                {tab === "friends" && (
                  <>
                    <IconButton label={t("site.blockAction")} busy={busyId === friendship.id} onClick={() => act(friendship.id, "block")} icon={<ShieldBan />} />
                    <IconButton label={t("site.removeAction")} busy={busyId === friendship.id} onClick={() => act(friendship.id, "remove")} icon={<UserMinus />} />
                  </>
                )}
              </PersonRow>
            );
          })}
          {!visible.length && <Empty text={t("site.nothingHereYet")} />}
        </section>
      )}
    </main>
  );
}

function PersonRow({ user, children }: { user: SearchUser | UserLite; children: React.ReactNode }) {
  const t = useTranslation();
  return (
    <div className="flex items-center gap-4 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4">
      <Link href={`/u/${user.username}`} className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-[rgb(var(--border))]">
        {user.avatarUrl ? <Image src={user.avatarUrl} alt={user.username} width={48} height={48} /> : <span className="flex h-full items-center justify-center text-xl font-black">{user.username[0]?.toUpperCase()}</span>}
        {user.online && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border border-[rgb(var(--card))] bg-[rgb(var(--success))]" />}
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={`/u/${user.username}`} className="font-bold hover:text-[rgb(var(--primary))]">@{user.username}</Link>
        <p className="truncate text-sm text-[rgb(var(--secondary-text))]">
          {"mutualCount" in user
            ? t("site.mutualFriendsCount", { count: user.mutualCount })
            : user.online
              ? t("chat.online")
              : t("site.offlineStatus")}
        </p>
      </div>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

function FriendButton({ user, busy, onAdd, onAct }: { user: SearchUser; busy: boolean; onAdd: (id: string) => void; onAct: (id: string, action: "accept" | "reject" | "remove" | "block") => void }) {
  const t = useTranslation();
  const state = user.friendship?.status ?? "NONE";
  if (state === "ACCEPTED") return <span className="text-sm font-semibold text-[rgb(var(--success-text))]">{t("site.friendsTitle")}</span>;
  if (state === "BLOCKED") return <span className="text-sm font-semibold text-[rgb(var(--error-text))]">{t("site.blockedStatusLabel")}</span>;
  if (state === "PENDING" && user.friendship?.direction === "OUTGOING") return <span className="text-sm font-semibold text-[rgb(var(--warning-text))]">{t("site.requestSentLabel")}</span>;
  if (state === "PENDING" && user.friendship?.id) {
    return (
      <>
        <IconButton label={t("site.acceptAction")} busy={busy} onClick={() => onAct(user.friendship!.id!, "accept")} icon={<Check />} />
        <IconButton label={t("site.rejectAction")} busy={busy} onClick={() => onAct(user.friendship!.id!, "reject")} icon={<X />} />
      </>
    );
  }
  return <IconButton label={t("site.addFriendAction")} busy={busy} onClick={() => onAdd(user.id)} icon={<UserPlus />} />;
}

function IconButton({ label, busy, onClick, icon }: { label: string; busy: boolean; onClick: () => void; icon: React.ReactNode }) {
  return (
    <button title={label} aria-label={label} disabled={busy} onClick={onClick} className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[rgb(var(--border))] hover:border-[rgb(var(--primary))] disabled:opacity-50">
      <span className="[&_svg]:h-4 [&_svg]:w-4">{icon}</span>
    </button>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-lg border border-dashed border-[rgb(var(--border))] py-16 text-center text-[rgb(var(--secondary-text))]">{text}</div>;
}
