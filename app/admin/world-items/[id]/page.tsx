"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslation } from "../../../../src/i18n/useTranslation";

export default function WorldItemDetailsPage() {
  const t = useTranslation();
  const params = useParams();
  const router = useRouter();

  const itemId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [worldItem, setWorldItem] = useState<any>(null);

  async function loadItem() {
    try {
      const res = await fetch(
        `http://localhost:3001/world-item-data/${itemId}`,
      );

      if (!res.ok) {
        throw new Error(t("items.loadWorldItemError"));
      }

      const data = await res.json();

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
      };

      const res = await fetch(
        `http://localhost:3001/world-item-data/${itemId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      if (!res.ok) {
        throw new Error(t("items.saveWorldItemError"));
      }

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

          <div className="grid grid-cols-2 gap-3">
            {["SIT", "LAY", "OPEN", "TELEPORT", "NPC", "SHOP"].map((type) => (
              <label key={type} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={worldItem.interactionTypes?.includes(type) || false}
                  onChange={() => toggleInteraction(type)}
                />
                {type}
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
