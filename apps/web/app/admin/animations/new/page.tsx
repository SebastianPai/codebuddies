"use client";

import AnimationForm from "../components/AnimationForm";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { api } from "@/shared/api/client";
import { useTranslation } from "../../../../src/i18n/useTranslation";

export default function NewPage() {
  const t = useTranslation();
  const router = useRouter();

  const handleCreate = async (data: any) => {
    try {
      await api.post("/animations", data);
      router.push("/admin/animations");
    } catch (err: any) {
      toast.error(err?.message || t("animations.saveError"));
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">{t("animations.newAnimation")}</h1>
      <AnimationForm onSubmit={handleCreate} />
    </div>
  );
}
