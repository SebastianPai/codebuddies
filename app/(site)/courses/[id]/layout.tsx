import type { Metadata } from "next";
import { getApiUrl } from "@/config/env";

interface CourseLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

interface CourseMetadataPayload {
  title?: string | null;
  description?: string | null;
  imageUrl?: string | null;
}

async function fetchCourse(id: string): Promise<CourseMetadataPayload | null> {
  try {
    const res = await fetch(`${getApiUrl()}/courses/${id}?lang=es`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return (await res.json()) as CourseMetadataPayload;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: CourseLayoutProps): Promise<Metadata> {
  const { id } = await params;
  const course = await fetchCourse(id);

  if (!course?.title) {
    return { title: "Curso" };
  }

  const description = course.description ?? undefined;
  const images = course.imageUrl ? [course.imageUrl] : undefined;

  return {
    title: course.title,
    description,
    openGraph: {
      title: course.title,
      description,
      type: "website",
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: course.title,
      description,
      images,
    },
  };
}

export default function CourseLayout({ children }: CourseLayoutProps) {
  return children;
}
