"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ItemEditor from "../../../../../../components/item-editor/ItemEditor";
import { api } from "../../../../../../utils/api";
import { useTranslation } from "../../../../../../src/i18n/useTranslation";

type CreatorContent = {
  id: string;
  type: "WORLD_ITEM" | "AVATAR_ITEM";
  title: string;
  description: string;
  category: string;
  tags: string[];
  priceCoins: number;
  spriteUrl?: string;
  previewUrl?: string;
  payload?: any;
  status: string;
};

function toEditorInitial(content: CreatorContent) {
  const payload = content.payload ?? {};
  const worldData = payload.worldData ?? {};
  const avatarData = payload.avatarData ?? {};
  const item = payload.item ?? {};

  return {
    ...worldData,
    ...item,
    formCategory: content.type === "AVATAR_ITEM" ? "avatar" : "world",
    type: content.type,
    title: content.title,
    name: content.title,
    description: content.description,
    category: content.category,
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

export default function CreatorMarketplaceEditPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [content, setContent] = useState<CreatorContent | null>(null);
  const [error, setError] = useState("");
  const t = useTranslation();

  useEffect(() => {
    async function load() {
      const contents = await api.get<CreatorContent[]>("/creator/marketplace/contents");
      const selected = contents.find((item) => item.id === params.id);
      if (!selected) {
        setError(t("site.contentNotFoundError"));
        return;
      }
      setContent(selected);
    }

    void load().catch((err) => setError(err.message));
  }, [params.id]);

  async function updateDraft(data: any) {
    await api.patch(`/creator/marketplace/contents/${params.id}`, data);
    router.push("/creator/marketplace");
  }

  if (error) {
    return <main className="min-h-screen bg-black p-10 text-red-200">{error}</main>;
  }

  if (!content) {
    return <main className="min-h-screen bg-black p-10 text-zinc-400">{t("site.loadingEditor")}</main>;
  }

  const editable = ["DRAFT", "CHANGES_REQUESTED"].includes(content.status);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#2b2108,transparent_35%),#050505] px-4 py-8 text-white md:px-8">
      <section className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 rounded-[32px] border border-yellow-400/20 bg-[#101218]/95 p-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-yellow-400">
              {t("site.creatorStudio")}
            </p>
            <h1 className="mt-2 text-3xl font-black md:text-5xl">{t("site.editItemTitle")}</h1>
            <p className="mt-2 text-sm text-zinc-400">{t("site.currentStatusLabel", { status: content.status })}</p>
          </div>
          <Link href="/creator/marketplace" className="rounded-2xl border border-zinc-700 px-5 py-3 text-sm font-black text-zinc-200 hover:border-yellow-400">
            {t("common.back")}
          </Link>
        </div>

        {!editable ? (
          <div className="rounded-3xl border border-zinc-800 bg-[#111] p-8 text-zinc-300">
            {t("site.contentNotEditableMessage")}
          </div>
        ) : (
          <ItemEditor
            initial={toEditorInitial(content)}
            mode="creator"
            submitLabel={t("common.saveChanges")}
            onSubmit={updateDraft}
          />
        )}
      </section>
    </main>
  );
}
