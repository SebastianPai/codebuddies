"use client";

import { useParams } from "next/navigation";
import { ArrowLeft, ExternalLink, Layers, Save } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Loader,
  SuccessState,
  TranslationsForm,
} from "@/shared/ui";
import { normalizeLessonContent } from "@/features/academy";
import { LessonContentEditor } from "./lesson-content-editor";
import { LessonExercisesPanel } from "./lesson-exercises-panel";
import { LessonSettingsFields } from "./lesson-settings-fields";
import { useLessonForm } from "../hooks/use-lesson-form";

interface Props {
  mode: "create" | "edit";
}

export function LessonFormPage({ mode }: Props) {
  const t = useTranslation();
  const { id } = useParams<{ id: string }>();
  const {
    values,
    courses,
    isLoadingCourses,
    isLoadingLesson,
    isSaving,
    error,
    isSuccess,
    isSubmitDisabled,
    updateValues,
    updateLessonType,
    saveLesson,
    goToLessons,
  } = useLessonForm({ mode, lessonId: mode === "edit" ? id : undefined });

  if (isLoadingLesson) {
    return (
      <div className="flex min-h-screen items-center justify-center p-10">
        <Loader label="" size={32} className="text-yellow-400" />
      </div>
    );
  }

  const isCreate = mode === "create";
  const previewCourseId = values.courseId;
  const canPreview = !isCreate && Boolean(id) && Boolean(previewCourseId);

  return (
    <div className="space-y-8 p-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold text-yellow-400">
            <Layers size={28} />
            {isCreate ? t("admin.newLesson") : t("admin.editLesson")}
          </h1>
          <p className="mt-1 text-zinc-400">
            {isCreate
              ? t("admin.lessonCreateDescription")
              : t("admin.lessonEditDescription")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canPreview && (
            <a
              href={`/courses/${previewCourseId}/lessons/${id}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-lg border border-[rgb(var(--border))] px-3 py-2 text-sm text-[rgb(var(--text))] transition hover:bg-[rgb(var(--border)/0.4)]"
            >
              <ExternalLink size={15} />
              {t("admin.lessonContent.previewAsStudent")}
            </a>
          )}
          <Button
            variant="ghost"
            onClick={goToLessons}
            className="flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            {t("common.back")}
          </Button>
        </div>
      </div>

      {isSuccess && (
        <SuccessState
          message={isCreate ? t("admin.lessonCreated") : t("admin.changesSaved")}
        />
      )}
      {error && <ErrorState message={error} />}

      {isCreate && isLoadingCourses ? (
        <div className="flex justify-center py-20">
          <Loader label="" size={32} className="text-yellow-400" />
        </div>
      ) : isCreate && courses.length === 0 ? (
        <EmptyState
          title={t("admin.noCourses")}
          description={t("admin.noCoursesDescription")}
        />
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void saveLesson();
          }}
          className="space-y-8"
        >
          <LessonSettingsFields
            mode={mode}
            courses={courses}
            values={values}
            onChange={updateValues}
            onTypeChange={updateLessonType}
          />
          <Card className="p-6">
            <TranslationsForm
              translations={values.translations}
              onChange={(translations) => updateValues({ translations })}
              showContent
              renderContentField={({ value, onChange }) => (
                <LessonContentEditor
                  value={normalizeLessonContent(value)}
                  onChange={onChange}
                />
              )}
            />
          </Card>
          <div className="flex items-center gap-4">
            <Button
              type="submit"
              disabled={isSubmitDisabled}
              className="flex items-center gap-2 px-6 py-3"
            >
              {isSaving ? (
                <Loader
                  label={
                    isCreate
                      ? t("admin.createLesson") + "..."
                      : t("common.loading")
                  }
                />
              ) : (
                <>
                  <Save size={18} />
                  {isCreate ? t("admin.createLesson") : t("common.saveChanges")}
                </>
              )}
            </Button>
            <Button variant="ghost" onClick={goToLessons}>
              {t("common.cancel")}
            </Button>
          </div>
        </form>
      )}

      {!isCreate && id && <LessonExercisesPanel lessonId={id} />}
    </div>
  );
}
