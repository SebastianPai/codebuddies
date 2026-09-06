import type { Metadata } from "next";
import { getApiUrl } from "@/config/env";

interface LessonLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string; lessonId: string }>;
}

interface LessonMetadataPayload {
  title?: string | null;
  description?: string | null;
}

async function fetchLesson(
  lessonId: string,
): Promise<LessonMetadataPayload | null> {
  try {
    const res = await fetch(
      `${getApiUrl()}/lessons/${lessonId}?lang=es`,
      { next: { revalidate: 300 } },
    );
    if (!res.ok) return null;
    return (await res.json()) as LessonMetadataPayload;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: LessonLayoutProps): Promise<Metadata> {
  const { lessonId } = await params;
  const lesson = await fetchLesson(lessonId);

  if (!lesson?.title) {
    return { title: "Lección" };
  }

  return {
    title: lesson.title,
    description: lesson.description ?? undefined,
  };
}

export default function LessonLayout({ children }: LessonLayoutProps) {
  return children;
}
