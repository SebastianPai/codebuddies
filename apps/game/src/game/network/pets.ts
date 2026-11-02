// Cliente REST de la mascota. El backend calcula el decaimiento de stats de
// forma perezosa en cada GET, así que refrescar /pets/me alcanza para tener
// el estado al día.
import { apiDelete, apiGet, apiPost } from "./http";

export type PetMood = "HAPPY" | "CONTENT" | "SAD" | "SICK" | "SLEEPING";
export type PetAction = "feed" | "water" | "play";

// Trucos que se compran una vez (mismas claves y precios que PET_TRICKS de
// la API) y accesorio puesto (un ítem de categoría "petAccessory").
export const PET_TRICKS = { jump: 10, spin: 15, love: 20, dance: 25, flip: 35 } as const;
export type PetTrick = keyof typeof PET_TRICKS;
export const PET_ACCESSORY_CATEGORY = "petAccessory";
export interface PetAccessory {
  id: string;
  imageUrl: string | null;
  name: string | null;
}

export interface Pet {
  id: string;
  species: string;
  name: string;
  hunger: number;
  thirst: number;
  happiness: number;
  energy: number;
  health: number;
  sick: boolean;
  mood: PetMood;
  activeRoomId: string | null;
  cooldowns: { feed: number; water: number; play: number };
  tricks?: PetTrick[];
  accessory?: PetAccessory | null;
}

export interface PetAnimClip {
  key: string;
  trigger: string;
  row: number;
  startCol: number;
  framesCount: number;
  fps: number;
  loop: boolean;
  spriteSheetUrl: string | null;
  frameWidth: number | null;
  frameHeight: number | null;
}

export interface PetSpecies {
  key: string;
  name: string;
  spriteSheetUrl: string | null;
  frameWidth: number;
  frameHeight: number;
  directions: number;
  animations: PetAnimClip[];
}

export const getMyPet = () => apiGet<Pet | null>("/pets/me");

/** Mascota de alguien (o la propia) sacada en una sala: la ven todos. */
export interface RoomPet {
  id: string;
  species: string;
  name: string;
  mood: PetMood;
  activeRoomId: string | null;
  ownerUsername: string;
  tricks?: PetTrick[];
  accessory?: PetAccessory | null;
}
export const getRoomPets = (roomId: string) => apiGet<RoomPet[]>(`/pets/room/${encodeURIComponent(roomId)}`);
export const getPetSpeciesList = () => apiGet<PetSpecies[]>("/pet-species");
export const doPetAction = (action: PetAction) =>
  apiPost<Pet>(`/pets/me/actions/${action}`);
export const curePet = () => apiPost<Pet>("/pets/me/cure");
export const renamePet = (name: string) =>
  apiPost<Pet>("/pets/me/name", { name });
export const setPetRoom = (roomId: string | null) =>
  apiPost<Pet>("/pets/me/room", { roomId });
export const buyPetTrick = (trick: PetTrick) =>
  apiPost<Pet>(`/pets/me/tricks/${trick}`);
export const setPetAccessory = (itemId: string | null) =>
  apiPost<Pet>("/pets/me/accessory", { itemId });
export const releasePet = () => apiDelete<{ released: boolean }>("/pets/me");
