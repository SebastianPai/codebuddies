"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import LayoutCompositionEditor from "../../../../components/layout-composition/LayoutCompositionEditor";
import { api } from "@/shared/api/client";
import { TranslationsForm, type Translation } from "@/shared/ui";
import { useTranslation } from "../../../../src/i18n/useTranslation";

const INITIAL_TRANSLATIONS: Translation[] = [
  { languageCode: "es", title: "", description: "" },
];

export default function NewLayoutPage() {
  const router = useRouter();
  const t = useTranslation();

  const [translations, setTranslations] = useState<Translation[]>(
    INITIAL_TRANSLATIONS,
  );
  const [json, setJson] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manejo de archivo (drag & drop + click)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type.startsWith("image/")) {
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
    } else if (selectedFile) {
      alert(t("admin.onlyImagesAllowed"));
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type.startsWith("image/")) {
      setFile(droppedFile);
      setPreviewUrl(URL.createObjectURL(droppedFile));
    } else {
      alert(t("admin.onlyImagesAllowed"));
    }
  };

  const triggerFileInput = () => fileInputRef.current?.click();

  // Subir el .json exportado de Tiled directamente en vez de tener que
  // copiar/pegar el texto a mano en el textarea (que para un mapa real
  // termina siendo miles de líneas).
  const handleJsonFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    e.target.value = ""; // permite volver a elegir el mismo archivo después
    if (!selectedFile) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      try {
        JSON.parse(text);
        setJson(text);
      } catch {
        alert(t("admin.invalidJsonFallbackError"));
      }
    };
    reader.onerror = () => alert(t("admin.invalidJsonFallbackError"));
    reader.readAsText(selectedFile);
  };

  // Subir imagen a /uploads (igual que en ItemForm)
  const uploadImage = async (): Promise<string | null> => {
    if (!file) return null;

    const form = new FormData();
    form.append("file", file);
    form.append("folder", "layouts"); // ← carpeta en Digital Ocean

    const data = await api.post<{ url: string }>("/uploads", form);
    return data.url;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const baseName = translations.find((tr) => tr.languageCode === "es")?.title;
    if (!baseName || !json) {
      alert(t("admin.nameJsonLayoutRequired"));
      return;
    }

    setLoading(true);

    try {
      let finalPreviewUrl = previewUrl; // si ya tenía una URL

      // Subir imagen si el usuario seleccionó una nueva
      if (file) {
        finalPreviewUrl = await uploadImage();
      }

      await api.post("/layouts", {
        translations: translations.map((tr) => ({
          languageCode: tr.languageCode,
          name: tr.title,
          description: tr.description,
        })),
        previewImageUrl: finalPreviewUrl,
        layoutJson: JSON.parse(json),
        width: 10,
        height: 10,
        tileSize: 64,
      });

      alert(t("admin.layoutCreatedSuccess"));
      router.push("/admin/layouts");
    } catch (err: any) {
      console.error(err);
      alert(err.message || t("admin.invalidJsonFallbackError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-10 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-yellow-400 mb-8">
        {t("admin.createNewLayoutTitle")}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="bg-[#0c0c0c] p-8 rounded-2xl border border-zinc-800 space-y-8">
          {/* Nombre + traducciones */}
          <TranslationsForm translations={translations} onChange={setTranslations} />

          {/* Subida de Imagen Preview (igual estilo que Items) */}
          <div>
            <label className="text-sm text-zinc-400 block mb-2">
              {t("admin.previewImageLabel")}
            </label>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={triggerFileInput}
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all min-h-[200px]
                ${
                  isDragging
                    ? "border-yellow-400 bg-yellow-900/20"
                    : "border-zinc-700 hover:border-yellow-500 bg-[#0f0f0f]"
                }`}
            >
              {previewUrl ? (
                <div>
                  <img
                    src={previewUrl}
                    alt={t("items.previewAlt")}
                    className="max-h-60 mx-auto object-contain rounded mb-4"
                  />
                  <p className="text-zinc-400 text-sm">
                    {t("admin.clickOrDragToChange")}
                  </p>
                </div>
              ) : (
                <div className="py-8">
                  <p className="text-zinc-400 mb-2">{t("admin.dragImageHere")}</p>
                  <p className="text-zinc-500 text-sm">
                    {t("admin.orClickToSelect")}
                  </p>
                  <p className="text-xs text-zinc-600 mt-3">{t("admin.pngJpgWebp")}</p>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>

          {/* JSON */}
          <div>
            <label className="text-sm text-zinc-400 block mb-2">
              {t("admin.layoutJsonLabel")}
            </label>
            <label className="mb-3 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-700 bg-[#111] px-4 py-2 text-sm text-zinc-300 hover:border-yellow-500 hover:text-yellow-400">
              {t("admin.uploadJsonFileButton")}
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleJsonFileChange}
                className="hidden"
              />
            </label>
            <textarea
              value={json}
              onChange={(e) => setJson(e.target.value)}
              placeholder='{\n  "tiles": [...]\n}'
              rows={16}
              className="bg-[#111] border border-zinc-700 focus:border-yellow-400 w-full p-5 rounded-xl font-mono text-sm text-zinc-300"
              required
            />
            <p className="text-xs text-zinc-500 mt-2">
              {t("admin.pasteJsonHelper")}
            </p>
          </div>

          <LayoutCompositionEditor
            json={json}
            onJsonChange={setJson}
            backgroundUrl={previewUrl ?? undefined}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-yellow-400 hover:bg-yellow-300 disabled:bg-yellow-600 text-black font-bold py-4 rounded-2xl text-lg transition"
        >
          {loading ? t("admin.uploadingCreatingLayout") : t("admin.createLayoutButton")}
        </button>
      </form>
    </div>
  );
}
