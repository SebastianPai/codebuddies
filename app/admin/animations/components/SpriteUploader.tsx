"use client";

import { useState } from "react";
import { useTranslation } from "../../../../src/i18n/useTranslation";

const DIRECTIONS = [
  "NORTH",
  "NORTH_EAST",
  "EAST",
  "SOUTH_EAST",
  "SOUTH",
  "SOUTH_WEST",
  "WEST",
  "NORTH_WEST",
];

export default function SpriteUploader({ animation }: any) {
  const t = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [direction, setDirection] = useState("SOUTH");
  const [frame, setFrame] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);

    const folder = `animations/${animation.type}/${animation.variant}/${direction}`;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", folder);

    const res = await fetch("http://localhost:3001/uploads", {
      method: "POST",
      body: formData,
    });

    const { url } = await res.json();

    // guardar en ItemSprite
    await fetch("http://localhost:3001/item-sprites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        animation: animation.type,
        variant: animation.variant,
        direction,
        frame,
        imageUrl: url,
      }),
    });

    setLoading(false);
    alert(t("animations.uploaded"));
  };

  return (
    <div className="border p-4 rounded-xl mt-6">
      <h3 className="font-semibold mb-2">{t("animations.uploadSprite")}</h3>

      <input
        type="file"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />

      <select
        value={direction}
        onChange={(e) => setDirection(e.target.value)}
        className="border p-2 w-full mt-2"
      >
        {DIRECTIONS.map((d) => (
          <option key={d}>{d}</option>
        ))}
      </select>

      <input
        type="number"
        placeholder={t("animations.frame")}
        value={frame}
        onChange={(e) => setFrame(Number(e.target.value))}
        className="border p-2 w-full mt-2"
      />

      <button
        onClick={handleUpload}
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded-xl mt-3"
      >
        {loading ? t("animations.uploading") : t("animations.upload")}
      </button>
    </div>
  );
}

// UPDATE AnimationEditor to include uploader

// REPLACE its content
