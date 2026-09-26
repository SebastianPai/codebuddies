import type { Metadata } from "next";
import { getApiUrl } from "@/config/env";

interface ProfileLayoutProps {
  children: React.ReactNode;
  params: Promise<{ username: string }>;
}

interface PublicProfile {
  username: string;
  avatarUrl: string | null;
  level: number;
  coursesCompleted: number;
}

async function fetchProfile(username: string): Promise<PublicProfile | null> {
  try {
    const res = await fetch(
      `${getApiUrl()}/profiles/${encodeURIComponent(username)}`,
      { next: { revalidate: 600 } },
    );
    if (!res.ok) return null;
    return (await res.json()) as PublicProfile;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: ProfileLayoutProps): Promise<Metadata> {
  const { username } = await params;
  const profile = await fetchProfile(decodeURIComponent(username));
  if (!profile) return { title: "Perfil", robots: { index: false } };

  const title = `@${profile.username}`;
  const description = `Nivel ${profile.level} · ${profile.coursesCompleted} cursos completados en CodeBuddies.`;
  const images = profile.avatarUrl ? [profile.avatarUrl] : undefined;
  return {
    title,
    description,
    openGraph: { title, description, type: "profile", images },
    twitter: { card: "summary", title, description, images },
  };
}

export default function ProfileLayout({ children }: ProfileLayoutProps) {
  return children;
}
