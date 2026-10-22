"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/shared/api/client";
import { useTranslation } from "../../../../src/i18n/useTranslation";
import LightShapeEditor from "../../../../components/item-editor/LightShapeEditor";

// Mismos defaults que el juego (LightingOverlay) cuando el objeto no los trae.
const DEFAULT_LIGHT_RADIUS = 140;
const DEFAULT_LIGHT_COLOR = "#ffe6b0";
// Luces con nombre: atajos para no buscar el hex a mano. `key` es la
// traducción (items.lightPreset<Key>).
const LIGHT_PRESETS = [
  { key: "Candle", color: "#ff9a3c" },
  { key: "Warm", color: "#ffd59a" },
  { key: "Neutral", color: "#fff4e0" },
  { key: "Cold", color: "#d6e8ff" },
  { key: "Moon", color: "#a9c4ff" },
  { key: "Fire", color: "#ff5a1f" },
  { key: "NeonPink", color: "#ff6ec7" },
  { key: "NeonBlue", color: "#3fd2ff" },
  { key: "Green", color: "#8dff8a" },
  { key: "Purple", color: "#b98cff" },
] as const;

/**
 * Color de una bombilla según su temperatura en Kelvin (1500K vela .. 10000K
 * cielo), con la aproximación de Tanner Helland. Igual que en una bombilla
 * real: número bajo = cálida/naranja, número alto = fría/azulada.
 */
function kelvinToHex(kelvin: number): string {
  const t = kelvin / 100;
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const r = t <= 66 ? 255 : clamp(329.698727446 * Math.pow(t - 60, -0.1332047592));
  const g = t <= 66 ? clamp(99.4708025861 * Math.log(t) - 161.1195681661) : clamp(288.1221695283 * Math.pow(t - 60, -0.0755148492));
  const b = t >= 66 ? 255 : t <= 19 ? 0 : clamp(138.5177312231 * Math.log(t - 10) - 305.0447927307);
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
}

export default function WorldItemDetailsPage() {
  const t = useTranslation();
  const params = useParams();
  const router = useRouter();

  const itemId = params.id as string;

  // Mismo rango [-1000, 1000] que valida el backend (clampSpriteOffset).
  const clampOffset = (value: unknown) => {
    const n = Math.trunc(Number(value));
    if (!Number.isFinite(n)) return 0;
    return Math.max(-1000, Math.min(1000, n));
  };

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [worldItem, setWorldItem] = useState<any>(null);

  async function loadItem() {
    try {
      const data = await api.get<any>(`/world-item-data/${itemId}`);

      setWorldItem(data);
    } catch (err) {
      console.error(err);
      alert(t("items.loadingWorldItemError"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (itemId) {
      loadItem();
    }
  }, [itemId]);

  // Forma/radio/color se editan si el objeto emite luz siempre o si es una
  // lámpara que se enciende (TOGGLE): las dos iluminan en el juego.
  const lightEditable =
    !!worldItem?.emitsLight ||
    (!!worldItem?.isInteractable && (worldItem?.interactionTypes ?? []).includes("TOGGLE"));

  async function save() {
    try {
      setSaving(true);

      const payload = {
        width: Number(worldItem.width),
        height: Number(worldItem.height),

        kind: worldItem.kind,
        category: worldItem.category,

        isCollidable: worldItem.isCollidable,
        walkable: worldItem.walkable,
        isInteractable: worldItem.isInteractable,
        rotatable: worldItem.rotatable,

        emitsLight: !!worldItem.emitsLight,
        lightRadius: lightEditable ? Number(worldItem.lightRadius) || DEFAULT_LIGHT_RADIUS : null,
        lightColor: lightEditable ? worldItem.lightColor || DEFAULT_LIGHT_COLOR : null,
        lightConfig: lightEditable ? worldItem.lightConfig ?? null : null,

        placementType: worldItem.placementType,

        allowsStacking: worldItem.allowsStacking,
        canBeStacked: worldItem.canBeStacked,

        stackHeight: Number(worldItem.stackHeight),
        maxStackHeight: Number(worldItem.maxStackHeight),

        interactionTypes: worldItem.interactionTypes,

        sitX: worldItem.sitX === "" ? null : Number(worldItem.sitX),

        sitY: worldItem.sitY === "" ? null : Number(worldItem.sitY),

        sitElevation:
          worldItem.sitElevation === "" ? null : Number(worldItem.sitElevation),

        teleportTargetRoomId: worldItem.teleportTargetRoomId || null,

        teleportTargetX:
          worldItem.teleportTargetX === ""
            ? null
            : Number(worldItem.teleportTargetX),

        teleportTargetY:
          worldItem.teleportTargetY === ""
            ? null
            : Number(worldItem.teleportTargetY),

        spriteSheetUrl: worldItem.spriteSheetUrl || null,

        previewImageUrl: worldItem.previewImageUrl || null,

        frameWidth:
          worldItem.frameWidth === "" ? null : Number(worldItem.frameWidth),

        frameHeight:
          worldItem.frameHeight === "" ? null : Number(worldItem.frameHeight),

        directions: Number(worldItem.directions),

        // Editor rápido: aplica el mismo offset a las 4 direcciones
        // (spriteOffsetSync = "all"). El ajuste fino por dirección está en
        // el editor de items (/admin/items/<id>).
        spriteOffsetSync: "all",
        spriteOffsets: (() => {
          const x = clampOffset(worldItem.spriteOffsetX);
          const y = clampOffset(worldItem.spriteOffsetY);
          return {
            NORTH: { x, y },
            EAST: { x, y },
            SOUTH: { x, y },
            WEST: { x, y },
          };
        })(),
      };

      await api.patch(`/world-item-data/${itemId}`, payload);

      alert(t("items.worldConfigSaved"));
    } catch (err) {
      console.error(err);
      alert(t("items.saveWorldItemError"));
    } finally {
      setSaving(false);
    }
  }

  function toggleInteraction(type: string) {
    const current = worldItem.interactionTypes || [];

    if (current.includes(type)) {
      setWorldItem({
        ...worldItem,
        interactionTypes: current.filter((x: string) => x !== type),
      });
    } else {
      setWorldItem({
        ...worldItem,
        interactionTypes: [...current, type],
      });
    }
  }

  if (loading) {
    return <div className="p-10 text-zinc-400">{t("items.loadingWorldItem")}</div>;
  }

  const itemName = worldItem?.item?.translations?.[0]?.name ?? t("items.unnamed");

  return (
    <div className="max-w-7xl mx-auto p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => router.back()}
            className="text-zinc-400 hover:text-white mb-2"
          >
            {t("common.back")}
          </button>

          <h1 className="text-3xl font-bold text-yellow-400">{itemName}</h1>

          <p className="text-zinc-500 mt-2">
            {t("items.worldItemAdvancedConfig")}
          </p>
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="bg-yellow-400 text-black px-6 py-3 rounded font-bold hover:bg-yellow-300"
        >
          {saving ? t("items.saving") : t("items.save")}
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* FISICA */}

        <div className="bg-[#111] border border-zinc-800 rounded-xl p-6">
          <h2 className="font-bold text-lg mb-4">{t("items.physics")}</h2>

          <div className="space-y-4">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={worldItem.isCollidable}
                onChange={(e) =>
                  setWorldItem({
                    ...worldItem,
                    isCollidable: e.target.checked,
                  })
                }
              />
              <div>
                <p>{t("items.collidable")}</p>
                <p className="text-xs text-zinc-500">
                  {t("items.collidableDescription")}
                </p>
              </div>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={worldItem.walkable}
                onChange={(e) =>
                  setWorldItem({
                    ...worldItem,
                    walkable: e.target.checked,
                  })
                }
              />
              <div>
                <p>{t("items.walkable")}</p>
                <p className="text-xs text-zinc-500">
                  {t("items.walkableDescription")}
                </p>
              </div>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={worldItem.rotatable}
                onChange={(e) =>
                  setWorldItem({
                    ...worldItem,
                    rotatable: e.target.checked,
                  })
                }
              />
              <div>
                <p>{t("items.rotatable")}</p>
                <p className="text-xs text-zinc-500">
                  {t("items.rotatableDescription")}
                </p>
              </div>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={worldItem.isInteractable}
                onChange={(e) =>
                  setWorldItem({
                    ...worldItem,
                    isInteractable: e.target.checked,
                  })
                }
              />
              <div>
                <p>{t("items.interactable")}</p>
                <p className="text-xs text-zinc-500">
                  {t("items.interactableDescription")}
                </p>
              </div>
            </label>

            {/* Luz propia: atraviesa la oscuridad de la sala. Con interacción
                "encender" solo ilumina encendido; si no, siempre. */}
            <div className="rounded-xl border border-zinc-800 p-3">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={!!worldItem.emitsLight}
                  onChange={(e) =>
                    setWorldItem({
                      ...worldItem,
                      emitsLight: e.target.checked,
                      lightRadius: worldItem.lightRadius ?? DEFAULT_LIGHT_RADIUS,
                      lightColor: worldItem.lightColor ?? DEFAULT_LIGHT_COLOR,
                    })
                  }
                />
                <div>
                  <p>{t("items.lightEmits")}</p>
                  <p className="text-xs text-zinc-500">{t("items.lightEmitsDescription")}</p>
                </div>
              </label>

              {lightEditable && (
                <>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="text-sm">
                    {t("items.lightRadius")} ({Number(worldItem.lightRadius) || DEFAULT_LIGHT_RADIUS}px)
                    <input
                      type="range"
                      min={16}
                      max={600}
                      step={4}
                      value={Number(worldItem.lightRadius) || DEFAULT_LIGHT_RADIUS}
                      onChange={(e) => setWorldItem({ ...worldItem, lightRadius: Number(e.target.value) })}
                      className="mt-1 w-full accent-yellow-400"
                    />
                  </label>
                  <label className="text-sm">
                    {t("items.lightColor")}
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="color"
                        value={worldItem.lightColor || DEFAULT_LIGHT_COLOR}
                        onChange={(e) => setWorldItem({ ...worldItem, lightColor: e.target.value })}
                        className="h-8 w-12 cursor-pointer rounded border border-zinc-700 bg-transparent"
                      />
                    </div>
                  </label>
                </div>

                {/* Luces con nombre + temperatura como en una bombilla real. */}
                <div className="mt-3 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {LIGHT_PRESETS.map((preset) => {
                      const active = (worldItem.lightColor || DEFAULT_LIGHT_COLOR).toLowerCase() === preset.color;
                      return (
                        <button
                          key={preset.key}
                          type="button"
                          onClick={() => setWorldItem({ ...worldItem, lightColor: preset.color })}
                          aria-pressed={active}
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${
                            active ? "border-yellow-400 bg-yellow-400/10 text-yellow-300" : "border-zinc-700 text-zinc-300 hover:border-zinc-500"
                          }`}
                        >
                          <span className="h-3 w-3 rounded-full" style={{ background: preset.color, boxShadow: `0 0 8px ${preset.color}` }} />
                          {t(`items.lightPreset${preset.key}`)}
                        </button>
                      );
                    })}
                  </div>
                  <label className="block text-sm">
                    {t("items.lightTemperature")}
                    <input
                      type="range"
                      min={1500}
                      max={10000}
                      step={100}
                      defaultValue={3000}
                      onChange={(e) => setWorldItem({ ...worldItem, lightColor: kelvinToHex(Number(e.target.value)) })}
                      className="mt-1 w-full"
                      style={{ accentColor: worldItem.lightColor || DEFAULT_LIGHT_COLOR, background: "linear-gradient(to right, #ff8a1f, #ffd59a, #fff4e0, #d6e8ff, #9bbcff)", borderRadius: 999, height: 6 }}
                    />
                    <span className="mt-1 flex justify-between text-[11px] text-zinc-500">
                      <span>{t("items.lightTemperatureWarm")}</span>
                      <span>{t("items.lightTemperatureCold")}</span>
                    </span>
                  </label>
                </div>
                <div className="mt-3">
                  <LightShapeEditor
                    imageUrl={worldItem.item?.imageUrl ?? worldItem.previewImageUrl}
                    faces={Number(worldItem.directions) || 1}
                    radius={Number(worldItem.lightRadius) || DEFAULT_LIGHT_RADIUS}
                    color={worldItem.lightColor || DEFAULT_LIGHT_COLOR}
                    value={worldItem.lightConfig ?? null}
                    onChange={(lightConfig) => setWorldItem({ ...worldItem, lightConfig })}
                    labels={{
                      title: t("items.lightShapeTitle"),
                      hint: t("items.lightShapeHint"),
                      circle: t("items.lightShapeCircle"),
                      cone: t("items.lightShapeCone"),
                      direction: t("items.lightShapeDirection"),
                      spread: t("items.lightShapeSpread"),
                      reset: t("items.lightShapeReset"),
                    }}
                  />
                </div>
                </>
              )}
            </div>

            <div>
              <p className="mb-1">{t("items.facesLabel")}</p>
              <p className="text-xs text-zinc-500 mb-2">{t("items.facesHint")}</p>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 4].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() =>
                      setWorldItem({
                        ...worldItem,
                        directions: n,
                        rotatable: n > 1,
                      })
                    }
                    className={`rounded px-3 py-1.5 text-xs font-bold ${
                      Number(worldItem.directions) === n
                        ? "bg-yellow-400 text-black"
                        : "border border-zinc-700 text-zinc-300"
                    }`}
                  >
                    {t(`items.faces_${n}`)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* TAMAÑO */}

        <div className="bg-[#111] border border-zinc-800 rounded-xl p-6">
          <h2 className="font-bold text-lg mb-4">{t("items.dimensions")}</h2>

          <div className="grid grid-cols-2 gap-4">
            <input
              type="number"
              value={worldItem.width}
              onChange={(e) =>
                setWorldItem({
                  ...worldItem,
                  width: e.target.value,
                })
              }
              className="bg-black border border-zinc-700 rounded p-2"
              placeholder={t("items.width")}
            />

            <input
              type="number"
              value={worldItem.height}
              onChange={(e) =>
                setWorldItem({
                  ...worldItem,
                  height: e.target.value,
                })
              }
              className="bg-black border border-zinc-700 rounded p-2"
              placeholder={t("items.height")}
            />
          </div>
        </div>

        {/* SPRITE OFFSET */}

        <div className="bg-[#111] border border-zinc-800 rounded-xl p-6">
          <h2 className="font-bold text-lg mb-1">{t("items.spriteOffsetTitle")}</h2>
          <p className="text-xs text-zinc-500 mb-1">{t("items.spriteOffsetHint")}</p>
          <p className="text-xs text-amber-500/80 mb-4">{t("items.spriteOffsetQuickNote")}</p>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1 text-sm text-zinc-400">
              {t("items.spriteOffsetX")}
              <input
                type="number"
                min={-1000}
                max={1000}
                value={worldItem.spriteOffsetX ?? 0}
                onChange={(e) =>
                  setWorldItem({
                    ...worldItem,
                    spriteOffsetX: e.target.value,
                  })
                }
                className="bg-black border border-zinc-700 rounded p-2"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm text-zinc-400">
              {t("items.spriteOffsetY")}
              <input
                type="number"
                min={-1000}
                max={1000}
                value={worldItem.spriteOffsetY ?? 0}
                onChange={(e) =>
                  setWorldItem({
                    ...worldItem,
                    spriteOffsetY: e.target.value,
                  })
                }
                className="bg-black border border-zinc-700 rounded p-2"
              />
            </label>
          </div>
        </div>

        {/* APILAMIENTO */}

        <div className="bg-[#111] border border-zinc-800 rounded-xl p-6">
          <h2 className="font-bold text-lg mb-4">{t("items.stacking")}</h2>

          <div className="space-y-4">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={worldItem.allowsStacking}
                onChange={(e) =>
                  setWorldItem({
                    ...worldItem,
                    allowsStacking: e.target.checked,
                  })
                }
              />
              {t("items.allowsStacking")}
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={worldItem.canBeStacked}
                onChange={(e) =>
                  setWorldItem({
                    ...worldItem,
                    canBeStacked: e.target.checked,
                  })
                }
              />
              {t("items.canBeStacked")}
            </label>
          </div>
        </div>

        {/* INTERACCIONES */}

        <div className="bg-[#111] border border-zinc-800 rounded-xl p-6">
          <h2 className="font-bold text-lg mb-4">{t("items.interactions")}</h2>

          <p className="text-xs text-zinc-500 mb-3">
            {t("items.interactionsHint")}
          </p>
          <div className="grid grid-cols-2 gap-3">
            {/* Valores reales del enum InteractionType (schema.prisma). Antes
                esta lista tenía LAY/NPC/SHOP, que no existen, y le faltaban
                LIE/DRINK/TOGGLE. */}
            {["SIT", "LIE", "DRINK", "OPEN", "TOGGLE", "TELEPORT"].map((type) => (
              <label key={type} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={worldItem.interactionTypes?.includes(type) || false}
                  onChange={() => toggleInteraction(type)}
                />
                {t(`items.interaction_${type}`)}
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
