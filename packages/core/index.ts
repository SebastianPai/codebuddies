export interface PlayerState {
  id: string;
  x: number;
  y: number;
  hp?: number;
  currentAnimation?: string;
  xp: number;
  inventory: string[];

  // 🔥 NUEVO (esto es lo que te falta)
  roomId?: string;
  roomWidth?: number;
  roomHeight?: number;
}
export interface Challenge {
  id: string;
  name: string;
  description: string;
  script: (playerState: PlayerState, worldState?: any) => void | Promise<void>;
  reward?: (playerState: PlayerState) => void;
  active: boolean;
}

export interface GameAction {
  type: string;
  entityId: string;
  direction?: "up" | "down" | "left" | "right";
}
