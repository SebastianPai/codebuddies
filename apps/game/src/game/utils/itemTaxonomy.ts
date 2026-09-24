import {
  Archive,
  Armchair,
  Bath,
  BedDouble,
  Briefcase,
  CookingPot,
  Frame,
  Sofa,
  Sparkles,
  Sprout,
  Table2,
  Trees,
  Tv,
  type LucideIcon,
} from "lucide-react";

// Ambientes de un objeto de mundo. Se guardan en Item.tags como "room:<key>"
// (un item puede ir en varios: una planta sirve en sala y en exterior). El
// admin los marca en ItemEditor; mismas keys que ITEM_ROOM_KEYS de apps/web.
export const ROOM_TAG_PREFIX = "room:";

export const ITEM_ROOMS: Array<{ key: string; labelKey: string; icon: LucideIcon }> = [
  { key: "living", labelKey: "commerce.taxroomLiving", icon: Sofa },
  { key: "kitchen", labelKey: "commerce.taxroomKitchen", icon: CookingPot },
  { key: "bedroom", labelKey: "commerce.taxroomBedroom", icon: BedDouble },
  { key: "bathroom", labelKey: "commerce.taxroomBathroom", icon: Bath },
  { key: "office", labelKey: "commerce.taxroomOffice", icon: Briefcase },
  { key: "outdoor", labelKey: "commerce.taxroomOutdoor", icon: Trees },
];

export function getItemRooms(item: any): string[] {
  const tags: unknown = item?.tags;
  if (!Array.isArray(tags)) return [];
  return tags
    .filter((tag): tag is string => typeof tag === "string" && tag.startsWith(ROOM_TAG_PREFIX))
    .map((tag) => tag.slice(ROOM_TAG_PREFIX.length));
}

// Tipo funcional del mueble = WorldItemData.category (enum FurnitureCategory).
export const FURNITURE_TYPES: Array<{ key: string; labelKey: string; icon: LucideIcon }> = [
  { key: "CHAIR", labelKey: "commerce.taxtypeChair", icon: Armchair },
  { key: "TABLE", labelKey: "commerce.taxtypeTable", icon: Table2 },
  { key: "BED", labelKey: "commerce.taxtypeBed", icon: BedDouble },
  { key: "STORAGE", labelKey: "commerce.taxtypeStorage", icon: Archive },
  { key: "ELECTRONICS", labelKey: "commerce.taxtypeElectronics", icon: Tv },
  { key: "PLANT", labelKey: "commerce.taxtypePlant", icon: Sprout },
  { key: "WALL_ITEM", labelKey: "commerce.taxtypeWallItem", icon: Frame },
  { key: "DECORATION", labelKey: "commerce.taxtypeDecoration", icon: Sparkles },
];

export function getFurnitureType(item: any): string {
  return item?.worldData?.category ?? "DECORATION";
}

// Grupos de ropa por parte del cuerpo (AvatarItemData.slot).
export const AVATAR_GROUPS: Array<{ key: string; labelKey: string; slots: string[] }> = [
  { key: "head", labelKey: "commerce.taxavatarHead", slots: ["HEAD", "HAIR", "EYES"] },
  { key: "top", labelKey: "commerce.taxavatarTop", slots: ["SHIRT", "LEFT_ARM", "RIGHT_ARM"] },
  { key: "bottom", labelKey: "commerce.taxavatarBottom", slots: ["LEGS"] },
  { key: "shoes", labelKey: "commerce.taxavatarShoes", slots: ["SHOES"] },
  {
    key: "accessories",
    labelKey: "commerce.taxavatarAccessories",
    slots: ["ACCESSORY_HEAD", "ACCESSORY_FACE", "ACCESSORY_BACK", "ACCESSORY_LEFT", "ACCESSORY_RIGHT"],
  },
  { key: "body", labelKey: "commerce.taxavatarBody", slots: ["BODY"] },
];

export function getAvatarGroup(item: any): string | null {
  const slot = item?.slot ?? item?.avatarData?.slot;
  return AVATAR_GROUPS.find((group) => group.slots.includes(slot))?.key ?? null;
}
