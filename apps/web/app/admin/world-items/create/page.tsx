"use client";

import Link from "next/link";
import { useTranslation } from "../../../../src/i18n/useTranslation";

export default function CreateWorldItemPage() {
  const t = useTranslation();
  return (
    <div className="p-10 space-y-6 text-white">
      <div>
        <h1 className="text-3xl font-bold text-yellow-400">
          {t("items.createWorldItemTitle")}
        </h1>
        <p className="mt-2 max-w-2xl text-zinc-400">
          {t("items.createWorldItemDescription")}
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/admin/items/create"
          className="rounded bg-yellow-400 px-4 py-3 font-bold text-black"
        >
          {t("items.createBaseItemLink")}
        </Link>
        <Link
          href="/admin/world-items"
          className="rounded border border-zinc-700 px-4 py-3 font-bold"
        >
          {t("items.backToWorldItems")}
        </Link>
      </div>
    </div>
  );
}
