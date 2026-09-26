import type { Metadata } from "next";
import { getApiUrl } from "@/config/env";

interface PathLayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

interface PathMetadataPayload {
  title: string | null;
  description: string | null;
  imageUrl: string | null;
}

async function fetchPath(slug: string): Promise<PathMetadataPayload | null> {
  try {
    const res = await fetch(
      `${getApiUrl()}/learning-paths/${encodeURIComponent(slug)}?lang=es`,
      { next: { revalidate: 600 } },
    );
    if (!res.ok) return null;
    return (await res.json()) as PathMetadataPayload;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: PathLayoutProps): Promise<Metadata> {
  const { slug } = await params;
  const path = await fetchPath(slug);
  if (!path?.title) return { title: "Ruta de aprendizaje" };

  const description = path.description ?? undefined;
  const images = path.imageUrl ? [path.imageUrl] : undefined;
  return {
    title: path.title,
    description,
    openGraph: { title: path.title, description, type: "website", images },
    twitter: { card: "summary_large_image", title: path.title, description, images },
  };
}

export default function PathLayout({ children }: PathLayoutProps) {
  return children;
}
