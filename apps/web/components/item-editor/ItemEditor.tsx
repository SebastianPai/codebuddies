"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { HelpCircle } from "lucide-react";
import { api } from "../../utils/api";
import FootprintEditor, {
  createDefaultFootprint,
  createEmptySurface,
  FootprintMap,
} from "./FootprintEditor";
import AvatarItemPreview from "./AvatarItemPreview";
import CachedImage from "../shared/CachedImage";
import { Tooltip } from "../../src/shared/ui";
import { useTranslation } from "../../src/i18n/useTranslation";
import { capitalizeRarityKey, useRarityCatalog } from "../../src/features/items/useRarityCatalog";
import { resolveItemRarityEffect, getOwnableEffectIds, getEffectDefinition } from "@codebuddies/visual-effects";

/** Persistent caption for a field, with an optional "?" tooltip for non-obvious values. */
function FieldLabel({ text, hint }: { text: string; hint?: string }) {
  return (
    <span className="mb-1 flex items-center gap-1.5 text-sm text-zinc-400">
      {text}
      {hint && (
        <Tooltip content={hint}>
          <HelpCircle size={14} className="text-zinc-500" />
        </Tooltip>
      )}
    </span>
  );
}

function LabeledField({ text, hint, children }: { text: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <FieldLabel text={text} hint={hint} />
      {children}
    </label>
  );
}

const AVATAR_SLOTS = [
  "BODY",
  "HEAD",
  "HAIR",
  "EYES",
  "SHIRT",
  "LEGS",
  "SHOES",
  "LEFT_ARM",
  "RIGHT_ARM",
  "ACCESSORY_HEAD",
  "ACCESSORY_FACE",
  "ACCESSORY_BACK",
  "ACCESSORY_LEFT",
  "ACCESSORY_RIGHT",
] as const;

const SLOT_LAYERS: Record<(typeof AVATAR_SLOTS)[number], number> = {
  BODY: 0,
  LEGS: 1,
  SHOES: 2,
  SHIRT: 3,
  LEFT_ARM: 4,
  RIGHT_ARM: 5,
  HEAD: 6,
  EYES: 7,
  HAIR: 8,
  ACCESSORY_FACE: 9,
  ACCESSORY_HEAD: 10,
  ACCESSORY_BACK: 11,
  ACCESSORY_LEFT: 12,
  ACCESSORY_RIGHT: 13,
};

type EditorMode = "admin" | "creator";
type ItemKind = "avatar" | "world" | "texture" | "effect";

type ItemEditorProps = {
  initial?: any;
  mode?: EditorMode;
  readOnly?: boolean;
  submitLabel?: string;
  onSubmit?: (data: any) => Promise<void>;
};

type AnimationOption = { id: string; name?: string; type?: string; variant?: string };
type BodyOption = {
  id: string;
  imageUrl?: string;
  translations?: Array<{ name?: string }>;
  avatarData?: { slot?: string };
};

const fieldClass =
  "w-full rounded-2xl border border-zinc-800 bg-black/70 px-4 py-3 text-white outline-none transition focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20";

function getInitialKind(initial?: any): ItemKind {
  if (initial?.formCategory) return initial.formCategory;
  if (initial?.type === "EFFECT" || initial?.effectKey) return "effect";
  if (initial?.type === "AVATAR_ITEM" || initial?.avatarData || initial?.slot) {
    return "avatar";
  }
  if (initial?.kind === "FLOOR" || initial?.kind === "WALL") return "texture";
  return "world";
}

function compactTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export default function ItemEditor({
  initial,
  mode = "admin",
  readOnly = false,
  submitLabel,
  onSubmit,
}: ItemEditorProps) {
  const t = useTranslation();
  const rarities = useRarityCatalog();
  const [category, setCategory] = useState<ItemKind>(getInitialKind(initial));
  const [name, setName] = useState(initial?.name ?? initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [languageCode, setLanguageCode] = useState(initial?.languageCode ?? "es");
  const [itemCategory, setItemCategory] = useState(
    initial?.category ?? (getInitialKind(initial) === "texture" ? "texturas" : "furniture"),
  );
  const [tags, setTags] = useState(
    Array.isArray(initial?.tags) ? initial.tags.join(", ") : initial?.category ?? "",
  );
  const [rarity, setRarity] = useState(initial?.rarity ?? 0);
  const [effectKey, setEffectKey] = useState(initial?.effectKey ?? getOwnableEffectIds()[0]);
  const [coinsPrice, setCoinsPrice] = useState(initial?.coinsPrice ?? initial?.priceCoins ?? 100);
  const [gemsPrice, setGemsPrice] = useState(initial?.gemsPrice ?? 0);
  const [shopVisible, setShopVisible] = useState(initial?.shopVisible ?? mode === "admin");
  const [colorable, setColorable] = useState(initial?.colorable ?? false);

  const [slot, setSlot] = useState(initial?.slot || "SHIRT");
  const [itemSpriteUrl, setItemSpriteUrl] = useState(
    initial?.itemSpriteUrl || initial?.avatarData?.itemSprite?.imageUrl || "",
  );
  const [itemSpriteFrameWidth, setItemSpriteFrameWidth] = useState(
    initial?.itemSpriteFrameWidth || initial?.avatarData?.itemSprite?.frameWidth || 128,
  );
  const [itemSpriteFrameHeight, setItemSpriteFrameHeight] = useState(
    initial?.itemSpriteFrameHeight || initial?.avatarData?.itemSprite?.frameHeight || 224,
  );
  const [itemSpriteFramesCount, setItemSpriteFramesCount] = useState(
    initial?.itemSpriteFramesCount || initial?.avatarData?.itemSprite?.framesCount || 1,
  );
  const [itemSpriteRowIndex, setItemSpriteRowIndex] = useState(
    initial?.itemSpriteRowIndex || initial?.avatarData?.itemSprite?.rowIndex || 0,
  );
  const [itemSpriteAnimation, setItemSpriteAnimation] = useState(
    initial?.itemSpriteAnimation || initial?.avatarData?.itemSprite?.animation || "idle",
  );
  const [itemSpriteFile, setItemSpriteFile] = useState<File | null>(null);
  const [itemSpriteUploading, setItemSpriteUploading] = useState(false);
  const [animations, setAnimations] = useState<AnimationOption[]>([]);
  const [bodies, setBodies] = useState<BodyOption[]>([]);
  const [kind, setKind] = useState(initial?.kind || "FURNITURE");
  const [textureKind, setTextureKind] = useState<"FLOOR" | "WALL">(
    initial?.kind === "WALL" ? "WALL" : "FLOOR",
  );
  const [width, setWidth] = useState(initial?.width || 1);
  const [height, setHeight] = useState(initial?.height || 1);
  const [footprintWidth, setFootprintWidth] = useState(initial?.footprintWidth || 1);
  const [footprintHeight, setFootprintHeight] = useState(initial?.footprintHeight || 1);
  const [syncDirections, setSyncDirections] = useState(initial?.syncDirections ?? true);
  // Antes el editor siempre asumia un spritesheet de 4 caras (rotacion) y
  // dividia el ancho de la imagen entre 4 sin preguntar, asi que subir una
  // sola imagen la cortaba en 4 pedazos. Este toggle usa la imagen completa
  // como un unico frame -- ver items.service.ts#buildEngineData (backend) y
  // RoomItemsManager/BuildSystem (juego), que ya leen `directions` para
  // decidir cuantas caras tiene el sprite.
  const [singleFace, setSingleFace] = useState((initial?.directions ?? 4) === 1);
  const [footprints, setFootprints] = useState<FootprintMap>(
    initial?.footprints || createDefaultFootprint(),
  );
  const [surfaces, setSurfaces] = useState<FootprintMap>(
    initial?.surfaces || createEmptySurface(),
  );
  const [isCollidable, setIsCollidable] = useState(initial?.isCollidable ?? false);
  const [walkable, setWalkable] = useState(initial?.walkable ?? false);
  const [isInteractable, setIsInteractable] = useState(initial?.isInteractable ?? false);
  const [placementType, setPlacementType] = useState(initial?.placementType || "FLOOR");
  const [allowsStacking, setAllowsStacking] = useState(initial?.allowsStacking ?? false);
  const [canBeStacked, setCanBeStacked] = useState(initial?.canBeStacked ?? false);
  const [stackHeight, setStackHeight] = useState(initial?.stackHeight || 10);
  const [maxStackHeight, setMaxStackHeight] = useState(initial?.maxStackHeight || 10);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(
    initial?.imageUrl || initial?.spriteUrl || initial?.previewUrl || null,
  );
  const [isDragging, setIsDragging] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const itemSpriteInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      api.get<AnimationOption[]>("/animations").catch(() => []),
      api.get<BodyOption[]>("/items").catch(() => []),
    ]).then(([animationData, itemData]) => {
      if (!mounted) return;
      setAnimations(animationData);
      setBodies(itemData.filter((item) => item.avatarData?.slot === "BODY"));
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!file || category !== "world") return;
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      setWidth(img.naturalWidth);
      setHeight(img.naturalHeight);
    };
    img.src = objectUrl;
    return () => URL.revokeObjectURL(objectUrl);
  }, [file, category]);

  const validate = () => {
    const nextErrors: string[] = [];
    if (!name.trim()) nextErrors.push(t("items.nameRequiredError"));
    if (!description.trim()) nextErrors.push(t("items.descriptionRequiredError"));
    if (!itemCategory.trim()) nextErrors.push(t("items.categoryRequiredError"));
    if (Number(coinsPrice) < 0 || Number(gemsPrice) < 0) {
      nextErrors.push(t("items.negativePriceError"));
    }
    if (!preview && !initial?.imageUrl && !initial?.spriteUrl && !initial?.previewUrl) {
      nextErrors.push(t("items.uploadSpriteRequiredError"));
    }
    if (category === "world") {
      if (!width || !height) nextErrors.push(t("items.invalidDimensionsError"));
      if (!footprints.NORTH?.occupied?.length) nextErrors.push(t("items.footprintTileRequiredError"));
      if (!footprints.NORTH?.origin) nextErrors.push(t("items.originRequiredError"));
      if (isInteractable && !kind) nextErrors.push(t("items.interactionTypeRequiredError"));
    }
    if (category === "avatar" && !slot) nextErrors.push(t("items.avatarSlotRequiredError"));
    setErrors(nextErrors);
    return nextErrors.length === 0;
  };

  const uploadImage = async () => {
    if (!file) return initial?.imageUrl || initial?.spriteUrl || initial?.previewUrl;
    const form = new FormData();
    form.append("file", file);
    form.append("folder", mode === "creator" ? "marketplace" : "items");
    const response = await api.post<{ url: string }>("/uploads", form);
    return response.url;
  };

  const uploadItemSprite = async (selectedFile?: File | null) => {
    if (!selectedFile) return itemSpriteUrl;
    setItemSpriteUploading(true);
    try {
      const form = new FormData();
      form.append("file", selectedFile);
      form.append("folder", mode === "creator" ? "marketplace/item-sprites" : "item-sprites");
      const response = await api.post<{ url: string }>("/uploads", form);
      setItemSpriteUrl(response.url);
      return response.url;
    } finally {
      setItemSpriteUploading(false);
    }
  };

  const buildAdminPayload = (imageUrl: string | null) => {
    const baseData = {
      name: name.trim(),
      description: description.trim(),
      languageCode,
      rarity,
      coinsPrice: Number(coinsPrice),
      gemsPrice: Number(gemsPrice),
      shopVisible,
      category: itemCategory.trim(),
      imageUrl,
      tags: compactTags(tags),
      colorable,
    };

    if (category === "effect") {
      // Sin rareza real (ver Item.effectKey en schema.prisma) -- baseData
      // trae rarity=0 (Common) por defecto, pero createItem/updateItem ya
      // saltan la validación de precio-por-rareza cuando viene effectKey.
      return {
        ...baseData,
        effectKey,
      };
    }

    if (category === "avatar") {
      const layer = SLOT_LAYERS[slot as keyof typeof SLOT_LAYERS] ?? 0;
      // El sprite animado ya no se configura acá — se hace en
      // /admin/item-sprites una vez creado el item (ver link en la sección
      // de arriba), para no duplicar ese flujo.
      return {
        ...baseData,
        slot,
        layer,
      };
    }

    if (category === "texture") {
      return {
        ...baseData,
        kind: textureKind,
        width: Number(width),
        height: Number(height),
        isCollidable: false,
        walkable: true,
        isInteractable: false,
        rotatable: false,
        placementType: textureKind === "WALL" ? "WALL" : "FLOOR",
        furnitureCategory: textureKind === "WALL" ? "WALL_ITEM" : "DECORATION",
      };
    }

    return {
      ...baseData,
      kind,
      width: Number(width),
      height: Number(height),
      isCollidable,
      walkable,
      isInteractable,
      rotatable: !singleFace,
      directions: singleFace ? 1 : 4,
      placementType,
      allowsStacking,
      canBeStacked,
      stackHeight: Number(stackHeight),
      maxStackHeight: Number(maxStackHeight),
      footprintWidth: Number(footprintWidth),
      footprintHeight: Number(footprintHeight),
      syncDirections,
      footprints,
      surfaces,
    };
  };

  const buildCreatorPayload = (imageUrl: string | null, uploadedItemSpriteUrl = itemSpriteUrl) => {
    const common = {
      title: name.trim(),
      description: description.trim(),
      category: itemCategory.trim(),
      priceCoins: Number(coinsPrice),
      previewUrl: imageUrl,
      spriteUrl: imageUrl,
      tags: compactTags(tags || itemCategory),
    };

    if (category === "avatar") {
      return {
        ...common,
        type: "AVATAR_ITEM",
        payload: {
          avatarData: {
            slot,
            layer: SLOT_LAYERS[slot as keyof typeof SLOT_LAYERS] ?? 0,
            itemSprite: {
              imageUrl: uploadedItemSpriteUrl || imageUrl,
              frameWidth: Number(itemSpriteFrameWidth),
              frameHeight: Number(itemSpriteFrameHeight),
              framesCount: Number(itemSpriteFramesCount),
              rowIndex: Number(itemSpriteRowIndex),
              animation: itemSpriteAnimation,
            },
          },
          item: { rarity, colorable, category: itemCategory, tags: compactTags(tags) },
        },
      };
    }

    return {
      ...common,
      type: "WORLD_ITEM",
      payload: {
        worldData: {
          kind: category === "texture" ? textureKind : kind,
          width: Number(width),
          height: Number(height),
          spriteSheetUrl: imageUrl,
          previewImageUrl: imageUrl,
          frameWidth:
            category === "world"
              ? Math.max(1, Math.floor(Number(width) / (singleFace ? 1 : 4)))
              : null,
          frameHeight: Number(height),
          directions: category === "world" ? (singleFace ? 1 : 4) : undefined,
          rotatable: category === "world" ? !singleFace : undefined,
          footprintWidth: category === "texture" ? Number(width) : Number(footprintWidth),
          footprintHeight: category === "texture" ? Number(height) : Number(footprintHeight),
          syncDirections,
          footprints: category === "texture" ? createDefaultFootprint() : footprints,
          surfaces: category === "texture" ? createEmptySurface() : surfaces,
          isCollidable: category === "texture" ? false : isCollidable,
          walkable: category === "texture" ? true : walkable,
          isInteractable: category === "texture" ? false : isInteractable,
          placementType: category === "texture" && textureKind === "WALL" ? "WALL" : placementType,
          allowsStacking,
          canBeStacked,
          stackHeight: Number(stackHeight),
          maxStackHeight: Number(maxStackHeight),
        },
        item: { rarity, colorable, category: itemCategory, tags: compactTags(tags) },
      },
    };
  };

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (readOnly || !onSubmit) return;
    if (!validate()) return;
    setIsSaving(true);
    setErrors([]);
    try {
      const imageUrl = await uploadImage();
      const uploadedItemSpriteUrl =
        mode === "creator" && category === "avatar" && itemSpriteFile
          ? await uploadItemSprite(itemSpriteFile)
          : itemSpriteUrl;
      await onSubmit(
        mode === "creator"
          ? buildCreatorPayload(imageUrl, uploadedItemSpriteUrl)
          : buildAdminPayload(imageUrl),
      );
    } catch (error) {
      setErrors([error instanceof Error ? error.message : t("items.saveItemErrorFallback")]);
    } finally {
      setIsSaving(false);
    }
  }

  function handleFile(selectedFile?: File) {
    if (readOnly) return;
    if (!selectedFile) return;
    if (!selectedFile.type.startsWith("image/")) {
      setErrors([t("admin.onlyImagesAllowed")]);
      return;
    }
    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-[28px] border border-zinc-800 bg-[#0c0c0c] p-6">
      {errors.length > 0 && (
        <div className="rounded-2xl border border-red-900 bg-red-950/40 p-4 text-sm text-red-100">
          {errors.map((error) => (
            <p key={error}>{error}</p>
          ))}
        </div>
      )}

      {readOnly && (
        <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-4 text-sm text-yellow-100">
          {t("items.readOnlyModeNotice")}
        </div>
      )}

      <fieldset disabled={readOnly || isSaving} className="space-y-6 disabled:opacity-90">
      <section className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-zinc-400">{t("items.contentType")}</label>
            <select value={category} onChange={(event) => setCategory(event.target.value as ItemKind)} className={fieldClass}>
              <option value="world">{t("items.world")}</option>
              <option value="avatar">{t("items.avatar")}</option>
              <option value="texture">{t("items.texture")}</option>
              {mode === "admin" && <option value="effect">{t("items.effect")}</option>}
            </select>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <LabeledField text={t("items.name")}>
              <input value={name} onChange={(event) => setName(event.target.value)} className={fieldClass} />
            </LabeledField>
            <LabeledField text={t("items.category")}>
              <input value={itemCategory} onChange={(event) => setItemCategory(event.target.value)} className={fieldClass} />
            </LabeledField>
          </div>
          <LabeledField text={t("items.description")}>
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} className={fieldClass} />
          </LabeledField>
          <LabeledField text={t("items.tags")}>
            <input value={tags} onChange={(event) => setTags(event.target.value)} className={fieldClass} />
          </LabeledField>
        </div>

        <div
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            handleFile(event.dataTransfer.files[0]);
          }}
          onClick={() => {
            if (!readOnly) fileInputRef.current?.click();
          }}
          className={`flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed p-5 text-center transition ${
            isDragging ? "border-yellow-400 bg-yellow-400/10" : "border-zinc-700 bg-black/60 hover:border-yellow-400"
          }`}
        >
          {preview ? (
            <CachedImage src={preview} alt={t("items.previewAlt")} className="max-h-40 object-contain [image-rendering:pixelated]" />
          ) : (
            <div className="text-sm text-zinc-400">{t("items.uploadPreview")}</div>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" onChange={(event) => handleFile(event.target.files?.[0])} className="hidden" />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <LabeledField text={t("items.coins")} hint={t("items.coinsHint")}>
          <input type="number" min="0" value={coinsPrice} onChange={(event) => setCoinsPrice(Number(event.target.value))} className={fieldClass} />
          {(() => {
            const selected = rarities.find((r) => r.id === rarity);
            return selected ? (
              <p className="mt-1 text-xs text-zinc-500">
                {t("items.rarityRangeHint", { min: selected.minCoins, max: selected.maxCoins })}
              </p>
            ) : null;
          })()}
        </LabeledField>
        <LabeledField text={t("items.gems")} hint={t("items.gemsHint")}>
          <input type="number" min="0" value={gemsPrice} onChange={(event) => setGemsPrice(Number(event.target.value))} className={fieldClass} />
        </LabeledField>
        {category === "effect" ? (
          <LabeledField text={t("items.effectKeyLabel")} hint={t("items.effectKeyHint")}>
            <div className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="h-3 w-3 shrink-0 rounded-full ring-1 ring-black/10"
                style={{ background: getEffectDefinition(effectKey).gradientStops[0] }}
              />
              <select value={effectKey} onChange={(event) => setEffectKey(event.target.value)} className={fieldClass}>
                {getOwnableEffectIds().map((id) => (
                  <option key={id} value={id}>
                    {getEffectDefinition(id).label}
                  </option>
                ))}
              </select>
            </div>
          </LabeledField>
        ) : (
          <LabeledField text={t("items.rarityLabel")} hint={t("items.rarityHint")}>
            <div className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="h-3 w-3 shrink-0 rounded-full ring-1 ring-black/10"
                style={{ background: resolveItemRarityEffect(rarity).gradientStops[0] }}
              />
              <select value={rarity} onChange={(event) => setRarity(Number(event.target.value))} className={fieldClass}>
                {rarities.map((rarityOption) => (
                  <option key={rarityOption.id} value={rarityOption.id}>
                    {t(`items.rarity${capitalizeRarityKey(rarityOption.key)}`)}
                  </option>
                ))}
              </select>
            </div>
          </LabeledField>
        )}
        <LabeledField text={t("items.languageLabel")} hint={t("items.languageHint")}>
          <select value={languageCode} onChange={(event) => setLanguageCode(event.target.value)} className={fieldClass}>
            <option value="es">{t("items.spanish")}</option>
            <option value="en">{t("items.english")}</option>
          </select>
        </LabeledField>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <label className="flex items-center gap-2 rounded-2xl border border-zinc-800 bg-black/50 p-4 text-sm text-zinc-300">
          <input type="checkbox" checked={colorable} onChange={(event) => setColorable(event.target.checked)} />
          {t("items.colorableLabel")}
        </label>
        <label className="flex items-center gap-2 rounded-2xl border border-zinc-800 bg-black/50 p-4 text-sm text-zinc-300">
          <input type="checkbox" checked={shopVisible} onChange={(event) => setShopVisible(event.target.checked)} disabled={mode === "creator"} />
          {t("items.shopVisibleOfficialLabel")}
        </label>
      </section>

      {category === "effect" ? (
        <section className="rounded-3xl border border-zinc-800 bg-black/40 p-5">
          <h3 className="text-xl font-black text-white">{t("items.effectItemTitle")}</h3>
          <p className="mt-1 text-sm text-zinc-500">{t("items.effectItemDescription")}</p>
          <div className="mt-4 rounded-2xl border border-zinc-800 bg-black/60 p-4">
            <span
              className={`${getEffectDefinition(effectKey).textClassName} text-2xl font-black`}
            >
              {name.trim() || getEffectDefinition(effectKey).label}
            </span>
          </div>
        </section>
      ) : category === "avatar" ? (
        <section className="space-y-5">
          <div className="rounded-3xl border border-zinc-800 bg-black/40 p-5">
            <h3 className="text-xl font-black text-white">{t("items.avatarItem")}</h3>
            <p className="mt-1 text-sm text-zinc-500">{t("items.avatarDescription")}</p>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <LabeledField text={t("items.slotLabel")} hint={t("items.slotHint")}>
                <select value={slot} onChange={(event) => setSlot(event.target.value)} className={fieldClass}>
                  {AVATAR_SLOTS.map((slotOption) => (
                    <option key={slotOption} value={slotOption}>{slotOption}</option>
                  ))}
                </select>
              </LabeledField>

              {mode === "admin" && initial?.id && (
                <div className="rounded-2xl border border-dashed border-zinc-700 bg-black/60 p-4 md:col-span-2 flex flex-col justify-center gap-2">
                  <p className="text-sm font-black text-white">{t("items.itemSprite")}</p>
                  <p className="text-xs text-zinc-500">{t("items.configureSpriteElsewhereHint")}</p>
                  <Link
                    href={`/admin/item-sprites?itemId=${initial.id}`}
                    className="w-fit rounded-xl bg-yellow-400 px-4 py-2 text-sm font-black text-black"
                  >
                    {t("items.configureSpriteButton")}
                  </Link>
                </div>
              )}

              {mode === "creator" && (
                <div className="rounded-2xl border border-dashed border-zinc-700 bg-black/60 p-3 md:col-span-2">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center">
                    <div className="grid h-24 w-24 shrink-0 place-items-center rounded-xl bg-[#111]">
                      {itemSpriteUrl ? (
                        <CachedImage src={itemSpriteUrl} alt={t("items.itemSprite")} className="max-h-20 max-w-20 object-contain [image-rendering:pixelated]" />
                      ) : (
                        <span className="text-xs text-zinc-500">{t("items.sprite")}</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-black text-white">{t("items.itemSprite")}</p>
                      <p className="mt-1 text-xs text-zinc-500">{t("items.spriteDescription")}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => itemSpriteInputRef.current?.click()}
                          className="rounded-xl bg-yellow-400 px-4 py-2 text-sm font-black text-black"
                        >
                          {itemSpriteUploading ? t("items.uploadingEllipsis") : itemSpriteUrl ? t("items.replaceImageButton") : t("items.uploadImageButton")}
                        </button>
                        {itemSpriteUrl && (
                          <button
                            type="button"
                            onClick={() => {
                              setItemSpriteUrl("");
                              setItemSpriteFile(null);
                              if (itemSpriteInputRef.current) itemSpriteInputRef.current.value = "";
                            }}
                            className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-black text-zinc-300"
                          >
                            {t("items.removeButton")}
                          </button>
                        )}
                      </div>
                      <input
                        ref={itemSpriteInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(event) => {
                          const selectedFile = event.target.files?.[0];
                          if (!selectedFile) return;
                          if (!selectedFile.type.startsWith("image/")) {
                            setErrors([t("items.onlyImagesForSpriteError")]);
                            return;
                          }
                          setItemSpriteFile(selectedFile);
                          setItemSpriteUrl(URL.createObjectURL(selectedFile));
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {mode === "creator" && (
                <>
                  <LabeledField text={t("items.animationLabel")} hint={t("items.animationHint")}>
                    <select value={itemSpriteAnimation} onChange={(event) => setItemSpriteAnimation(event.target.value)} className={fieldClass}>
                      {animations.length ? (
                        animations.map((animation) => (
                          <option key={animation.id} value={animation.variant || animation.name || animation.id}>
                            {animation.name || `${animation.type ?? t("items.animationFallback")} ${animation.variant ?? ""}`}
                          </option>
                        ))
                      ) : (
                        <option value="idle">{t("items.idle")}</option>
                      )}
                    </select>
                  </LabeledField>
                  <LabeledField text={t("items.frameWidth")} hint={t("items.frameWidthHint")}>
                    <input type="number" min="1" value={itemSpriteFrameWidth} onChange={(event) => setItemSpriteFrameWidth(Number(event.target.value))} className={fieldClass} />
                  </LabeledField>
                  <LabeledField text={t("items.frameHeight")} hint={t("items.frameHeightHint")}>
                    <input type="number" min="1" value={itemSpriteFrameHeight} onChange={(event) => setItemSpriteFrameHeight(Number(event.target.value))} className={fieldClass} />
                  </LabeledField>
                  <LabeledField text={t("items.frames")} hint={t("items.framesHint")}>
                    <input type="number" min="1" value={itemSpriteFramesCount} onChange={(event) => setItemSpriteFramesCount(Number(event.target.value))} className={fieldClass} />
                  </LabeledField>
                  <LabeledField text={t("items.row")} hint={t("items.rowHint")}>
                    <input type="number" min="0" value={itemSpriteRowIndex} onChange={(event) => setItemSpriteRowIndex(Number(event.target.value))} className={fieldClass} />
                  </LabeledField>
                </>
              )}
            </div>
          </div>
          <AvatarItemPreview
            itemSpriteUrl={mode === "creator" ? itemSpriteUrl : ""}
            previewUrl={preview}
            slot={slot}
            layer={SLOT_LAYERS[slot as keyof typeof SLOT_LAYERS] ?? 0}
            frameWidth={Number(itemSpriteFrameWidth)}
            frameHeight={Number(itemSpriteFrameHeight)}
            framesCount={Number(itemSpriteFramesCount)}
            rowIndex={Number(itemSpriteRowIndex)}
            animation={itemSpriteAnimation}
            onAnimationChange={setItemSpriteAnimation}
            animations={animations.map((animation) => ({
              id: animation.id,
              value: animation.variant || animation.name || animation.id,
              label: animation.name || `${animation.type ?? t("items.animationFallback")} ${animation.variant ?? ""}`,
            }))}
            bodies={bodies.map((body) => ({
              id: body.id,
              label: body.translations?.[0]?.name || body.id.slice(0, 8),
              imageUrl: body.imageUrl,
            }))}
          />
        </section>
      ) : category === "texture" ? (
        <section className="rounded-3xl border border-zinc-800 bg-black/40 p-5">
          <h3 className="text-xl font-black text-white">{t("items.textureTitle")}</h3>
              <p className="mt-1 text-sm text-zinc-500">{t("items.textureDescription")}</p>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <LabeledField text={t("items.textureKindLabel")} hint={t("items.textureKindHint")}>
              <select value={textureKind} onChange={(event) => setTextureKind(event.target.value as "FLOOR" | "WALL")} className={fieldClass}>
                <option value="FLOOR">{t("items.floor")}</option>
                <option value="WALL">{t("items.wall")}</option>
              </select>
            </LabeledField>
            <LabeledField text={t("items.width")} hint={t("items.widthHint")}>
              <input type="number" min="1" max="8" value={width} onChange={(event) => setWidth(Number(event.target.value))} className={fieldClass} />
            </LabeledField>
            <LabeledField text={t("items.height")} hint={t("items.heightHint")}>
              <input type="number" min="1" max="8" value={height} onChange={(event) => setHeight(Number(event.target.value))} className={fieldClass} />
            </LabeledField>
          </div>
        </section>
      ) : (
        <section className="space-y-5">
          <div className="rounded-3xl border border-zinc-800 bg-black/40 p-5">
          <h3 className="text-xl font-black text-white">{t("items.worldItem")}</h3>
            <p className="mt-1 text-sm text-zinc-500">{t("items.worldDescription")}</p>
            <div className="mt-4 grid gap-4 md:grid-cols-4">
              <LabeledField text={t("items.worldKindLabel")} hint={t("items.worldKindHint")}>
                <select value={kind} onChange={(event) => setKind(event.target.value)} className={fieldClass}>
                  <option value="FURNITURE">{t("items.furniture")}</option>
                  <option value="DECORATION">{t("items.decoration")}</option>
                  <option value="NPC">NPC</option>
                  <option value="INTERACTIVE">{t("items.interactive")}</option>
                </select>
              </LabeledField>
              <LabeledField text={t("items.placementTypeLabel")} hint={t("items.placementTypeHint")}>
                <select value={placementType} onChange={(event) => setPlacementType(event.target.value)} className={fieldClass}>
                  <option value="FLOOR">{t("items.floor")}</option>
                  <option value="WALL">{t("items.wall")}</option>
                  <option value="BOTH">{t("items.both")}</option>
                </select>
              </LabeledField>
              <LabeledField text={t("items.width")} hint={t("items.widthHint")}>
                <input type="number" min="1" value={width} onChange={(event) => setWidth(Number(event.target.value))} className={fieldClass} />
              </LabeledField>
              <LabeledField text={t("items.height")} hint={t("items.heightHint")}>
                <input type="number" min="1" value={height} onChange={(event) => setHeight(Number(event.target.value))} className={fieldClass} />
              </LabeledField>
              <LabeledField text={t("items.footprintWidthLabel")} hint={t("items.footprintWidthHint")}>
                <input type="number" min="1" max="8" value={footprintWidth} onChange={(event) => setFootprintWidth(Number(event.target.value))} className={fieldClass} />
              </LabeledField>
              <LabeledField text={t("items.footprintHeightLabel")} hint={t("items.footprintHeightHint")}>
                <input type="number" min="1" max="8" value={footprintHeight} onChange={(event) => setFootprintHeight(Number(event.target.value))} className={fieldClass} />
              </LabeledField>
              <LabeledField text={t("items.stackHeightLabel")} hint={t("items.stackHeightHint")}>
                <input type="number" min="0" value={stackHeight} onChange={(event) => setStackHeight(Number(event.target.value))} className={fieldClass} />
              </LabeledField>
              <LabeledField text={t("items.maxStackHeightLabel")} hint={t("items.maxStackHeightHint")}>
                <input type="number" min="0" value={maxStackHeight} onChange={(event) => setMaxStackHeight(Number(event.target.value))} className={fieldClass} />
              </LabeledField>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-5">
              {[
                [t("items.collidable"), isCollidable, setIsCollidable],
                [t("items.walkable"), walkable, setWalkable],
                [t("items.interactable"), isInteractable, setIsInteractable],
                [t("items.allowsStacking"), allowsStacking, setAllowsStacking],
                [t("items.canBeStacked"), canBeStacked, setCanBeStacked],
              ].map(([label, value, setter]) => (
                <label key={label as string} className="flex items-center gap-2 rounded-2xl border border-zinc-800 bg-black/50 p-3 text-sm text-zinc-300">
                  <input type="checkbox" checked={value as boolean} onChange={(event) => (setter as (checked: boolean) => void)(event.target.checked)} />
                  {label as string}
                </label>
              ))}
            </div>
            <label className="mt-3 flex items-center gap-2 rounded-2xl border border-dashed border-zinc-700 bg-black/50 p-3 text-sm text-zinc-300">
              <input type="checkbox" checked={singleFace} onChange={(event) => setSingleFace(event.target.checked)} />
              {t("items.singleFaceLabel")}
              <Tooltip content={t("items.singleFaceHint")}>
                <HelpCircle size={14} className="text-zinc-500" />
              </Tooltip>
            </label>
          </div>

          <FootprintEditor
            imageUrl={preview}
            imageWidth={Number(width)}
            imageHeight={Number(height)}
            footprints={footprints}
            surfaces={surfaces}
            syncDirections={syncDirections}
            onFootprintsChange={setFootprints}
            onSurfacesChange={setSurfaces}
            onSyncDirectionsChange={setSyncDirections}
            faceCount={singleFace ? 1 : 4}
          />
        </section>
      )}
      </fieldset>

      {!readOnly && (
        <button
          type="submit"
          disabled={isSaving}
          className="w-full rounded-2xl bg-yellow-400 px-5 py-4 font-black text-black transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? t("admin.savingEllipsis") : submitLabel ?? (mode === "creator" ? t("items.saveDraftButton") : t("items.saveItemButton"))}
        </button>
      )}
    </form>
  );
}
