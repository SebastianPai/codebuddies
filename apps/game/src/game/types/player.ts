import { AvatarData } from "./avatar";

export interface Player {
  id: string;
  x: number;
  y: number;
  room: string;
  username: string;
  avatar: AvatarData;
  level?: number;
  coins?: number;
  /** Ver @codebuddies/visual-effects — id del efecto elegido para el nombre flotante. */
  nameEffectId?: string | null;

  animation?: string; // opcional para animar movimiento

  direction?: "up" | "down" | "left" | "right"; // opcional para animar movimiento
  isMoving?: boolean; // opcional para animar movimiento
}
