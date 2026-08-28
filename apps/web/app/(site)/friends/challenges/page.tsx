"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "react-toastify";
import { Check, Swords, Trophy, X } from "lucide-react";
import { api } from "../../../../utils/api";
import { useTranslation } from "../../../../src/i18n/useTranslation";
import { Button, ErrorState, Modal, Skeleton } from "../../../../src/shared/ui";
import { useTrackToolUsed, trackToolAction } from "../../../../components/analytics/tool-tracking";

interface ChallengeUser {
  id: string;
  username: string;
}

interface Challenge {
  id: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "COMPLETED" | "CANCELLED";
  winnerId: string | null;
  isWinner: boolean | null;
  role: "CHALLENGER" | "OPPONENT";
  challenger: ChallengeUser;
  opponent: ChallengeUser;
  course: { id: string; title: string | null; imageUrl: string | null };
  challengerProgress: number;
  opponentProgress: number;
}

interface FriendLite {
  id: string;
  username: string;
}

interface Friendship {
  requesterId: string;
  addresseeId: string;
  requester: FriendLite;
  addressee: FriendLite;
}

interface CourseLite {
  id: string;
  title: string;
}

export default function FriendChallengesPage() {
  const t = useTranslation();
  useTrackToolUsed("friend_challenges", "social");
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [friends, setFriends] = useState<FriendLite[]>([]);
  const [courses, setCourses] = useState<CourseLite[]>([]);
  const [selectedFriend, setSelectedFriend] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const data = await api.get<Challenge[]>("/friend-challenges");
      setChallenges(data);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openModal = async () => {
    setModalOpen(true);
    try {
      const [friendships, courseList] = await Promise.all([
        api.get<Friendship[]>("/friendships"),
        api.get<CourseLite[]>("/courses"),
      ]);
      // /friendships no siempre devuelve un `friend` calculado — se resuelve
      // acá comparando contra el propio usuario vía localStorage.
      const myId = localStorage.getItem("userId");
      setFriends(
        friendships.map((f) => (f.requesterId === myId ? f.addressee : f.requester)),
      );
      setCourses(courseList);
    } catch {
      toast.error(t("common.unexpectedError"));
    }
  };

  const createChallenge = async () => {
    if (!selectedFriend || !selectedCourse) return;
    setCreating(true);
    try {
      await api.post("/friend-challenges", {
        opponentUsername: selectedFriend,
        courseId: selectedCourse,
      });
      trackToolAction("friend_challenges", "social", "create");
      toast.success(t("site.challengeSentToast"));
      setModalOpen(false);
      setSelectedFriend("");
      setSelectedCourse("");
      await load();
    } catch {
      toast.error(t("common.unexpectedError"));
    } finally {
      setCreating(false);
    }
  };

  const respond = async (id: string, accept: boolean) => {
    setBusyId(id);
    try {
      await api.patch(`/friend-challenges/${id}/${accept ? "accept" : "decline"}`, {});
      if (accept) trackToolAction("friend_challenges", "social", "accept");
      await load();
    } catch {
      toast.error(t("common.unexpectedError"));
    } finally {
      setBusyId(null);
    }
  };

  const cancel = async (id: string) => {
    setBusyId(id);
    try {
      await api.patch(`/friend-challenges/${id}/cancel`, {});
      await load();
    } catch {
      toast.error(t("common.unexpectedError"));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[rgb(var(--background))] px-4 py-24 text-[rgb(var(--text))]">
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Swords className="text-[rgb(var(--primary))]" size={28} />
            <h1 className="text-3xl font-black">{t("site.challengesTitle")}</h1>
          </div>
          <Button onClick={openModal}>{t("site.newChallengeButton")}</Button>
        </div>

        {loading ? (
          <div className="mt-8 space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : loadError ? (
          <div className="mt-8">
            <ErrorState message={t("common.unexpectedError")} />
          </div>
        ) : challenges.length === 0 ? (
          <p className="mt-8 text-sm text-[rgb(var(--secondary-text))]">
            {t("site.noChallengesYet")}
          </p>
        ) : (
          <div className="mt-8 space-y-4">
            {challenges.map((challenge) => {
              const opponent =
                challenge.role === "CHALLENGER" ? challenge.opponent : challenge.challenger;
              const myProgress =
                challenge.role === "CHALLENGER"
                  ? challenge.challengerProgress
                  : challenge.opponentProgress;
              const theirProgress =
                challenge.role === "CHALLENGER"
                  ? challenge.opponentProgress
                  : challenge.challengerProgress;

              return (
                <div
                  key={challenge.id}
                  className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Link
                      href={`/courses/${challenge.course.id}`}
                      className="font-bold hover:text-[rgb(var(--primary))]"
                    >
                      {challenge.course.title}
                    </Link>
                    <span className="text-xs font-bold uppercase text-[rgb(var(--secondary-text))]">
                      vs @{opponent.username}
                    </span>
                  </div>

                  {challenge.status === "PENDING" && challenge.role === "OPPONENT" && (
                    <div className="mt-4 flex gap-2">
                      <Button
                        className="px-3 py-1.5 text-xs"
                        disabled={busyId === challenge.id}
                        onClick={() => respond(challenge.id, true)}
                      >
                        <Check size={14} /> {t("site.acceptChallengeButton")}
                      </Button>
                      <Button
                        className="px-3 py-1.5 text-xs"
                        variant="secondary"
                        disabled={busyId === challenge.id}
                        onClick={() => respond(challenge.id, false)}
                      >
                        <X size={14} /> {t("site.declineChallengeButton")}
                      </Button>
                    </div>
                  )}

                  {challenge.status === "PENDING" && challenge.role === "CHALLENGER" && (
                    <div className="mt-4 flex items-center gap-3">
                      <span className="text-xs text-[rgb(var(--secondary-text))]">
                        {t("site.challengePendingLabel")}
                      </span>
                      <Button
                        className="px-3 py-1.5 text-xs"
                        variant="secondary"
                        disabled={busyId === challenge.id}
                        onClick={() => cancel(challenge.id)}
                      >
                        {t("common.cancel")}
                      </Button>
                    </div>
                  )}

                  {challenge.status === "ACCEPTED" && (
                    <div className="mt-4 space-y-2">
                      <ProgressRow label={t("site.yourProgressLabel")} percent={myProgress} />
                      <ProgressRow label={`@${opponent.username}`} percent={theirProgress} />
                    </div>
                  )}

                  {challenge.status === "COMPLETED" && (
                    <div
                      className={`mt-4 flex items-center gap-2 text-sm font-bold ${
                        challenge.isWinner ? "text-green-500" : "text-[rgb(var(--secondary-text))]"
                      }`}
                    >
                      <Trophy size={16} />
                      {challenge.isWinner
                        ? t("site.youWonChallenge")
                        : t("site.youLostChallenge")}
                    </div>
                  )}

                  {(challenge.status === "DECLINED" || challenge.status === "CANCELLED") && (
                    <p className="mt-4 text-sm text-[rgb(var(--secondary-text))]">
                      {t(
                        challenge.status === "DECLINED"
                          ? "site.challengeDeclinedLabel"
                          : "site.challengeCancelledLabel",
                      )}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal isOpen={modalOpen} titleId="new-challenge-title" onClose={() => setModalOpen(false)}>
        <h2 id="new-challenge-title" className="text-xl font-black">
          {t("site.newChallengeButton")}
        </h2>

        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-[rgb(var(--secondary-text))]">
              {t("site.challengeFriendLabel")}
            </label>
            <select
              value={selectedFriend}
              onChange={(e) => setSelectedFriend(e.target.value)}
              className="w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-3 py-2 text-sm"
            >
              <option value="">—</option>
              {friends.map((friend) => (
                <option key={friend.id} value={friend.username}>
                  @{friend.username}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-[rgb(var(--secondary-text))]">
              {t("site.challengeCourseLabel")}
            </label>
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-3 py-2 text-sm"
            >
              <option value="">—</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              disabled={!selectedFriend || !selectedCourse || creating}
              onClick={createChallenge}
            >
              {t("site.sendChallengeButton")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function ProgressRow({ label, percent }: { label: string; percent: number }) {
  return (
    <div>
      <div className="flex justify-between text-xs font-bold text-[rgb(var(--secondary-text))]">
        <span>{label}</span>
        <span>{percent}%</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-[rgb(var(--border))]">
        <div
          className="h-full bg-[rgb(var(--primary))]"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
