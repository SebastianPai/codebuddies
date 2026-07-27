"use client";

import { useEffect, useState } from "react";
import { Award, BadgeCheck, Search, Upload, X } from "lucide-react";
import { toast } from "react-toastify";
import { api } from "../../../utils/api";

type BadgeType = "VERIFIED" | "CREATOR";

type BadgeConfig = {
  VERIFIED: { iconUrl: string | null };
  CREATOR: { iconUrl: string | null };
};

type Creator = {
  userId: string;
  username: string;
  avatarUrl: string | null;
  status: string;
  verified: boolean;
  publishedCount: number;
};

const BADGE_META: Record<BadgeType, { title: string; hint: string; defaultColor: string; DefaultIcon: typeof BadgeCheck }> = {
  VERIFIED: {
    title: "Verificado",
    hint: "Lo activa un admin por usuario, abajo en la lista de creadores.",
    defaultColor: "#3b82f6",
    DefaultIcon: BadgeCheck,
  },
  CREATOR: {
    title: "Creador",
    hint: "Automático: se activa solo cuando el usuario publica su primer objeto en el Marketplace.",
    defaultColor: "#facc15",
    DefaultIcon: Award,
  },
};

export default function AdminBadgesPage() {
  const [config, setConfig] = useState<BadgeConfig | null>(null);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<BadgeType | null>(null);
  const [search, setSearch] = useState("");
  const [savingUserId, setSavingUserId] = useState<string | null>(null);

  const load = async () => {
    const [configData, creatorsData] = await Promise.all([
      api.get<BadgeConfig>("/admin/badges/config"),
      api.get<Creator[]>("/admin/badges/creators"),
    ]);
    setConfig(configData);
    setCreators(creatorsData);
  };

  useEffect(() => {
    setLoading(true);
    void load()
      .catch(() => toast.error("No se pudieron cargar las insignias"))
      .finally(() => setLoading(false));
  }, []);

  const uploadIcon = async (type: BadgeType, file: File) => {
    setUploading(type);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("folder", "badges");
      const { url } = await api.post<{ url: string }>("/uploads", form);
      const updated = await api.patch<BadgeConfig>(`/admin/badges/config/${type}`, { iconUrl: url });
      setConfig(updated);
      toast.success("Ícono actualizado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo subir la imagen");
    } finally {
      setUploading(null);
    }
  };

  const resetIcon = async (type: BadgeType) => {
    const updated = await api.patch<BadgeConfig>(`/admin/badges/config/${type}`, { iconUrl: null });
    setConfig(updated);
    toast.success("Se restableció el ícono por defecto");
  };

  const toggleVerified = async (creator: Creator) => {
    setSavingUserId(creator.userId);
    try {
      await api.patch(`/admin/badges/creators/${creator.userId}/verified`, {
        verified: !creator.verified,
      });
      setCreators((current) =>
        current.map((entry) =>
          entry.userId === creator.userId ? { ...entry, verified: !entry.verified } : entry,
        ),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo actualizar");
    } finally {
      setSavingUserId(null);
    }
  };

  const filteredCreators = creators.filter((creator) =>
    creator.username.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <div className="p-6 text-white">
      <div>
        <h1 className="text-3xl font-black text-yellow-400">Insignias</h1>
        <p className="mt-1 text-sm text-zinc-400">
          El ícono de verificado y de creador que aparece junto al nombre de un usuario en todo el juego. Podés dejar el
          ícono por defecto o subir una imagen propia — se muestra reducida al tamaño real junto a un nombre de ejemplo.
        </p>
      </div>

      {loading || !config ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {[0, 1].map((index) => (
            <div key={index} className="h-64 animate-pulse rounded-xl border border-zinc-800 bg-zinc-900" />
          ))}
        </div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {(Object.keys(BADGE_META) as BadgeType[]).map((type) => (
            <BadgeCard
              key={type}
              type={type}
              iconUrl={config[type].iconUrl}
              uploading={uploading === type}
              onUpload={(file) => void uploadIcon(type, file)}
              onReset={() => void resetIcon(type)}
            />
          ))}
        </div>
      )}

      <div className="mt-8 rounded-xl border border-zinc-800 bg-[#0c0c0c] p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-black">Creadores</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Activá el verificado a mano por usuario. El de creador se calcula solo (1+ objetos publicados).
            </p>
          </div>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-3 text-zinc-500" size={16} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar creador..."
              className="w-full rounded-md border border-zinc-800 bg-[#111] py-2 pl-9 pr-3 text-sm"
            />
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-zinc-500">
                <th className="pb-3">Usuario</th>
                <th className="pb-3">Estado</th>
                <th className="pb-3">Objetos publicados</th>
                <th className="pb-3">Verificado</th>
              </tr>
            </thead>
            <tbody>
              {!loading && filteredCreators.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-zinc-500">
                    No hay creadores que coincidan.
                  </td>
                </tr>
              )}
              {filteredCreators.map((creator) => (
                <tr key={creator.userId} className="border-t border-zinc-900">
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      {creator.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={creator.avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover" />
                      ) : (
                        <div className="h-7 w-7 rounded-full bg-zinc-800" />
                      )}
                      <span className="flex items-center gap-1 font-bold">
                        {creator.username}
                        {creator.publishedCount > 0 && <Award size={14} color={BADGE_META.CREATOR.defaultColor} />}
                        {creator.verified && <BadgeCheck size={14} color={BADGE_META.VERIFIED.defaultColor} />}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 text-zinc-400">{creator.status}</td>
                  <td className="py-3 text-zinc-400">{creator.publishedCount}</td>
                  <td className="py-3">
                    <button
                      type="button"
                      disabled={savingUserId === creator.userId}
                      onClick={() => void toggleVerified(creator)}
                      className={`inline-flex h-7 w-12 items-center rounded-full transition disabled:opacity-50 ${
                        creator.verified ? "justify-end bg-blue-500" : "justify-start bg-zinc-700"
                      } px-1`}
                    >
                      <span className="h-5 w-5 rounded-full bg-white" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function BadgeCard({
  type,
  iconUrl,
  uploading,
  onUpload,
  onReset,
}: {
  type: BadgeType;
  iconUrl: string | null;
  uploading: boolean;
  onUpload: (file: File) => void;
  onReset: () => void;
}) {
  const meta = BADGE_META[type];

  return (
    <div className="rounded-xl border border-zinc-800 bg-[#0c0c0c] p-5">
      <h2 className="text-xl font-black">{meta.title}</h2>
      <p className="mt-1 text-xs text-zinc-500">{meta.hint}</p>

      <div className="mt-4 rounded-lg border border-zinc-800 bg-black p-4">
        <span className="mb-2 block text-xs uppercase tracking-wide text-zinc-500">Así se ve junto al nombre</span>
        <div className="flex items-center gap-1.5 text-base font-bold text-white">
          <span>NombreDeJugador</span>
          <BadgePreviewIcon iconUrl={iconUrl} DefaultIcon={meta.DefaultIcon} color={meta.defaultColor} />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-zinc-700 bg-[#111]">
          {iconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={iconUrl} alt={meta.title} className="h-12 w-12 rounded object-contain" />
          ) : (
            <meta.DefaultIcon size={28} color={meta.defaultColor} />
          )}
        </div>

        <div className="flex-1">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-yellow-400 px-3 py-2 text-sm font-bold text-black">
            <Upload size={14} />
            {uploading ? "Subiendo..." : iconUrl ? "Reemplazar imagen" : "Subir imagen"}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              disabled={uploading}
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) onUpload(file);
                event.target.value = "";
              }}
            />
          </label>

          {iconUrl && (
            <button
              type="button"
              onClick={onReset}
              className="ml-2 inline-flex items-center gap-1 rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-300"
            >
              <X size={14} />
              Usar ícono por defecto
            </button>
          )}

          <p className="mt-2 text-xs text-zinc-500">La imagen se reduce automáticamente al tamaño de la insignia.</p>
        </div>
      </div>
    </div>
  );
}

function BadgePreviewIcon({
  iconUrl,
  DefaultIcon,
  color,
}: {
  iconUrl: string | null;
  DefaultIcon: typeof BadgeCheck;
  color: string;
}) {
  if (iconUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={iconUrl} alt="" className="h-4 w-4 rounded-sm object-contain" />;
  }
  return <DefaultIcon size={16} color={color} />;
}
