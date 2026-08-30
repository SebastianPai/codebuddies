// Cliente REST de la mascota. El backend calcula el decaimiento de stats de
// forma perezosa en cada GET, así que refrescar /pets/me alcanza para tener
// el estado al día.
import { apiDelete, apiGet, apiPost } from "./http";

export type PetMood = "HAPPY" | "CONTENT" | "SAD" | "SICK" | "SLEEPING";
export type PetAction = "feed" | "water" | "play";

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
export const getPetSpeciesList = () => apiGet<PetSpecies[]>("/pet-species");
export const doPetAction = (action: PetAction) =>
  apiPost<Pet>(`/pets/me/actions/${action}`);
export const curePet = () => apiPost<Pet>("/pets/me/cure");
export const renamePet = (name: string) =>
  apiPost<Pet>("/pets/me/name", { name });
export const setPetRoom = (roomId: string | null) =>
  apiPost<Pet>("/pets/me/room", { roomId });
export const releasePet = () => apiDelete<{ released: boolean }>("/pets/me");
