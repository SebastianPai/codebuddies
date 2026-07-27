"use client";

import useSWR from "swr";
import { useParams, useRouter } from "next/navigation";
import AnimationForm from "../components/AnimationForm";
import { useTranslation } from "../../../../src/i18n/useTranslation";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function EditPage() {
  const t = useTranslation();
  const { id } = useParams();
  const router = useRouter();

  const { data, isLoading } = useSWR(
    `http://localhost:3001/animations/${id}`,
    fetcher,
  );

  if (isLoading) return <div className="p-6">{t("common.loading")}</div>;

  const handleUpdate = async (values: any) => {
    await fetch(`http://localhost:3001/animations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    router.refresh();
  };

  const handleDelete = async () => {
    await fetch(`http://localhost:3001/animations/${id}`, {
      method: "DELETE",
    });

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
