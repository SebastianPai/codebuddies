"use client";

import { useEffect, useMemo, useState } from "react";
import ItemEditor from "../../../components/item-editor/ItemEditor";
import { api } from "../../../utils/api";
import { useTranslation } from "../../../src/i18n/useTranslation";

type Dashboard = {
  applicationsPending: number;
  reportsOpen: number;
  creatorsActive: number;
  content: Record<string, number>;
  economy: {
    grossCoins: number;
    creatorEarnings: number;
    commissions: number;
    publicationFees: number;
    sales: number;
  };
};

type Settings = Record<string, number | boolean>;
type Application = {
  id: string;
  status: string;
  message?: string;
  user: { username: string; email: string; level: number };
};
type Review = { id: string; message: string; status?: string; createdAt: string };
type Content = {
  id: string;
  type: "WORLD_ITEM" | "AVATAR_ITEM";
  title: string;
  description?: string;
  category?: string;
  tags: string[];
  status: string;
  priceCoins: number;
  previewUrl?: string;
  spriteUrl?: string;
  payload?: any;
  creator: { user: { username: string } };
  reviews?: Review[];
};

function toEditorInitial(content: Content) {
  const payload = content.payload ?? {};
  const worldData = payload.worldData ?? {};
  const avatarData = payload.avatarData ?? {};
  const item = payload.item ?? {};

  return {
    ...worldData,
    ...item,
    formCategory: content.type === "AVATAR_ITEM" ? "avatar" : worldData.kind === "FLOOR" || worldData.kind === "WALL" ? "texture" : "world",
    type: content.type,
    title: content.title,
    name: content.title,
    description: content.description ?? "",
    category: content.category ?? item.category ?? "furniture",
    tags: content.tags,
    priceCoins: content.priceCoins,
    coinsPrice: content.priceCoins,
    imageUrl: content.spriteUrl || content.previewUrl || worldData.spriteSheetUrl,
    spriteUrl: content.spriteUrl,
    previewUrl: content.previewUrl,
    slot: avatarData.slot,
    layer: avatarData.layer,
    avatarData,
    itemSpriteUrl: avatarData.itemSprite?.imageUrl,
    itemSpriteFrameWidth: avatarData.itemSprite?.frameWidth,
    itemSpriteFrameHeight: avatarData.itemSprite?.frameHeight,
    itemSpriteFramesCount: avatarData.itemSprite?.framesCount,
    itemSpriteRowIndex: avatarData.itemSprite?.rowIndex,
    itemSpriteAnimation: avatarData.itemSprite?.animation,
  };
}

export default function AdminMarketplacePage() {
  const t = useTranslation();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [settings, setSettings] = useState<Settings>({});
  const [applications, setApplications] = useState<Application[]>([]);
  const [contents, setContents] = useState<Content[]>([]);
  const [selectedContentId, setSelectedContentId] = useState<string | null>(null);
  const [reviewComment, setReviewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reviewing, setReviewing] = useState<string | null>(null);

  const selectedContent = useMemo(
    () => contents.find((content) => content.id === selectedContentId) ?? contents[0],
    [contents, selectedContentId],
  );

  const load = async () => {
    setError("");
    try {
      const [dashboardData, settingsData, applicationsData, contentsData] = await Promise.all([
        api.get<Dashboard>("/admin/marketplace/dashboard"),
        api.get<Settings>("/admin/marketplace/settings"),
        api.get<Application[]>("/admin/marketplace/applications"),
        api.get<Content[]>("/admin/marketplace/contents"),
      ]);
      setDashboard(dashboardData);
      setSettings(settingsData);
      setApplications(applicationsData);
      setContents(contentsData);
      setSelectedContentId((current) => current ?? contentsData[0]?.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.marketplaceLoadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const updateSettings = async () => {
    await api.patch("/admin/marketplace/settings", settings);
    await load();
  };

  const reviewApplication = async (id: string, action: string) => {
    setReviewing(`${id}:${action}`);
    await api.patch(`/admin/marketplace/applications/${id}/review`, {
      action,
      adminMessage: action === "APPROVE" ? t("admin.welcomeToCreatorPlatform") : t("admin.reviewTeamComments"),
    });
    setReviewing(null);
    await load();
  };

  const reviewContent = async (id: string, action: string) => {
    if (action === "REQUEST_CHANGES" && !reviewComment.trim()) {
      setError(t("admin.observationRequiredError"));
      return;
    }
    setReviewing(`${id}:${action}`);
    await api.patch(`/admin/marketplace/contents/${id}/review`, {
      action,
      comment: reviewComment.trim() || t("admin.adminReviewPrefix", { action }),
    });
    setReviewComment("");
    setReviewing(null);
    await load();
  };

  return (
    <div className="space-y-8 p-10 text-white">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.25em] text-yellow-400">{t("admin.adminBadgeLabel")}</p>
        <h1 className="mt-2 text-4xl font-black">Marketplace</h1>
        <p className="mt-2 text-zinc-400">
          {t("admin.marketplaceAdminDescription")}
        </p>
      </div>

      {loading && (
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-2xl bg-zinc-900" />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-3xl border border-red-900 bg-red-950/40 p-6 text-red-100">
          <b>{t("admin.actionFailedError")}</b>
          <p className="mt-2 text-sm">{error}</p>
          <button onClick={() => void load()} className="mt-4 rounded-xl bg-yellow-400 px-4 py-2 font-black text-black">
            {t("gamification.retry")}
          </button>
        </div>
      )}

      {!loading && (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            {[
              [t("admin.applicationsLabel"), dashboard?.applicationsPending ?? 0],
              [t("admin.reportsLabel"), dashboard?.reportsOpen ?? 0],
              [t("admin.creatorsLabel"), dashboard?.creatorsActive ?? 0],
              [t("admin.salesLabel"), dashboard?.economy.sales ?? 0],
              [t("admin.grossCoinsLabel"), dashboard?.economy.grossCoins ?? 0],
              [t("admin.commissionsLabel"), dashboard?.economy.commissions ?? 0],
              [t("admin.publicationFeesLabel"), dashboard?.economy.publicationFees ?? 0],
              [t("site.publishedLabel"), dashboard?.content.PUBLISHED ?? 0],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-zinc-800 bg-[#111] p-5">
                <p className="text-sm text-zinc-500">{label}</p>
                <b className="mt-2 block text-3xl text-yellow-400">{value}</b>
              </div>
            ))}
          </div>

          <section className="rounded-3xl border border-zinc-800 bg-[#111] p-6">
            <h2 className="text-2xl font-black text-yellow-400">{t("admin.economicConfigTitle")}</h2>
            <div className="mt-5 grid gap-3 md:grid-cols-4">
              {Object.entries(settings)
                .filter(([key]) => !["id", "createdAt", "updatedAt", "metadata"].includes(key))
                .map(([key, value]) => (
                  <label key={key} className="grid gap-2 text-sm text-zinc-400">
                    {key}
                    {typeof value === "boolean" ? (
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={(event) => setSettings({ ...settings, [key]: event.target.checked })}
                        className="h-5 w-5 accent-yellow-400"
                      />
                    ) : (
                      <input
                        type="number"
                        value={Number(value)}
                        onChange={(event) => setSettings({ ...settings, [key]: Number(event.target.value) })}
                        className="rounded-xl border border-zinc-800 bg-black px-3 py-2 text-white outline-none focus:border-yellow-400"
                      />
                    )}
                  </label>
                ))}
            </div>
            <button onClick={() => void updateSettings()} className="mt-5 rounded-2xl bg-yellow-400 px-5 py-3 font-black text-black">
              {t("admin.saveConfigButton")}
            </button>
          </section>

          <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
            <section className="space-y-6">
              <div className="rounded-3xl border border-zinc-800 bg-[#111] p-6">
                <h2 className="text-2xl font-black">{t("admin.creatorApplicationsTitle")}</h2>
                <div className="mt-5 grid gap-3">
                  {!applications.length && (
                    <div className="rounded-2xl border border-dashed border-zinc-800 bg-black p-6 text-zinc-400">
                      {t("admin.noPendingApplications")}
                    </div>
                  )}
                  {applications.map((application) => (
                    <div key={application.id} className="rounded-2xl border border-zinc-800 bg-black p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <b>{application.user.username}</b>
                          <p className="text-sm text-zinc-500">{application.user.email} - {t("admin.nivelWord")} {application.user.level}</p>
                        </div>
                        <span className="text-sm text-yellow-400">{application.status}</span>
                      </div>
                      <p className="mt-3 text-sm text-zinc-400">{application.message || t("admin.noMessageFallback")}</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button disabled={Boolean(reviewing)} onClick={() => void reviewApplication(application.id, "APPROVE")} className="rounded-xl bg-emerald-400 px-3 py-2 text-sm font-black text-black disabled:opacity-50">{t("admin.approveButton")}</button>
                        <button disabled={Boolean(reviewing)} onClick={() => void reviewApplication(application.id, "REQUEST_INFO")} className="rounded-xl bg-yellow-400 px-3 py-2 text-sm font-black text-black disabled:opacity-50">{t("admin.requestInfoButton")}</button>
                        <button disabled={Boolean(reviewing)} onClick={() => void reviewApplication(application.id, "REJECT")} className="rounded-xl bg-red-500 px-3 py-2 text-sm font-black text-white disabled:opacity-50">{t("admin.rejectButton")}</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-zinc-800 bg-[#111] p-6">
                <h2 className="text-2xl font-black">{t("admin.objectQueueTitle")}</h2>
                <div className="mt-5 grid gap-3">
                  {!contents.length && (
                    <div className="rounded-2xl border border-dashed border-zinc-800 bg-black p-6 text-zinc-400">
                      {t("admin.noContentsToReview")}
                    </div>
                  )}
                  {contents.map((content) => (
                    <button
                      key={content.id}
                      onClick={() => setSelectedContentId(content.id)}
                      className={`rounded-2xl border p-4 text-left transition ${
                        selectedContent?.id === content.id
                          ? "border-yellow-400 bg-yellow-400/10"
                          : "border-zinc-800 bg-black hover:border-zinc-600"
                      }`}
                    >
                      <b>{content.title}</b>
                      <p className="text-sm text-zinc-500">{t("admin.byCreatorPriceSuffix", { username: content.creator.user.username, price: content.priceCoins })}</p>
                      <span className="mt-2 inline-block text-sm text-yellow-400">{content.status}</span>
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-zinc-800 bg-[#111] p-6">
              {!selectedContent ? (
                <div className="rounded-2xl border border-dashed border-zinc-800 bg-black p-10 text-center text-zinc-400">
                  {t("admin.selectContentToInspect")}
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h2 className="text-2xl font-black text-yellow-400">{t("admin.technicalReviewTitle")}</h2>
                      <p className="mt-1 text-sm text-zinc-400">
                        {t("admin.contentSummaryLine", { title: selectedContent.title, status: selectedContent.status, username: selectedContent.creator.user.username })}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button disabled={Boolean(reviewing)} onClick={() => void reviewContent(selectedContent.id, "APPROVE")} className="rounded-xl bg-emerald-400 px-3 py-2 text-sm font-black text-black disabled:opacity-50">{t("admin.approveButton")}</button>
                      <button disabled={Boolean(reviewing)} onClick={() => void reviewContent(selectedContent.id, "PUBLISH")} className="rounded-xl bg-yellow-400 px-3 py-2 text-sm font-black text-black disabled:opacity-50">{t("admin.publishButton")}</button>
                      <button disabled={Boolean(reviewing)} onClick={() => void reviewContent(selectedContent.id, "REJECT")} className="rounded-xl bg-red-500 px-3 py-2 text-sm font-black text-white disabled:opacity-50">{t("admin.rejectButton")}</button>
                    </div>
                  </div>

                  <ItemEditor initial={toEditorInitial(selectedContent)} mode="admin" readOnly />

                  <div className="rounded-3xl border border-zinc-800 bg-black p-5">
                    <h3 className="text-lg font-black text-white">{t("admin.creatorObservationsTitle")}</h3>
                    <textarea
                      value={reviewComment}
                      onChange={(event) => setReviewComment(event.target.value)}
                      placeholder={t("admin.observationsPlaceholder")}
                      className="mt-3 h-28 w-full rounded-2xl border border-zinc-800 bg-[#111] p-4 text-white outline-none focus:border-yellow-400"
                    />
                    <button
                      disabled={Boolean(reviewing)}
                      onClick={() => void reviewContent(selectedContent.id, "REQUEST_CHANGES")}
                      className="mt-3 rounded-xl bg-orange-400 px-4 py-2 text-sm font-black text-black disabled:opacity-50"
                    >
                      {t("admin.requestChangesButton")}
                    </button>
                  </div>

                  <div className="rounded-3xl border border-zinc-800 bg-black p-5">
                    <h3 className="text-lg font-black text-white">{t("admin.reviewHistoryTitle")}</h3>
                    <div className="mt-3 grid gap-3">
                      {!selectedContent.reviews?.length && (
                        <p className="text-sm text-zinc-500">{t("admin.noCommentsYet")}</p>
                      )}
                      {selectedContent.reviews?.map((review) => (
                        <div key={review.id} className="rounded-2xl border border-zinc-800 bg-[#111] p-4">
                          <p className="text-sm text-zinc-300">{review.message}</p>
                          <p className="mt-2 text-xs text-zinc-500">{review.status} - {new Date(review.createdAt).toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
