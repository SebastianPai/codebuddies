"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import LayoutCompositionEditor from "../../../../components/layout-composition/LayoutCompositionEditor";
import { api } from "@/shared/api/client";
import { useTranslation } from "../../../../src/i18n/useTranslation";

export default function EditLayoutPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const t = useTranslation();

  const [name, setName] = useState("");
  const [previewImageUrl, setPreviewImageUrl] = useState("");
  const [json, setJson] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api
      .get<{ name?: string; previewImageUrl?: string; layoutJson: unknown }>(`/layouts/${id}`)
      .then((data) => {
        setName(data.name || "");
        setPreviewImageUrl(data.previewImageUrl || "");
        setJson(JSON.stringify(data.layoutJson, null, 2));
      })
      .catch(console.error);
  }, [id]);

  const handleUpdate = async () => {
    if (!name || !json) {
      alert(t("admin.nameAndJsonRequired"));
      return;
    }

    setLoading(true);

    try {
      await api.patch(`/layouts/${id}`, {
        name,
        previewImageUrl,
        layoutJson: JSON.parse(json),
      });

      alert(t("admin.layoutUpdatedSuccess"));
      router.push("/admin/layouts");
    } catch (err) {
      console.error(err);
      alert(t("admin.updateLayoutError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-10 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-yellow-400">{t("admin.editLayoutTitle")}</h1>
        <button
          onClick={() => router.push("/admin/layouts")}
          className="text-zinc-400 hover:text-white"
        >
          {t("admin.backArrowButton")}
        </button>
      </div>

      <div className="bg-[#0c0c0c] p-8 rounded-2xl border border-zinc-800 space-y-6">
        <div>
          <label className="text-sm text-zinc-400 block mb-2">{t("items.name")}</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-[#111] border border-zinc-700 focus:border-yellow-400 w-full p-4 rounded-xl"
          />
        </div>

        <div>
          <label className="text-sm text-zinc-400 block mb-2">
            {t("admin.previewImageUrlLabel")}
          </label>
          <input
            type="text"
            value={previewImageUrl}
            onChange={(e) => setPreviewImageUrl(e.target.value)}
            className="bg-[#111] border border-zinc-700 focus:border-yellow-400 w-full p-4 rounded-xl"
          />
        </div>

        <div>
          <label className="text-sm text-zinc-400 block mb-2">
            {t("admin.layoutJsonLabel")}
          </label>
          <textarea
            value={json}
            onChange={(e) => setJson(e.target.value)}
            rows={18}
            className="bg-[#111] border border-zinc-700 focus:border-yellow-400 w-full p-5 rounded-xl font-mono text-sm"
          />
        </div>

        <LayoutCompositionEditor
          json={json}
          onJsonChange={setJson}
          backgroundUrl={previewImageUrl}
        />
      </div>

      <div className="flex gap-4 mt-8">
        <button
          onClick={handleUpdate}
          disabled={loading}
          className="flex-1 bg-yellow-400 hover:bg-yellow-300 text-black font-bold py-4 rounded-2xl transition disabled:opacity-70"
        >
          {loading ? t("admin.savingEllipsis") : t("common.saveChanges")}
        </button>

        <button
          onClick={() => router.push("/admin/layouts")}
          className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-4 rounded-2xl transition"
        >
          {t("common.cancel")}
        </button>
      </div>
    </div>
  );
}
