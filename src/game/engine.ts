// src/game/engine.ts
import { PlayerState } from '@game/core';

const players = new Map<string, PlayerState>();

export function createPlayer(id: string): PlayerState {
  const player: PlayerState = {
    id,
    x: 100,
    y: 100,
    currentAnimation: 'idle',
    xp: 0,
    inventory: [],
    hp: 100,
  };

  players.set(id, player);
  return player;
}

export function getPlayer(id: string): PlayerState | undefined {
  return players.get(id);
}

export function updatePlayerPosition(id: string, x: number, y: number): void {
  const player = players.get(id);
  if (player) {
    player.x = Math.max(0, x);
    player.y = Math.max(0, y);
  }
}

// Ya no usamos applyAction ni direcciones
export function setPlayerAnimation(id: string, animation: string): void {
  const player = players.get(id);
  if (player) {
    player.currentAnimation = animation;
  }
}
