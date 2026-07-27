"use client";

import { useState } from "react";
import { useTranslation } from "../../../../src/i18n/useTranslation";

const TYPES = ["IDLE", "WALK", "RUN", "SIT", "WAVE", "DANCE", "ATTACK"];

export default function AnimationForm({ initialData, onSubmit }: any) {
  const t = useTranslation();
  const [form, setForm] = useState(
    initialData || {
      name: "",
      type: "RUN",
      variant: "default",
      speed: 100,
      loop: true,
    },
  );

  const handleChange = (key: string, value: any) => {
    setForm({ ...form, [key]: value });
  };

  return (
    <div className="space-y-4">
      <input
        placeholder={t("animations.name")}
        value={form.name}
        onChange={(e) => handleChange("name", e.target.value)}
        className="border p-2 w-full"
      />

      <select
        value={form.type}
        onChange={(e) => handleChange("type", e.target.value)}
        className="border p-2 w-full"
      >
        {TYPES.map((t) => (
          <option key={t}>{t}</option>
        ))}
      </select>

      <input
        placeholder={t("animations.variant")}
        value={form.variant}
        onChange={(e) => handleChange("variant", e.target.value)}
        className="border p-2 w-full"
      />

      <input
        type="number"
        placeholder={t("animations.speed")}
        value={form.speed}
        onChange={(e) => handleChange("speed", Number(e.target.value))}
        className="border p-2 w-full"
      />

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={form.loop}
          onChange={(e) => handleChange("loop", e.target.checked)}
        />
        {t("animations.loop")}
      </label>

      <button
        onClick={() => onSubmit(form)}
        className="bg-black text-white px-4 py-2 rounded-xl"
      >
        {t("animations.save")}
      </button>
    </div>
  );
}
