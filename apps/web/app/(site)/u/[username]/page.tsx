"use client";

import { use, useEffect, useState, useCallback } from "react";
import {
  Award,
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
    <div className="max-w-5xl mx-auto px-6 py-12">
      {/* Hero */}
      <div className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-10 shadow-2xl">
        <div className="flex flex-col md:flex-row gap-10 items-center md:items-start">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div
              className="h-40 w-40 rounded-full overflow-hidden ring-4 ring-offset-8 ring-offset-[rgb(var(--background))] ring-[rgb(var(--primary))]"
              style={
                profile.avatarBorder
                  ? { borderColor: profile.avatarBorder }
                  : undefined
              }
            >
              {profile.avatarUrl ? (
                <Image
                  src={profile.avatarUrl}
                  alt={profile.username}
                  width={160}
                  height={160}
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-zinc-700 to-black flex items-center justify-center text-7xl font-black text-white">
                  {profile.username[0].toUpperCase()}
                </div>
              )}
            </div>
          </div>

          {/* Información */}
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-6xl font-black tracking-tighter">
              <RarityText effect={profile.nameEffectId}>@{profile.username}</RarityText>
            </h1>
            <p className="text-2xl text-zinc-400 mt-2">
              {t("site.globalRank", { rank: profile.xpRank })}
            </p>

            {!isSelf && (
              <div className="flex flex-wrap gap-4 justify-center md:justify-start mt-8">
                <button
                  onClick={toggleFollow}
                  disabled={actionLoading === "follow"}
                  className="flex items-center gap-3 px-8 py-3.5 rounded-2xl bg-[rgb(var(--primary))] font-bold text-black hover:scale-105 active:scale-95 transition disabled:opacity-70"
                >
                  <UserPlus className="w-5 h-5" />
                  {profile.isFollowing ? t("site.unfollowAction") : t("site.followAction")}
                </button>

                <button
                  onClick={handleFriendship}
                  disabled={actionLoading === "friend"}
                  className={`flex items-center gap-3 px-8 py-3.5 rounded-2xl border-2 font-semibold transition hover:scale-105 active:scale-95 disabled:opacity-70 ${
                    isFriend
                      ? "border-emerald-500 text-emerald-400"
                      : profile.friendshipStatus === "PENDING" &&
                          profile.friendshipDirection === "OUTGOING"
                        ? "border-amber-500 text-amber-400"
                        : "border-[rgb(var(--border))]"
                  }`}
                >
                  {isFriend ? (
                    <>
                      {" "}
                      <UserCheck className="w-5 h-5" /> {t("site.friendsTitle")}{" "}
                    </>
                  ) : profile.friendshipStatus === "PENDING" &&
                    profile.friendshipDirection === "OUTGOING" ? (
                    <>
                      {" "}
                      <UserX className="w-5 h-5" /> {t("site.cancelRequestAction")}{" "}
                    </>
                  ) : (
                    <>
                      {" "}
                      <UserPlus className="w-5 h-5" /> {t("site.sendRequestAction")}{" "}
                    </>
                  )}
                </button>
              </div>
            )}

            {profile.mutualFriends > 0 && (
              <div className="mt-6 flex items-center gap-2 justify-center md:justify-start text-zinc-400">
                <Users className="w-5 h-5" />
                <span>
                  {profile.mutualFriends}{" "}
                  {t(profile.mutualFriends > 1 ? "site.mutualFriendPlural" : "site.mutualFriendSingular")}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="mt-10 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <Stat icon={<Trophy />} label={t("gamification.levelLabel")} value={profile.level} />
        <Stat
          icon={<Award />}
          label={t("site.experienceLabel")}
          value={profile.xp.toLocaleString()}
        />
        <Stat
          icon={<CurrencyIcon currency="coins" size={16} />}
          label={t("site.coinsStatLabel")}
          value={profile.coins.toLocaleString()}
        />
        <Stat
          icon={<Flame />}
          label={t("site.currentStreakLabel")}
          value={`${profile.currentStreak} 🔥`}
        />
        <Stat
          icon={<Flame />}
          label={t("site.bestStreakLabel")}
          value={`${profile.bestStreak} 🔥`}
        />
        <Stat label={t("site.coursesCompletedLabel")} value={profile.coursesCompleted} />
        <Stat label={t("site.certificates")} value={profile.certificatesEarned} />
        <Stat
          icon={<UserPlus />}
          label={t("site.followersLabel")}
          value={profile.followers.toLocaleString()}
        />
        <Stat label={t("site.followingLabel")} value={profile.following.toLocaleString()} />
        <Stat
          icon={<CalendarDays />}
          label={t("site.joinedLabel")}
          value={new Date(profile.joinDate).toLocaleDateString("es-ES", {
            year: "numeric",
            month: "long",
          })}
        />
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6 hover:border-[rgb(var(--primary))/40] transition-all">
      {icon && <div className="text-[rgb(var(--primary))] mb-4">{icon}</div>}
      <p className="text-sm text-zinc-400">{label}</p>
      <p className="text-3xl font-black mt-2 tracking-tighter">{value}</p>
    </div>
  );
}
