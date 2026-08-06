"use client";

import AnimationPreview from "./AnimationPreview";
import { useTranslation } from "../../../../src/i18n/useTranslation";

export default function AnimationEditor({ animation }: any) {
  const t = useTranslation();
  return (
    <div>
      <h2 className="text-lg font-semibold">{t("animations.preview")}</h2>
      <AnimationPreview sprites={animation?.sprites} />
    </div>
  );
}
