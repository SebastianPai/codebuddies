import Phaser from "phaser";
import ModularPlayer from "../players/ModularPlayer";
import type { AvatarSlot } from "../types/avatar";
import { syncActorDepth } from "../iso/IsoActorDepth";
import { BubbleStack, createBubbleElement, createHudAnchor, hudStyles, paintBubbleFace, snapshotHead } from "../hud/domHud";
import { CHAT_BUBBLE_THEMES, resolveChatBubbleTheme } from "../hud/nameplateStyles";

// Empleado de CodeStudio armado por piezas (cuerpo, pelo, ropa), igual que
// un jugador: usa ModularPlayer. Se comporta como los empleados con skin
// (ver ButlerSystem en modo empleado): nombre arriba, clic para su carta,
// silla propia y todo sincronizado por reloj, así todos los que miran la
// oficina ven lo mismo sin mandar nada por red.

const SYNC_SLOT_MS = 9000;
const WALK_SPEED = 46; // px/seg
const ARRIVE_DIST = 4;
const LEAVE_SEAT_CHANCE = 0.3;
const BUBBLE_MS = 9000;
// Igual que el nombre de los jugadores (PlayerHUD): sobre el origen del avatar.
const HUD_OFFSET_Y = 42;
const BUBBLE_THEME_IDS = Object.keys(CHAT_BUBBLE_THEMES);

function seedHash(text: string) {
  let value = 2166136261;
  for (let index = 0; index < text.length; index++) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

function seededRng(seed: string) {
  let state = seedHash(seed);
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export type EmployeeAvatarOptions = {
  id: string;
  name: string;
  subtitle: string;
  avatar: { skinColor: number; slots: AvatarSlot[] };
  lines: string[];
  greeting: string | null;
  wanderRadius: number;
  seat: () => { x: number; y: number } | null;
  onSelect: () => void;
};

export default class EmployeeAvatarSystem {
  private actor?: ModularPlayer;
  private hud?: { element: Phaser.GameObjects.DOMElement; root: HTMLDivElement; stack: BubbleStack };
  private lines: string[];
  private lastLine = "";
  private lastSlot = -1;
  private target: { x: number; y: number } | null = null;
  private home = { x: 0, y: 0 };
  private greetAt = 0;
  // Retrato (cabeza) para los globos, como los de los jugadores.
  private face: HTMLCanvasElement | null = null;
  private faceCapture: Promise<HTMLCanvasElement | null> | null = null;
  private destroyed = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly options: EmployeeAvatarOptions,
  ) {
    this.lines = options.lines;
  }

  sync(): void {
    if (this.actor || this.destroyed) return;
    const grid = (this.scene as any).isoGrid;
    const center = grid?.groundCenter?.(Math.floor(grid.width / 2), Math.floor(grid.height / 2)) ?? { x: 0, y: 0 };
    const seat = this.options.seat();
    const start = seat ?? this.randomPoint(center.x, center.y, this.options.wanderRadius, seededRng(this.options.id)) ?? center;
    this.home = { x: start.x, y: start.y };
    this.actor = new ModularPlayer(this.scene, start.x, start.y, this.options.avatar.slots, this.options.avatar.skinColor);
    syncActorDepth(this.scene, this.actor);
    this.mountHud();
    this.makeClickable();
    // Saluda un rato después de aparecer, no todos a la vez.
    this.greetAt = this.scene.time.now + 900 + Math.random() * 8000;
  }

  private makeClickable() {
    if (!this.actor) return;
    // Zona de clic fija del tamaño de una persona (el avatar se arma async;
    // el origen del avatar queda a media altura y los pies ~85 px abajo).
    const hit = new Phaser.Geom.Rectangle(-24, -HUD_OFFSET_Y, 48, HUD_OFFSET_Y + 92);
    this.actor.setInteractive(hit, Phaser.Geom.Rectangle.Contains);
    if (this.actor.input) this.actor.input.cursor = "pointer";
    this.actor.on("pointerdown", (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      this.options.onSelect();
    });
  }

  private mountHud() {
    const anchor = createHudAnchor(this.scene);
    const stack = new BubbleStack();
    const plate = document.createElement("div");
    plate.className = hudStyles.plate;
    const name = document.createElement("span");
    name.className = hudStyles.nameDefault;
    name.textContent = this.options.name;
    name.style.color = `hsl(${seedHash(this.options.id) % 360} 85% 72%)`;
    const role = document.createElement("span");
    role.className = hudStyles.level;
    role.textContent = this.options.subtitle;
    plate.append(name, role);
    anchor.root.append(stack.element, plate);
    this.hud = { ...anchor, stack };
  }

  /** Frases nuevas (la oficina cambia). */
  setLines(lines: string[]): void {
    this.lines = lines;
  }

  /** Dice esta frase ya (charlas entre empleados). */
  speak(text: string): void {
    if (!this.hud || !text.trim()) return;
    this.lastLine = text;
    const bubble = createBubbleElement({
      message: text,
      theme: resolveChatBubbleTheme(BUBBLE_THEME_IDS[seedHash(this.options.id) % BUBBLE_THEME_IDS.length]),
      name: this.options.name,
      face: this.face,
      withFace: true,
    });
    this.hud.stack.push(bubble, this.scene.time.now, BUBBLE_MS);
    if (!this.face) void this.captureFace().then((face) => face && paintBubbleFace(bubble, face));
  }

  /** Captura la cabeza del avatar una vez (ya armado) y la reusa en cada globo. */
  private captureFace(): Promise<HTMLCanvasElement | null> {
    if (this.face) return Promise.resolve(this.face);
    if (!this.actor) return Promise.resolve(null);
    if (!this.faceCapture) {
      this.faceCapture = snapshotHead(this.scene, this.actor)
        .then((face) => {
          if (face) this.face = face;
          return this.face;
        })
        .catch(() => null)
        .finally(() => {
          this.faceCapture = null;
        });
    }
    return this.faceCapture;
  }

  private walkable(x: number, y: number) {
    const check = (this.scene as any).isGroundWalkable;
    return typeof check === "function" ? check.call(this.scene, x, y) : true;
  }

  private randomPoint(cx: number, cy: number, radius: number, rng: () => number) {
    for (let attempt = 0; attempt < 10; attempt++) {
      const angle = rng() * Math.PI * 2;
      const r = radius * (0.35 + rng() * 0.65);
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r * 0.5;
      if (this.walkable(x, y) && this.walkable((x + cx) / 2, (y + cy) / 2)) return { x, y };
    }
    return null;
  }

  /** Mismo destino y frase para todos los que miran: salen de (id, slot). */
  private decide(slot: number) {
    if (!this.actor) return;
    const rng = seededRng(`${this.options.id}:${slot}`);
    const seat = this.options.seat();
    const here = this.actor.getGroundPoint();
    const roll = rng();
    if (seat) {
      const point = roll < LEAVE_SEAT_CHANCE ? this.randomPoint(seat.x, seat.y, this.options.wanderRadius, rng) : null;
      this.target = point ?? (Math.hypot(here.x - seat.x, here.y - seat.y) > ARRIVE_DIST ? seat : null);
    } else if (roll < 0.6) {
      this.target = this.randomPoint(this.home.x, this.home.y, this.options.wanderRadius, rng);
    }
    if (this.lines.length > 0 && rng() < 0.33) {
      const order = this.lines.map((_, index) => index).sort((a, b) => seedHash(`${this.options.id}:${a}`) - seedHash(`${this.options.id}:${b}`));
      const line = this.lines[order[Math.floor(slot / 3) % order.length]];
      if (line && line !== this.lastLine) this.speak(line);
    }
  }

  update(delta: number): void {
    if (!this.actor || this.destroyed) return;
    const slot = Math.floor(Date.now() / SYNC_SLOT_MS);
    if (slot !== this.lastSlot) {
      this.lastSlot = slot;
      this.decide(slot);
    }
    if (this.greetAt > 0 && this.scene.time.now >= this.greetAt) {
      this.greetAt = 0;
      if (this.options.greeting) this.speak(this.options.greeting);
    }

    const here = this.actor.getGroundPoint();
    if (this.target) {
      const dx = this.target.x - here.x;
      const dy = this.target.y - here.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= ARRIVE_DIST) {
        this.actor.setGroundPosition(this.target.x, this.target.y);
        this.target = null;
        this.actor.currentDirection = "down";
        this.actor.playIdle();
      } else {
        const step = Math.min(dist, (WALK_SPEED * delta) / 1000);
        this.actor.setGroundPosition(here.x + (dx / dist) * step, here.y + (dy / dist) * step);
        const direction = Math.abs(dx) > Math.abs(dy) * 2 ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
        if (!this.actor.isMoving || this.actor.currentDirection !== direction) this.actor.playAnimation(direction);
      }
    }
    syncActorDepth(this.scene, this.actor);

    if (this.hud) {
      this.hud.element.setPosition(this.actor.x, this.actor.y - HUD_OFFSET_Y);
      this.hud.element.setDepth(Math.round(this.actor.getGroundPoint().y));
      this.hud.stack.update(this.scene.time.now);
    }
  }

  destroy(): void {
    this.destroyed = true;
    this.hud?.stack.clear();
    this.hud?.element.destroy();
    this.hud = undefined;
    this.actor?.destroy();
    this.actor = undefined;
  }
}
