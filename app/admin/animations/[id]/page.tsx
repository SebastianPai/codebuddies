"use client";

import useSWR from "swr";
import { useParams, useRouter } from "next/navigation";
import AnimationForm from "../components/AnimationForm";
import { api } from "@/shared/api/client";
import { useTranslation } from "../../../../src/i18n/useTranslation";

const fetcher = (url: string) => api.get<any>(url);

export default function EditPage() {
  const t = useTranslation();
  const { id } = useParams();
  const router = useRouter();

  const { data, isLoading } = useSWR(`/animations/${id}`, fetcher);

  if (isLoading) return <div className="p-6">{t("common.loading")}</div>;

  const handleUpdate = async (values: any) => {
    await api.patch(`/animations/${id}`, values);

    router.refresh();
  };

  const handleDelete = async () => {
    await api.delete(`/animations/${id}`);

    router.push("/admin/animations");
  };

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">{t("animations.editAnimation")}</h1>
      <AnimationForm initialData={data} onSubmit={handleUpdate} />

      <button onClick={handleDelete} className="mt-4 text-red-500">
        {t("common.delete")}
      </button>
    </div>
  );
}
