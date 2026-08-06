"use client";

import { useRouter } from "next/navigation";
import ItemForm from "../items/components/ItemForm";
import { api } from "@/shared/api/client";
import { useTranslation } from "../../../src/i18n/useTranslation";

export default function CreateTexturePage() {
  const router = useRouter();
  const t = useTranslation();

  async function create(data: any) {
    try {
      await api.post("/items", data);
      router.push("/admin/items");
    } catch (err: any) {
      alert(t("items.createTextureError") + (err.message || t("items.unknownError")));
    }
  }

  return (
    <div className="p-10 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-yellow-400">
          {t("items.createTextureTitle")}
        </h1>
        <p className="text-sm text-zinc-400">
          {t("items.createTextureDescription")}
        </p>
      </div>

      <ItemForm
        initial={{
          formCategory: "texture",
          kind: "FLOOR",
          width: 1,
          height: 1,
          category: "texturas",
          coinsPrice: 100,
          shopVisible: true,
        }}
        onSubmit={create}
      />
    </div>
  );
}
