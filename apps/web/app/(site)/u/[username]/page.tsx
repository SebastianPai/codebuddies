"use client";

import { use, useEffect, useState, useCallback } from "react";
import {
  Award,
  Briefcase,
  CalendarDays,
  Flame,
  Trophy,
  UserPlus,
  Users,
  UserCheck,
  UserX,
} from "lucide-react";

import { api } from "../../../../utils/api";
import { useAuth } from "../../../../hooks/useAuth";
import Image from "next/image";
import { useTranslation } from "../../../../src/i18n/useTranslation";
import { CurrencyIcon } from "@/shared/ui/currency-icon";
import { RarityText } from "@/shared/ui/rarity-text";
import { CareerHeadline, ExperienceSection, RoomsSection, useCareer, useDateFormat } from "./ProfileCareer";

type Profile = {
  id: string;
  username: string;
  avatarUrl: string | null;
  avatarBorder: string | null;
  nameEffectId: string | null;
  level: number;
  xp: number;
  coins: number;
  currentStreak: number;
  bestStreak: number;
  coursesCompleted: number;
  certificatesEarned: number;
  followers: number;
  following: number;
  joinDate: string;
  xpRank: number;

  isFollowing: boolean;
  friendshipId: string | null;
  friendshipStatus: string | null;
  friendshipDirection: "OUTGOING" | "INCOMING" | null;
  mutualFriends: number;
};

export default function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = use(params);
  const { user } = useAuth();
  const t = useTranslation();
  const career = useCareer(username);
  const formatDate = useDateFormat();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<
    "follow" | "friend" | null
  >(null);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<Profile>(`/profiles/${username}`);
      setProfile(data);
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // ====================== FOLLOW ======================
  const toggleFollow = async () => {
    if (!profile) return;
    setActionLoading("follow");

    try {
      if (profile.isFollowing) {
        await api.delete(`/profiles/${username}/follow`);
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                isFollowing: false,
                followers: Math.max(prev.followers - 1, 0),
              }
            : prev,
        );
      } else {
        await api.post(`/profiles/${username}/follow`);
        setProfile((prev) =>
          prev
            ? { ...prev, isFollowing: true, followers: prev.followers + 1 }
            : prev,
        );
      }
    } catch (error: any) {
      alert(
        error?.response?.data?.message || t("site.followUnfollowError"),
      );
    } finally {
      setActionLoading(null);
    }
  };

  // ====================== FRIENDSHIP ======================
  const handleFriendship = async () => {
    if (!profile) return;
    setActionLoading("friend");

    try {
      if (!profile.friendshipId) {
        // Enviar solicitud
        await api.post("/friendships/requests", { userId: profile.id });
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                friendshipStatus: "PENDING",
                friendshipDirection: "OUTGOING",
              }
            : prev,
        );
      } else if (
        profile.friendshipStatus === "PENDING" &&
        profile.friendshipDirection === "OUTGOING"
      ) {
        // Cancelar solicitud enviada
        await api.delete(`/friendships/${profile.friendshipId}`);
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                friendshipId: null,
                friendshipStatus: null,
                friendshipDirection: null,
              }
            : prev,
        );
      } else if (
        profile.friendshipStatus === "PENDING" &&
        profile.friendshipDirection === "INCOMING"
      ) {
        // Aceptar solicitud recibida
        await api.patch(`/friendships/${profile.friendshipId}/accept`);
        setProfile((prev) =>
          prev ? { ...prev, friendshipStatus: "ACCEPTED" } : prev,
        );
      }
    } catch (error: any) {
      alert(
        error?.response?.data?.message || t("site.friendRequestError"),
      );
    } finally {
      setActionLoading(null);
    }
  };

  if (loading)
    return <div className="py-20 text-center text-xl">{t("site.loadingProfile")}</div>;
  if (!profile)
    return (
      <div className="py-20 text-center text-xl">{t("site.profileNotFound")}</div>
    );

  const isSelf = user?.username === profile.username;
  const isFriend = profile.friendshipStatus === "ACCEPTED";

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      {/* Cabecera: portada, avatar, nombre, dónde trabaja y acciones. */}
      <section className="overflow-hidden rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))]">
        <div className="h-28 bg-gradient-to-r from-[rgb(var(--primary)/0.35)] via-[rgb(var(--primary)/0.12)] to-transparent sm:h-36" aria-hidden />
        <div className="flex flex-col items-center gap-6 px-6 pb-8 sm:px-10 md:flex-row md:items-end">
          <div
            className="-mt-16 h-32 w-32 flex-none overflow-hidden rounded-full ring-4 ring-[rgb(var(--card))] sm:h-36 sm:w-36"
            style={profile.avatarBorder ? { boxShadow: `0 0 0 4px ${profile.avatarBorder}` } : undefined}
          >
            {profile.avatarUrl ? (
              <Image src={profile.avatarUrl} alt={profile.username} width={144} height={144} className="h-full w-full object-cover" priority />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-700 to-black text-6xl font-black text-white">
                {profile.username[0].toUpperCase()}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 text-center md:text-left">
            <h1 className="break-all text-3xl font-black tracking-tight sm:text-5xl">
              <RarityText effect={profile.nameEffectId}>@{profile.username}</RarityText>
            </h1>
            <CareerHeadline career={career} />
            <p className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-[rgb(var(--secondary-text))] md:justify-start">
              <span className="inline-flex items-center gap-1.5">
                <Trophy className="h-4 w-4" aria-hidden /> {t("site.globalRank", { rank: profile.xpRank })}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" aria-hidden /> {t("site.joinedLabel")} {formatDate(profile.joinDate, { year: "numeric", month: "long" })}
              </span>
              <span>
                <b className="text-[rgb(var(--text))]">{profile.followers.toLocaleString()}</b> {t("site.followersLabel")} ·{" "}
                <b className="text-[rgb(var(--text))]">{profile.following.toLocaleString()}</b> {t("site.followingLabel")}
              </span>
            </p>
            {profile.mutualFriends > 0 && (
              <p className="mt-2 flex items-center justify-center gap-2 text-sm text-[rgb(var(--secondary-text))] md:justify-start">
                <Users className="h-4 w-4" aria-hidden />
                {profile.mutualFriends} {t(profile.mutualFriends > 1 ? "site.mutualFriendPlural" : "site.mutualFriendSingular")}
              </p>
            )}
          </div>

          {!isSelf && (
            <div className="flex flex-wrap justify-center gap-3">
              <button
                onClick={toggleFollow}
                disabled={actionLoading === "follow"}
                className="inline-flex items-center gap-2 rounded-full bg-[rgb(var(--primary))] px-6 py-2.5 font-bold text-black transition hover:opacity-90 active:scale-95 disabled:opacity-60"
              >
                <UserPlus className="h-4 w-4" aria-hidden />
                {profile.isFollowing ? t("site.unfollowAction") : t("site.followAction")}
              </button>
              <button
                onClick={handleFriendship}
                disabled={actionLoading === "friend"}
                className={`inline-flex items-center gap-2 rounded-full border px-6 py-2.5 font-semibold transition active:scale-95 disabled:opacity-60 ${
                  isFriend
                    ? "border-emerald-500 text-emerald-500"
                    : profile.friendshipStatus === "PENDING" && profile.friendshipDirection === "OUTGOING"
                      ? "border-amber-500 text-amber-500"
                      : "border-[rgb(var(--border))] hover:border-[rgb(var(--primary))]"
                }`}
              >
                {isFriend ? (
                  <>
                    <UserCheck className="h-4 w-4" aria-hidden /> {t("site.friendsTitle")}
                  </>
                ) : profile.friendshipStatus === "PENDING" && profile.friendshipDirection === "OUTGOING" ? (
                  <>
                    <UserX className="h-4 w-4" aria-hidden /> {t("site.cancelRequestAction")}
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" aria-hidden /> {t("site.sendRequestAction")}
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="grid min-w-0 content-start gap-6">
          <ExperienceSection career={career} />
          <RoomsSection username={profile.username} />
        </div>

        {/* Resumen: números del perfil en una lista compacta. */}
        <aside className="h-fit rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6">
          <h2 className="text-lg font-black">{t("site.profileSummary")}</h2>
          <dl className="mt-4 grid grid-cols-2 gap-3">
            <Stat icon={<Award className="h-4 w-4" />} label={t("gamification.levelLabel")} value={profile.level} />
            <Stat icon={<Award className="h-4 w-4" />} label={t("site.experienceLabel")} value={profile.xp.toLocaleString()} />
            <Stat
              icon={<CurrencyIcon currency="coins" size={14} />}
              label={t("site.coinsStatLabel")}
              value={<RarityText effect="goldRank">{profile.coins.toLocaleString()}</RarityText>}
            />
            <Stat icon={<Flame className="h-4 w-4" />} label={t("site.currentStreakLabel")} value={profile.currentStreak} />
            <Stat icon={<Flame className="h-4 w-4" />} label={t("site.bestStreakLabel")} value={profile.bestStreak} />
            <Stat label={t("site.coursesCompletedLabel")} value={profile.coursesCompleted} />
            <Stat label={t("site.certificates")} value={profile.certificatesEarned} />
            {career && career.totals.companies > 0 && (
              <Stat icon={<Briefcase className="h-4 w-4" />} label={t("site.profileCompanies")} value={career.totals.companies} />
            )}
          </dl>
        </aside>
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon?: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-[rgb(var(--background))] p-3">
      <dt className="flex items-center gap-1.5 text-xs text-[rgb(var(--secondary-text))]">
        {icon && <span className="text-[rgb(var(--primary))]">{icon}</span>}
        {label}
      </dt>
      <dd className="mt-1 text-xl font-black tracking-tight">{value}</dd>
    </div>
  );
}
