"use client";

import useSWR from "swr";
import Link from "next/link";
import { useTranslation } from "../../../src/i18n/useTranslation";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function Page() {
  const t = useTranslation();
  const { data, isLoading } = useSWR(
    "http://localhost:3001/animations",
    fetcher,
  );

  if (isLoading) return <div className="p-6">{t("animations.loading")}</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{t("animations.title")}</h1>
        <Link
          href="/admin/animations/new"
          className="bg-black text-white px-4 py-2 rounded-xl"
        >
          {t("animations.new")}
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4 mt-6">
        {data?.map((a: any) => (
          <Link
            key={a.id}
            href={`/admin/animations/${a.id}`}
            className="border p-4 rounded-xl"
          >
            <p className="font-semibold">{a.name}</p>
            <p className="text-sm opacity-60">{a.type}</p>
            <p className="text-xs">{a.variant}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
