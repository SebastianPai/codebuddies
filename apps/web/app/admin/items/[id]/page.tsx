"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ItemForm from "../components/ItemForm";
import { api } from "@/shared/api/client";
import { useTranslation } from "../../../../src/i18n/useTranslation";

export default function EditItemPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const t = useTranslation();
  const [initial, setInitial] = useState<any>(null);

  useEffect(() => {
    async function loadItem() {
      const item = await api.get<any>(`/items/${params.id}`);
      const translation = item.translations?.[0];
      const worldData = item.worldData;
      const formCategory = item.avatarData
        ? "avatar"
        : worldData?.kind === "FLOOR" || worldData?.kind === "WALL"
          ? "texture"
          : "world";

      setInitial({
        ...item,
        ...worldData,
        formCategory,
        slot: item.avatarData?.slot,
        name: translation?.name ?? "",
        description: translation?.description ?? "",
        languageCode: translation?.language?.code ?? "es",
        furnitureCategory: worldData?.category,
      });
    }

    loadItem();
  }, [params.id]);

  async function update(data: any) {
    try {
      await api.patch(`/items/${params.id}`, data);
      router.push("/admin/items");
    } catch (err: any) {
      alert(t("items.updateErrorPrefix") + (err.message || t("items.unknownError")));
    }
  }

  if (!initial) {
    return <div className="p-10 text-zinc-400">{t("items.loadingItem")}</div>;
  }

  return (
    <div className="p-10 space-y-6">
      <h1 className="text-2xl font-bold text-yellow-400">{t("items.editItemTitle")}</h1>
      <ItemForm initial={initial} onSubmit={update} />
    </div>
  );
}
