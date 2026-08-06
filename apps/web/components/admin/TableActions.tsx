// src/components/admin/TableActions.tsx
"use client";

import Link from "next/link";
import { useTranslation } from "../../src/i18n/useTranslation";

interface TableActionsProps {
  id: string;
  type: "module" | "course" | "lesson" | "exercise";
  onDelete: (id: string) => void;
}

export default function TableActions({
  id,
  type,
  onDelete,
}: TableActionsProps) {
  const t = useTranslation();
  const basePath = {
    module: "modules",
    course: "courses",
    lesson: "lessons",
    exercise: "exercises",
  }[type];

  return (
    <div className="flex justify-end gap-2">
      <Link
        href={`/admin/${basePath}/${id}`}
        className="px-3 py-1 bg-yellow-400 text-black rounded text-xs font-bold hover:bg-yellow-500"
        title={t("common.edit")}
      >
        {t("common.edit")}
      </Link>

      <button
        onClick={() => onDelete(id)}
        className="px-3 py-1 bg-red-600 text-white rounded text-xs font-bold hover:bg-red-700"
        title={t("common.delete")}
      >
        {t("common.delete")}
      </button>
    </div>
  );
}
