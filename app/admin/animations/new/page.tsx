"use client";

import AnimationForm from "../components/AnimationForm";
import { useRouter } from "next/navigation";
import { useTranslation } from "../../../../src/i18n/useTranslation";

export default function NewPage() {
  const t = useTranslation();
  const router = useRouter();

  const handleCreate = async (data: any) => {
    await fetch("http://localhost:3001/animations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    router.push("/admin/animations");
  };

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">{t("animations.newAnimation")}</h1>
      <AnimationForm onSubmit={handleCreate} />
    </div>
  );
}
