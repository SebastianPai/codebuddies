"use client";

import { useRouter } from "next/navigation";
import ItemForm from "../components/ItemForm";
import { api } from "@/shared/api/client";
import { useTranslation } from "../../../../src/i18n/useTranslation";

export default function CreateItemPage() {
  const router = useRouter();
  const t = useTranslation();

  async function create(data: any) {
    try {
      const item = await api.post<{ id: string; avatarData?: unknown }>("/items", data);
      // Los items de avatar necesitan su sprite animado, que se configura
      // en el editor dedicado (no acá, para no duplicar ese flujo).
      router.push(item.avatarData ? `/admin/item-sprites?itemId=${item.id}` : "/admin/items");
    } catch (err: any) {
      console.error(err);
      alert(t("items.createErrorPrefix") + (err.message || t("items.unknownError")));
    }
  }

  return (
    <div className="p-10 space-y-6">
      <h1 className="text-2xl font-bold text-yellow-400">
        {t("items.createItemAvatarTitle")}
      </h1>
      <ItemForm onSubmit={create} />
    </div>
  );
}
