// ./components/CommonFields.tsx   (o la ruta que uses)

import { ChangeEvent } from "react";
import { useTranslation } from "../../../../../src/i18n/useTranslation";

interface CommonFieldsProps {
  type: "CODE" | "QUIZ" | "VIDEO_THEORY" | "LIVE";
  experience: number;
  coins: number;
  order: number | "";
  lessonId: string;
  lessons: { id: string; title: string }[];
  onChangeType: (e: ChangeEvent<HTMLSelectElement>) => void;
  onChangeExperience: (e: ChangeEvent<HTMLInputElement>) => void;
  onChangeCoins: (e: ChangeEvent<HTMLInputElement>) => void;
  onChangeOrder: (e: ChangeEvent<HTMLInputElement>) => void;
  onChangeLesson: (e: ChangeEvent<HTMLSelectElement>) => void;
}

export default function CommonFields({
  type,
  experience,
  coins,
  order,
  lessonId,
  lessons,
  onChangeType,
  onChangeExperience,
  onChangeCoins,
  onChangeOrder,
  onChangeLesson,
}: CommonFieldsProps) {
  const t = useTranslation();
  return (
    <div className="space-y-8 bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
      {/* Selector de Lección */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          {t("admin.lessonFieldLabel")}
        </label>
        <select
          value={lessonId}
          onChange={onChangeLesson}
          className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        >
          <option value="" disabled>
            {t("admin.selectLessonOption")}
          </option>
          {lessons.map((lesson) => (
            <option key={lesson.id} value={lesson.id}>
              {lesson.title}
            </option>
          ))}
        </select>
      </div>

      {/* Tipo de ejercicio */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          {t("admin.exerciseTypeFieldLabel")}
        </label>
        <select
          value={type}
          onChange={onChangeType}
          className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="CODE">{t("admin.codeTypeOption")}</option>
          <option value="QUIZ">{t("admin.quizTypeOption")}</option>
          <option value="VIDEO_THEORY">{t("admin.videoTheoryTypeOption")}</option>
          <option value="LIVE">{t("admin.liveSessionTypeOption")}</option>
        </select>
      </div>

      {/* Valores numéricos en grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            {t("admin.experience")}
          </label>
          <input
            type="number"
            value={experience}
            onChange={onChangeExperience}
            min={0}
            className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            {t("admin.coinsFieldLabel")}
          </label>
          <input
            type="number"
            value={coins}
            onChange={onChangeCoins}
            min={0}
            className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            {t("admin.orderOptionalLabel")}
          </label>
          <input
            type="number"
            value={order}
            onChange={onChangeOrder}
            min={1}
            placeholder={t("admin.autoIfEmptyPlaceholder")}
            className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>
  );
}
