// Cliente REST del mayordomo. A diferencia de la mascota no tiene stats: solo
// un look (npcKey -> catálogo NpcConfig) y la sala donde está "sacado". El
// catálogo de looks se comparte con /admin/butler vía GET /npcs?kind=BUTLER.
import { apiDelete, apiGet, apiPost } from "./http";
import type { PetAnimClip } from "./pets";

export interface Butler {
  id: string;
  npcKey: string;
  name: string;
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

export const getMyButler = () => apiGet<Butler | null>("/butlers/me");
export const getButlerCatalog = () =>
  apiGet<ButlerNpc[]>("/npcs?kind=BUTLER");
export const renameButler = (name: string) =>
  apiPost<Butler>("/butlers/me/name", { name });
export const setButlerRoom = (roomId: string | null) =>
  apiPost<Butler>("/butlers/me/room", { roomId });
export const releaseButler = () =>
  apiDelete<{ released: boolean }>("/butlers/me");
