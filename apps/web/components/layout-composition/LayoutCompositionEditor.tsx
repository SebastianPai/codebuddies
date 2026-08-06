"use client";
import { useTranslation } from "../../src/i18n/useTranslation";

type LayoutCompositionEditorProps = {
  json: string;
  onJsonChange: (value: string) => void;
  backgroundUrl?: string;
};

type CompositionConfig = {
  layoutAnchor?: { x?: number; y?: number };
  cameraAnchor?: { x?: number; y?: number };
  safeArea?: { x?: number; y?: number; width?: number; height?: number };
  compatibleBackgroundIds?: string[];
};

function parseJson(json: string) {
  try {
    const parsed = JSON.parse(json || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return null;
  }
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

export default function LayoutCompositionEditor({
  json,
  onJsonChange,
  backgroundUrl,
}: LayoutCompositionEditorProps) {
  const t = useTranslation();
  const layoutJson = parseJson(json);
  const config = ((layoutJson as any)?.__codebuddies ?? {}) as CompositionConfig;
  const invalid = layoutJson === null;

  const updateConfig = (patch: Partial<CompositionConfig>) => {
    const current = parseJson(json);
    if (!current) return;
    const next = {
      ...current,
      __codebuddies: {
        ...(current as any).__codebuddies,
        ...patch,
      },
    };
    onJsonChange(JSON.stringify(next, null, 2));
  };

  const updatePoint = (
    key: "layoutAnchor" | "cameraAnchor",
    axis: "x" | "y",
    value: number,
  ) => {
    updateConfig({
      [key]: {
        x: Number(config[key]?.x ?? 0),
        y: Number(config[key]?.y ?? 0),
        [axis]: value,
      },
    });
  };

  const updateSafeArea = (
    key: "x" | "y" | "width" | "height",
    value: number,
  ) => {
    updateConfig({
      safeArea: {
        x: Number(config.safeArea?.x ?? 25),
        y: Number(config.safeArea?.y ?? 25),
        width: Number(config.safeArea?.width ?? 50),
        height: Number(config.safeArea?.height ?? 50),
        [key]: value,
      },
    });
  };

  const layoutAnchor = {
    x: Number(config.layoutAnchor?.x ?? 0),
    y: Number(config.layoutAnchor?.y ?? 0),
  };
  const cameraAnchor = {
    x: Number(config.cameraAnchor?.x ?? 0),
    y: Number(config.cameraAnchor?.y ?? 0),
  };
  const safeArea = {
    x: Number(config.safeArea?.x ?? 25),
    y: Number(config.safeArea?.y ?? 25),
    width: Number(config.safeArea?.width ?? 50),
    height: Number(config.safeArea?.height ?? 50),
  };

  return (
    <section className="rounded-2xl border border-yellow-400/20 bg-[#0c0c0c] p-5 text-white">
      <div>
        <h2 className="text-xl font-black text-yellow-400">{t("editor.compositionTitle")}</h2>
        <p className="mt-1 text-sm text-zinc-400">
          {t("editor.compositionDescriptionBefore")} <code>layoutJson.__codebuddies</code> {t("editor.compositionDescriptionAfter")}
          {t("editor.compositionDefault")}
        </p>
      </div>

      {invalid ? (
        <div className="mt-4 rounded-xl border border-red-900 bg-red-950/40 p-4 text-sm text-red-100">
          {t("editor.invalidLayoutJson")}
        </div>
      ) : (
        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_280px]">
          <div className="space-y-5">
            <AnchorField
              title={t("editor.layoutAnchor")}
              description={t("editor.layoutAnchorDescription")}
              x={layoutAnchor.x}
              y={layoutAnchor.y}
              onX={(value) => updatePoint("layoutAnchor", "x", value)}
              onY={(value) => updatePoint("layoutAnchor", "y", value)}
            />
            <AnchorField
              title={t("editor.cameraAnchor")}
              description={t("editor.cameraAnchorDescription")}
              x={cameraAnchor.x}
              y={cameraAnchor.y}
              onX={(value) => updatePoint("cameraAnchor", "x", value)}
              onY={(value) => updatePoint("cameraAnchor", "y", value)}
            />

            <div className="rounded-xl border border-zinc-800 bg-black/40 p-4">
              <h3 className="font-black">{t("editor.safeArea")}</h3>
              <p className="mt-1 text-xs text-zinc-500">
                {t("editor.safeAreaDescription")}
              </p>
              <div className="mt-3 grid gap-3 md:grid-cols-4">
                {(["x", "y", "width", "height"] as const).map((key) => (
                  <label key={key} className="grid gap-1 text-xs text-zinc-400">
                    {key.toUpperCase()} %
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={safeArea[key]}
                      onChange={(event) => updateSafeArea(key, Number(event.target.value))}
                      className="rounded-lg border border-zinc-800 bg-[#111] px-3 py-2 text-white"
                    />
                  </label>
                ))}
              </div>
            </div>

            <label className="grid gap-2 text-sm text-zinc-400">
              {t("editor.compatibleBackgrounds")}
              <input
                value={(config.compatibleBackgroundIds ?? []).join(", ")}
                onChange={(event) =>
                  updateConfig({
                    compatibleBackgroundIds: event.target.value
                      .split(",")
                      .map((value) => value.trim())
                      .filter(Boolean),
                  })
                }
                className="rounded-xl border border-zinc-800 bg-black px-4 py-3 text-white"
              />
            </label>
          </div>

          <div className="relative h-64 overflow-hidden rounded-2xl border border-zinc-800 bg-black">
            {backgroundUrl ? (
              <img src={backgroundUrl} alt={t("editor.backgroundComposition")} className="h-full w-full object-cover opacity-70" />
            ) : (
              <div className="grid h-full place-items-center text-sm text-zinc-600">
                {t("editor.previewWithoutBackground")}
              </div>
            )}
            <div
              className="absolute border-2 border-emerald-400/80 bg-emerald-400/10"
              style={{
                left: `${safeArea.x}%`,
                top: `${safeArea.y}%`,
                width: `${safeArea.width}%`,
                height: `${safeArea.height}%`,
              }}
            />
            <Marker label="F" color="bg-emerald-400" x={50} y={50} />
            <Marker label="L" color="bg-yellow-400" x={clampPercent(50 + layoutAnchor.x / 10)} y={clampPercent(50 + layoutAnchor.y / 10)} />
            <Marker label="C" color="bg-sky-400" x={clampPercent(50 + cameraAnchor.x / 10)} y={clampPercent(50 + cameraAnchor.y / 10)} />
          </div>
        </div>
      )}
    </section>
  );
}

function AnchorField({
  title,
  description,
  x,
  y,
  onX,
  onY,
}: {
  title: string;
  description: string;
  x: number;
  y: number;
  onX: (value: number) => void;
  onY: (value: number) => void;
}) {
  const t = useTranslation();

  return (
    <div className="rounded-xl border border-zinc-800 bg-black/40 p-4">
      <h3 className="font-black">{title}</h3>
      <p className="mt-1 text-xs text-zinc-500">{description}</p>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <label className="grid gap-1 text-xs text-zinc-400">
          {t("editor.offsetX")}
          <input
            type="number"
            value={x}
            onChange={(event) => onX(Number(event.target.value))}
            className="rounded-lg border border-zinc-800 bg-[#111] px-3 py-2 text-white"
          />
        </label>
        <label className="grid gap-1 text-xs text-zinc-400">
          {t("editor.offsetY")}
          <input
            type="number"
            value={y}
            onChange={(event) => onY(Number(event.target.value))}
            className="rounded-lg border border-zinc-800 bg-[#111] px-3 py-2 text-white"
          />
        </label>
      </div>
    </div>
  );
}

function Marker({ label, color, x, y }: { label: string; color: string; x: number; y: number }) {
  return (
    <div
      className={`absolute grid h-7 w-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-xs font-black text-black ${color}`}
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      {label}
    </div>
  );
}
