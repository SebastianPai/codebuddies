"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Link2, MessageCircle, MoreHorizontal, Search, ShieldBan, Swords, UserMinus, UserPlus, Users, X } from "lucide-react";
import { toast } from "react-toastify";
import { buddySvg } from "@codebuddies/world-objects";
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
  online?: boolean;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "BLOCKED";
};

type SearchUser = UserLite & {
  mutualCount: number;
  friendship?: { id?: string; status: string; direction?: "OUTGOING" | "INCOMING" };
};

type Tab = "friends" | "received" | "sent";

// Amigos: buscar gente siempre a mano, las solicitudes recibidas arriba de
// todo, tarjetas con acciones útiles (mensaje, retar, perfil) y las acciones
// que no se pueden deshacer (eliminar, bloquear) detrás de una confirmación.
export default function FriendsPage() {
  const t = useTranslation();
  useTrackToolUsed("friends", "social");
  const [tab, setTab] = useState<Tab>("friends");
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [received, setReceived] = useState<Friendship[]>([]);
  const [sent, setSent] = useState<Friendship[]>([]);
  const [suggestions, setSuggestions] = useState<SearchUser[]>([]);
  const [results, setResults] = useState<SearchUser[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const searching = query.trim().length >= 2;

  const load = useCallback(async () => {
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

  const runSearch = useCallback(async (text: string) => {
    try {
      setResults(await api.get<SearchUser[]>(`/friendships/search?q=${encodeURIComponent(text)}`));
    } catch {
      setResults([]);
    }
  }, []);

  useEffect(() => {
    if (!searching) {
      setResults([]);
      return;
    }
    const timer = setTimeout(() => void runSearch(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query, searching, runSearch]);

  async function act(id: string, action: "accept" | "reject" | "remove") {
    setBusyId(id);
    try {
      if (action === "remove") await api.delete(`/friendships/${id}`);
      else await api.patch(`/friendships/${id}/${action}`);
      if (action === "accept") trackToolAction("friends", "social", "accept_request");
      await load();
      if (searching) await runSearch(query.trim());
    } catch {
      toast.error(t("common.unexpectedError"));
    } finally {
      setBusyId(null);
    }
  }

  async function block(user: UserLite) {
    setBusyId(user.id);
    try {
      await api.post("/friendships/blocks", { userId: user.id });
      await load();
    } catch {
      toast.error(t("common.unexpectedError"));
    } finally {
      setBusyId(null);
    }
  }

  async function add(userId: string) {
    setBusyId(userId);
    try {
      await api.post("/friendships/requests", { userId });
      trackToolAction("friends", "social", "send_request");
      toast.success(t("site.requestSentLabel"));
      await load();
      if (searching) await runSearch(query.trim());
    } catch {
      toast.error(t("common.unexpectedError"));
    } finally {
      setBusyId(null);
    }
  }

  async function invite() {
    let link = `${window.location.origin}/register`;
    try {
      const me = await api.get<{ profile?: { referralCode?: string } }>("/referrals/me");
      if (me.profile?.referralCode) link += `?ref=${encodeURIComponent(me.profile.referralCode)}`;
    } catch {
      // Sin programa de referidos: se comparte el registro a secas.
    }
    try {
      if (navigator.share) await navigator.share({ title: "CodeBuddies", text: t("site.friendsInviteText"), url: link });
      else {
        await navigator.clipboard.writeText(link);
        toast.success(t("site.friendsInviteCopied"));
      }
      trackToolAction("friends", "social", "invite");
    } catch {
      // El usuario cerró el menú de compartir.
    }
  }

  // El amigo con su estado en línea (la API lo manda en la amistad) y los
  // que están conectados primero.
  const friendList = useMemo(
    () =>
      friends
        .map((f) => ({ friendship: f, user: { ...(f.friend ?? f.requester), online: f.online ?? f.friend?.online } }))
        .sort((a, b) => Number(Boolean(b.user.online)) - Number(Boolean(a.user.online)) || a.user.username.localeCompare(b.user.username)),
    [friends],
  );
  const onlineCount = friendList.filter((f) => f.user.online).length;

  const tabs: Array<[Tab, string, number]> = [
    ["friends", t("site.friendsTitle"), friends.length],
    ["received", t("site.tabRequests"), received.length],
    ["sent", t("site.tabSent"), sent.length],
  ];

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-black sm:text-4xl">
            <Users className="h-8 w-8 text-[rgb(var(--primary))] sm:h-9 sm:w-9" aria-hidden />
            {t("site.friendsTitle")}
          </h1>
          <p className="mt-2 text-[rgb(var(--secondary-text))]">
            {friends.length > 0 ? t("site.friendsOnlineCount", { count: onlineCount, total: friends.length }) : t("site.friendsDescription")}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/friends/challenges"
            className="inline-flex items-center gap-2 rounded-xl border border-[rgb(var(--border))] px-4 py-2.5 text-sm font-bold transition hover:border-[rgb(var(--primary))] hover:text-[rgb(var(--primary-text))]"
          >
            <Swords className="h-4 w-4" aria-hidden />
            {t("site.challengesTitle")}
          </Link>
          <button
            type="button"
            onClick={() => void invite()}
            className="inline-flex items-center gap-2 rounded-xl bg-[rgb(var(--button))] px-4 py-2.5 text-sm font-extrabold text-[rgb(var(--button-text))] transition hover:-translate-y-0.5"
          >
            <Link2 className="h-4 w-4" aria-hidden />
            {t("site.friendsInvite")}
          </button>
        </div>
      </header>

      {/* Buscar gente: siempre a mano */}
      <div className="relative mb-6">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[rgb(var(--secondary-text))]" aria-hidden />
        <input
          ref={searchRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("site.searchUsernamePlaceholder")}
          aria-label={t("site.searchUsernamePlaceholder")}
          className="w-full rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] py-3.5 pl-12 pr-12 text-base outline-none transition focus:border-[rgb(var(--primary))] focus:ring-4 focus:ring-[rgb(var(--primary)/0.15)]"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label={t("common.close")}
            className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[rgb(var(--secondary-text))] hover:bg-[rgb(var(--border))]"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        )}
      </div>

      {searching ? (
        <section aria-live="polite">
          <h2 className="mb-3 text-sm font-black uppercase tracking-widest text-[rgb(var(--secondary-text))]">{t("site.friendsSearchResults", { query: query.trim() })}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {results.map((user) => (
              <PersonCard key={user.id} user={user} subtitle={t("site.mutualFriendsCount", { count: user.mutualCount })}>
                <FriendButton user={user} busy={busyId === user.id || busyId === user.friendship?.id} onAdd={add} onAct={act} />
              </PersonCard>
            ))}
          </div>
          {!results.length && <Empty text={t("site.noUsersFound")} />}
        </section>
      ) : loadError ? (
        <div className="space-y-4">
          <ErrorState message={t("common.unexpectedError")} />
          <Button variant="primary" onClick={() => void load()}>
            {t("common.refresh")}
          </Button>
        </div>
      ) : loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : (
        <>
          {/* Solicitudes recibidas: lo más importante, arriba de todo */}
          {received.length > 0 && tab !== "received" && (
            <section className="mb-6 rounded-2xl border-2 border-[rgb(var(--primary)/0.5)] bg-[rgb(var(--primary)/0.06)] p-4">
              <h2 className="mb-3 flex items-center gap-2 font-black">
                <UserPlus className="h-5 w-5 text-[rgb(var(--primary))]" aria-hidden />
                {t("site.friendsRequestsTitle", { count: received.length })}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {received.slice(0, 4).map((f) => (
                  <PersonCard key={f.id} user={f.requester}>
                    <RequestButtons busy={busyId === f.id} onAccept={() => act(f.id, "accept")} onReject={() => act(f.id, "reject")} />
                  </PersonCard>
                ))}
              </div>
              {received.length > 4 && (
                <button type="button" onClick={() => setTab("received")} className="mt-3 text-sm font-bold text-[rgb(var(--primary-text))] hover:underline">
                  {t("site.friendsSeeAll")}
                </button>
              )}
            </section>
          )}

          <div role="tablist" className="mb-5 flex gap-1 overflow-x-auto border-b border-[rgb(var(--border))]">
            {tabs.map(([id, label, count]) => (
              <button
                key={id}
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={`flex shrink-0 items-center gap-2 px-4 py-3 text-sm font-bold transition ${tab === id ? "border-b-2 border-[rgb(var(--primary))] text-[rgb(var(--primary-text))]" : "text-[rgb(var(--secondary-text))] hover:text-[rgb(var(--text))]"}`}
              >
                {label}
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${id === "received" && count > 0 ? "bg-rose-600 text-white" : "bg-[rgb(var(--border))] text-[rgb(var(--secondary-text))]"}`}
                >
                  {count}
                </span>
              </button>
            ))}
          </div>

          {tab === "friends" && (
            <section>
              {friendList.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {friendList.map(({ friendship, user }) => (
                    <PersonCard key={friendship.id} user={user} subtitle={user.online ? t("chat.online") : t("site.offlineStatus")}>
                      <FriendActions user={user} busy={busyId === friendship.id || busyId === user.id} onRemove={() => act(friendship.id, "remove")} onBlock={() => block(user)} />
                    </PersonCard>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center rounded-3xl border border-dashed border-[rgb(var(--border))] px-6 py-10 text-center">
                  <div aria-hidden dangerouslySetInnerHTML={{ __html: buddySvg("feliz", 110) }} />
                  <h2 className="mt-4 text-xl font-black">{t("site.friendsEmptyTitle")}</h2>
                  <p className="mt-2 max-w-md text-[rgb(var(--secondary-text))]">{t("site.friendsEmptyBody")}</p>
                  <div className="mt-5 flex flex-wrap justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => void invite()}
                      className="inline-flex items-center gap-2 rounded-xl bg-[rgb(var(--button))] px-5 py-3 font-extrabold text-[rgb(var(--button-text))]"
                    >
                      <Link2 className="h-4 w-4" aria-hidden />
                      {t("site.friendsInvite")}
                    </button>
                    <button
                      type="button"
                      onClick={() => searchRef.current?.focus()}
                      className="inline-flex items-center gap-2 rounded-xl border border-[rgb(var(--border))] px-5 py-3 font-bold hover:border-[rgb(var(--primary))]"
                    >
                      <Search className="h-4 w-4" aria-hidden />
                      {t("site.friendsFindPeople")}
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}

          {tab === "received" && (
            <section className="grid gap-3 sm:grid-cols-2">
              {received.map((f) => (
                <PersonCard key={f.id} user={f.requester}>
                  <RequestButtons busy={busyId === f.id} onAccept={() => act(f.id, "accept")} onReject={() => act(f.id, "reject")} />
                </PersonCard>
              ))}
              {!received.length && <Empty text={t("site.nothingHereYet")} />}
            </section>
          )}

          {tab === "sent" && (
            <section className="grid gap-3 sm:grid-cols-2">
              {sent.map((f) => (
                <PersonCard key={f.id} user={f.addressee} subtitle={t("site.requestSentLabel")}>
                  <button
                    type="button"
                    disabled={busyId === f.id}
                    onClick={() => act(f.id, "remove")}
                    className="rounded-xl border border-[rgb(var(--border))] px-3 py-2 text-sm font-bold hover:border-rose-500 hover:text-rose-500 disabled:opacity-50"
                  >
                    {t("site.friendsCancelRequest")}
                  </button>
                </PersonCard>
              ))}
              {!sent.length && <Empty text={t("site.nothingHereYet")} />}
            </section>
          )}

          {/* Sugerencias: siempre visibles mientras haya pocos amigos */}
          {tab === "friends" && friends.length < 8 && suggestions.length > 0 && (
            <section className="mt-8">
              <h2 className="mb-3 text-sm font-black uppercase tracking-widest text-[rgb(var(--secondary-text))]">{t("site.friendsSuggestionsTitle")}</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {suggestions.slice(0, 6).map((user) => (
                  <PersonCard key={user.id} user={user} subtitle={user.mutualCount > 0 ? t("site.mutualFriendsCount", { count: user.mutualCount }) : user.level ? t("site.friendsLevel", { level: user.level }) : undefined}>
                    <FriendButton user={user} busy={busyId === user.id || busyId === user.friendship?.id} onAdd={add} onAct={act} />
                  </PersonCard>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}

function Avatar({ user }: { user: UserLite }) {
  return (
    <Link href={`/u/${user.username}`} className="relative h-14 w-14 shrink-0" aria-label={`@${user.username}`}>
      <span className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-[rgb(var(--border))] text-xl font-black">
        {user.avatarUrl ? <Image src={user.avatarUrl} alt="" width={56} height={56} className="h-full w-full object-cover" /> : user.username[0]?.toUpperCase()}
      </span>
      {user.online && <span className="absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[rgb(var(--card))] bg-emerald-500" />}
    </Link>
  );
}

function PersonCard({ user, subtitle, children }: { user: UserLite; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-3 transition hover:border-[rgb(var(--primary)/0.5)] sm:p-4">
      <Avatar user={user} />
      <div className="min-w-0 flex-1">
        <Link href={`/u/${user.username}`} className="block truncate font-extrabold hover:text-[rgb(var(--primary-text))]">
          @{user.username}
        </Link>
        {subtitle && (
          <p className={`truncate text-sm ${user.online ? "text-emerald-500" : "text-[rgb(var(--secondary-text))]"}`}>{subtitle}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </div>
  );
}

function RequestButtons({ busy, onAccept, onReject }: { busy: boolean; onAccept: () => void; onReject: () => void }) {
  const t = useTranslation();
  return (
    <>
      <button
        type="button"
        disabled={busy}
        onClick={onAccept}
        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
      >
        <Check className="h-4 w-4" aria-hidden />
        <span className="hidden sm:inline">{t("site.acceptAction")}</span>
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={onReject}
        aria-label={t("site.rejectAction")}
        title={t("site.rejectAction")}
        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[rgb(var(--border))] hover:border-rose-500 hover:text-rose-500 disabled:opacity-50"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </>
  );
}

// Mensaje y retar a la vista; eliminar y bloquear en un menú, con confirmación.
function FriendActions({ user, busy, onRemove, onBlock }: { user: UserLite; busy: boolean; onRemove: () => void; onBlock: () => void }) {
  const t = useTranslation();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState<"remove" | "block" | null>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (box.current && !box.current.contains(event.target as Node)) {
        setOpen(false);
        setConfirm(null);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const iconLink = "inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[rgb(var(--border))] transition hover:border-[rgb(var(--primary))] hover:text-[rgb(var(--primary-text))]";
  return (
    <div className="relative flex items-center gap-2" ref={box}>
      <Link href={`/messages?to=${encodeURIComponent(user.id)}`} className={iconLink} aria-label={t("site.friendsMessage")} title={t("site.friendsMessage")}>
        <MessageCircle className="h-4 w-4" aria-hidden />
      </Link>
      <Link href={`/friends/challenges?rival=${encodeURIComponent(user.username)}`} className={iconLink} aria-label={t("site.friendsChallenge")} title={t("site.friendsChallenge")}>
        <Swords className="h-4 w-4" aria-hidden />
      </Link>
      <button
        type="button"
        onClick={() => { setOpen((v) => !v); setConfirm(null); }}
        aria-label={t("site.friendsMore")}
        aria-expanded={open}
        className={iconLink}
      >
        <MoreHorizontal className="h-4 w-4" aria-hidden />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-11 z-20 w-64 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-2 shadow-xl">
          {confirm ? (
            <div className="p-2">
              <p className="text-sm font-semibold">
                {confirm === "remove" ? t("site.friendsConfirmRemove", { username: user.username }) : t("site.friendsConfirmBlock", { username: user.username })}
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => { (confirm === "remove" ? onRemove : onBlock)(); setOpen(false); setConfirm(null); }}
                  className="flex-1 rounded-xl bg-rose-600 px-3 py-2 text-sm font-bold text-white hover:bg-rose-500 disabled:opacity-50"
                >
                  {t("site.friendsConfirmYes")}
                </button>
                <button type="button" onClick={() => setConfirm(null)} className="flex-1 rounded-xl border border-[rgb(var(--border))] px-3 py-2 text-sm font-bold">
                  {t("site.friendsConfirmNo")}
                </button>
              </div>
            </div>
          ) : (
            <>
              <Link role="menuitem" href={`/u/${user.username}`} className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-[rgb(var(--border))]">
                <Users className="h-4 w-4" aria-hidden />
                {t("site.friendsProfile")}
              </Link>
              <button role="menuitem" type="button" onClick={() => setConfirm("remove")} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold hover:bg-[rgb(var(--border))]">
                <UserMinus className="h-4 w-4" aria-hidden />
                {t("site.removeAction")}
              </button>
              <button role="menuitem" type="button" onClick={() => setConfirm("block")} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-rose-500 hover:bg-rose-500/10">
                <ShieldBan className="h-4 w-4" aria-hidden />
                {t("site.blockAction")}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function FriendButton({ user, busy, onAdd, onAct }: { user: SearchUser; busy: boolean; onAdd: (id: string) => void; onAct: (id: string, action: "accept" | "reject" | "remove") => void }) {
  const t = useTranslation();
  const state = user.friendship?.status ?? "NONE";
  if (state === "ACCEPTED") return <span className="text-sm font-semibold text-emerald-500">{t("site.friendsTitle")}</span>;
  if (state === "BLOCKED") return <span className="text-sm font-semibold text-rose-500">{t("site.blockedStatusLabel")}</span>;
  if (state === "PENDING" && user.friendship?.direction === "OUTGOING") return <span className="text-sm font-semibold text-amber-500">{t("site.requestSentLabel")}</span>;
  if (state === "PENDING" && user.friendship?.id) {
    return <RequestButtons busy={busy} onAccept={() => onAct(user.friendship!.id!, "accept")} onReject={() => onAct(user.friendship!.id!, "reject")} />;
  }
  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => onAdd(user.id)}
      className="inline-flex items-center gap-1.5 rounded-xl border border-[rgb(var(--primary))] px-3 py-2 text-sm font-bold text-[rgb(var(--primary-text))] transition hover:bg-[rgb(var(--primary))] hover:text-black disabled:opacity-50"
    >
      <UserPlus className="h-4 w-4" aria-hidden />
      <span className="hidden sm:inline">{t("site.addFriendAction")}</span>
    </button>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="col-span-full rounded-2xl border border-dashed border-[rgb(var(--border))] py-12 text-center text-[rgb(var(--secondary-text))]">{text}</div>;
}
