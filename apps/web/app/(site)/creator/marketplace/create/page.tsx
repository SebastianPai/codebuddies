"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import ItemEditor from "../../../../../components/item-editor/ItemEditor";
import { api } from "../../../../../utils/api";
import { useTranslation } from "../../../../../src/i18n/useTranslation";

export default function CreatorMarketplaceCreatePage() {
  const router = useRouter();
  const t = useTranslation();

  async function createDraft(data: any) {
    await api.post("/creator/marketplace/contents", data);
    router.push("/creator/marketplace");
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#2b2108,transparent_35%),#050505] px-4 py-8 text-white md:px-8">
      <section className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 rounded-[32px] border border-yellow-400/20 bg-[#101218]/95 p-6 shadow-2xl shadow-black/40 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-yellow-400">
              {t("site.creatorStudio")}
            </p>
            <h1 className="mt-2 text-3xl font-black md:text-5xl">{t("site.createItemTitle")}</h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-400">
              {t("site.createItemDescription")}
            </p>
          </div>
          <Link
            href="/creator/marketplace"
            className="rounded-2xl border border-zinc-700 px-5 py-3 text-sm font-black text-zinc-200 transition hover:border-yellow-400 hover:text-yellow-300"
          >
            {t("site.backToStudio")}
          </Link>
        </div>

        <ItemEditor mode="creator" submitLabel={t("site.createDraftSubmit")} onSubmit={createDraft} />
      </section>
    </main>
  );
}
