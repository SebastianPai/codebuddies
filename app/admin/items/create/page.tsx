"use client";

import { useRouter } from "next/navigation";
import ItemForm from "../components/ItemForm";
import { useTranslation } from "../../../../src/i18n/useTranslation";

export default function CreateItemPage() {
  const router = useRouter();
  const t = useTranslation();

  async function create(data: any) {
    try {
      const res = await fetch("http://localhost:3001/items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(t("items.createErrorPrefix") + (err.message || t("items.unknownError")));
        return;
      }

      router.push("/admin/items");
    } catch (err) {
      console.error(err);
      alert(t("items.connectionError"));
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
