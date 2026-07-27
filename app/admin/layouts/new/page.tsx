"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import LayoutCompositionEditor from "../../../../components/layout-composition/LayoutCompositionEditor";
import { useTranslation } from "../../../../src/i18n/useTranslation";

export default function NewLayoutPage() {
  const router = useRouter();
  const t = useTranslation();

  const [name, setName] = useState("");
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

  // Subir imagen a /uploads (igual que en ItemForm)
  const uploadImage = async (): Promise<string | null> => {
    if (!file) return null;

    const form = new FormData();
    form.append("file", file);
    form.append("folder", "layouts"); // ← carpeta en Digital Ocean

    const res = await fetch("http://localhost:3001/uploads", {
      method: "POST",
      body: form,
    });

    if (!res.ok) {
      throw new Error(t("items.imageUploadError"));
    }

    const data = await res.json();
    return data.url;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !json) {
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

      const res = await fetch("http://localhost:3001/layouts", {
        // ← Cambié a 3001 para que coincida con tu Items
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          previewImageUrl: finalPreviewUrl,
          layoutJson: JSON.parse(json),
          width: 10,
          height: 10,
          tileSize: 64,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || t("admin.createLayoutError"));
      }

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
          {/* Nombre */}
          <div>
            <label className="text-sm text-zinc-400 block mb-2">
              {t("admin.layoutNameFieldLabel")}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("admin.layoutNamePlaceholder")}
              className="bg-[#111] border border-zinc-700 focus:border-yellow-400 w-full p-4 rounded-xl text-white placeholder-zinc-500"
              required
            />
          </div>

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
