// Cliente REST del mayordomo. A diferencia de la mascota no tiene stats: solo
// un look (npcKey -> catálogo NpcConfig) y la sala donde está "sacado". El
// catálogo de looks se comparte con /admin/butler vía GET /npcs?kind=BUTLER.
import { apiDelete, apiGet, apiPost } from "./http";
import type { PetAnimClip } from "./pets";

export interface Butler {
  id: string;
  npcKey: string;
  name: string;
  /** Sala a la que pertenece (uno por sala). */
  roomId?: string | null;
  activeRoomId: string | null;
}

export interface ButlerNpc {
  key: string;
  name: string;
  spriteSheetUrl: string | null;
  frameWidth: number;
  frameHeight: number;
  directions: number;
  animations: PetAnimClip[];
  greetingLines: string[];
  idleLines: string[];
}

/** Mi mayordomo de esta sala (uno por sala). */
export const getMyButler = (roomId?: string | null) =>
  apiGet<Butler | null>(roomId ? `/butlers/me?roomId=${encodeURIComponent(roomId)}` : "/butlers/me");

/** Mayordomo de alguien sacado en una sala: lo ven todos. */
export type RoomButler = Butler & { ownerUsername: string };
export const getRoomButlers = (roomId: string) => apiGet<RoomButler[]>(`/butlers/room/${encodeURIComponent(roomId)}`);
export const getButlerCatalog = () =>
  apiGet<ButlerNpc[]>("/npcs?kind=BUTLER");
export const renameButler = (roomId: string, name: string) =>
  apiPost<Butler>("/butlers/me/name", { roomId, name });
/** Sacar (visible) o guardar el mayordomo de esta sala. */
export const setButlerVisible = (roomId: string, visible: boolean) =>
  apiPost<Butler>("/butlers/me/visible", { roomId, visible });
export const releaseButler = (roomId: string) =>
  apiDelete<{ released: boolean }>(`/butlers/me?roomId=${encodeURIComponent(roomId)}`);
