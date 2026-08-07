"use client";

import { useEffect, useState } from "react";
import { api } from "../../../utils/api";
import Link from "next/link";
import { Plus } from "lucide-react";
import { toast } from "react-toastify";
import { DataTable, ResourceTableActions, useConfirm } from "@/shared/ui";
import { useTranslation } from "../../../src/i18n/useTranslation";

interface Exercise {
  id: string;
  title: string;
  type: string;
  experience: number;

  lessonTitle: string;
  courseTitle: string;
}

export default function ExercisesAdminPage() {
  const t = useTranslation();
  const { confirm, ConfirmDialog } = useConfirm();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchExercises = async () => {
    try {
      const data = await api.get<Exercise[]>("/exercises/admin?lang=es");
      setExercises(data);
    } catch (error) {
      console.error("Error cargando ejercicios:", error);
      setExercises([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExercises();
  }, []);

  const deleteExercise = async (id: string) => {
    if (!(await confirm(t("admin.confirmDeleteExercise")))) return;

    try {
      await api.delete(`/exercises/${id}`);
      setExercises((prev) => prev.filter((e) => e.id !== id));
    } catch (error) {
      console.error(error);
      toast.error(t("admin.deleteExerciseError"));
    }
  };

  if (loading)
    return <div className="p-10 text-white">{t("admin.loadingExercises")}</div>;

  const tableData = exercises.map((ex) => ({
    id: ex.id,
    title: ex.title,
    lesson: ex.lessonTitle,
    course: ex.courseTitle,
    type: ex.type,
    xp: ex.experience,
  }));

  return (
    <div className="p-10 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-4xl font-black text-yellow-400">{t("admin.exercises")}</h1>

        <Link
          href="/admin/exercises/new"
          className="flex items-center gap-2 bg-yellow-400 text-black px-4 py-2 font-bold rounded-md hover:bg-yellow-500"
        >
          <Plus size={18} /> {t("admin.newExerciseLink")}
        </Link>
      </div>

      <DataTable
        columns={[
          {
            label: t("admin.exerciseColumn"),
            key: "title",
            sortable: true,
            render: (row) => (
              <div className="flex flex-col">
                {/* Título */}
                <span className="font-medium">{row.title}</span>
              </div>
            ),
          },

          {
            label: t("admin.lessonCourseColumn"),
            key: "lesson",
            sortable: true,
            render: (row) => (
              <div className="flex flex-col">
                {/* Lección */}
                <span className="font-medium">{row.lesson}</span>

                {/* Curso */}
                <span className="text-xs text-zinc-400">{row.course}</span>
              </div>
            ),
          },

          {
            label: t("items.type"),
            key: "type",
            sortable: true,
          },

          {
            label: "XP",
            key: "xp",
            sortable: true,
          },

          {
            label: t("admin.actions"),
            key: "actions",
            render: (row) => (
              <ResourceTableActions
                editHref={`/admin/exercises/${row.id}`}
                onDelete={() => deleteExercise(row.id)}
              />
            ),
          },
        ]}
        data={tableData}
        defaultRowsPerPage={10}
        rowsPerPageOptions={[10, 20, 30, 40]}
      />
      {ConfirmDialog}
    </div>
  );
}
