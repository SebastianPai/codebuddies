import Phaser from "phaser";
import { loadTextureOnce } from "../utils/phaserAssetCache";
import { getMyButler, getButlerCatalog, type ButlerNpc, type RoomButler } from "../network/butlers";
import type { PetAnimClip } from "../network/pets";
import { resolveActorGroundPoint, syncActorDepth } from "../iso/IsoActorDepth";
import { measureOpaqueBox, playerVisualHeight } from "../utils/spriteMeasure";
import {
  BubbleStack,
  createBubbleElement,
  createHudAnchor,
  frameToCanvas,
  hudStyles,
} from "../hud/domHud";
import { CHAT_BUBBLE_THEMES, resolveChatBubbleTheme } from "../hud/nameplateStyles";

const BUBBLE_THEME_IDS = Object.keys(CHAT_BUBBLE_THEMES);

// Empleados (con colorSeed): cada decisión sale de su semilla + la hora,
// así dos personas en la misma oficina ven lo mismo sin mandar nada por red.
const SYNC_SLOT_MS = 9000;

function seededRng(seed: string) {
  let state = seedHash(seed);
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function seedHash(text: string) {
  let value = 2166136261;
  for (let index = 0; index < text.length; index++) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

// El mayordomo comparte el renderizado direccional con PetSystem (mismo
// layout de spritesheet: `directions` filas por clip, orden estándar de
// direcciones), pero NO sigue al jugador: deambula despacio alrededor de un
// punto fijo ("home") con pausas largas — es un mayordomo, no un cachorro.
// Además dice una frase al aparecer (greetingLines) y frases sueltas cada
// tanto mientras está quieto (idleLines).

const DIRECTION_ORDER = ["S", "N", "SE", "NW", "E", "W", "NE", "SW"];
const NAME_BY_BUCKET = ["E", "SE", "S", "SW", "W", "NW", "N", "NE"];

const WANDER_SPEED = 42; // px/seg — la mitad del gato, andar pausado
const WANDER_RADIUS = 64; // se aleja como mucho esto del punto "home"
const ARRIVE_DIST = 4; // llegó al destino
const PAUSE_MIN_MS = 3800; // parado entre paseos
const PAUSE_MAX_MS = 11000;
const WALK_TIMEOUT_MS = 4500; // si no llegó en este tiempo, se rinde y para
// A los ~7s quieto (con jitter) elige quedarse sentado.
const REST_MIN_MS = 7000;
const REST_MAX_MS = 12000;
const GREETING_DELAY_MS = 700; // saluda poco después de aparecer
const BUBBLE_MS = 9000; // cuánto dura una frase en pantalla (sube en cascada)
const IDLE_LINE_MIN_MS = 16000;
const IDLE_LINE_MAX_MS = 34000;

type Mode = "PAUSE" | "WALK";

/** Empleados de CodeStudio: nombre fijo arriba (como un jugador) y clic. */
export type ButlerOptions = {
  nameplate?: { name: string; subtitle?: string };
  onSelect?: () => void;
  /** Cuánto se aleja al pasear (px). Por defecto WANDER_RADIUS. */
  wanderRadius?: number;
  /** Semilla de colores (nombre y globo); sin ella, tema oscuro fijo. */
  colorSeed?: string;
  /** Su silla en la oficina: ahí vuelve y se sienta. Se pregunta seguido (los muebles cargan después). */
  seat?: () => { x: number; y: number } | null;
};

// Con silla: casi siempre sentado; de vez en cuando se levanta a dar una vuelta.
const LEAVE_SEAT_CHANCE = 0.3;
const SEAT_ARRIVE_DIST = 6;

export default class ButlerSystem {
  private scene: Phaser.Scene;
  private sprite?: Phaser.GameObjects.Sprite;
  private npc: ButlerNpc | null = null;
  private npcKey: string | null = null;
  private textureKey?: string;
  private sheetKeys = new Map<string, string>();

  private dirIndex = 0;
  private animKey = "";
  private animTime = 0;
  private idleTime = 0;
  private restThreshold = REST_MIN_MS;
  private resting = false;
  private syncing = false;
  private destroyed = false;

  // Deambular
  private timer = 0; // reloj interno acumulado (ms)
  private mode: Mode = "PAUSE";
  private modeUntil = 0;
  private homeX = 0;
  private homeY = 0;
  private targetX = 0;
  private targetY = 0;
  private lastX = 0;
  private lastY = 0;

  // Frases
  private greetingAt = 0; // -1 = ya saludó
  private nextIdleLineAt = 0;
  // Globo en HTML sobre el canvas (mismo sistema que las burbujas de los
  // jugadores, ver hud/domHud.ts): ancla que sigue al sprite + burbuja.
  private hud?: { element: Phaser.GameObjects.DOMElement; root: HTMLDivElement; stack: BubbleStack };
  private butlerName = "";
  private lineBag: string[] = [];
  private lastLine = "";
  private seatPoint: { x: number; y: number } | null = null;

  /**
   * Sin `record`: el mayordomo propio (lee /butlers/me). Con `record`: el
   * de otra persona sacado en esta sala (lo ven todos los que entran).
   */
  constructor(
    scene: Phaser.Scene,
    private readonly record?: RoomButler,
    // Empleados de CodeStudio en su oficina: traen su propio look (NPC
    // EMPLOYEE o el mayordomo) y frases, sin pasar por el catálogo.
    private readonly npcOverride?: ButlerNpc,
    private readonly options: ButlerOptions = {},
  ) {
    this.scene = scene;
  }

  /** Lee /butlers/me (o usa el registro dado) y decide si debe estar en esta sala. */
  async sync(): Promise<void> {
    if (this.syncing || this.destroyed) return;
    this.syncing = true;
    try {
      const roomId: string | null =
        (typeof window !== "undefined" && (window as any).currentRoomId) || null;
      const mine = this.record ?? (await getMyButler().catch(() => null));
      // Destruido mientras esperaba la red (cambio de sala/reconexión): no
      // crear un mayordomo huérfano.
      if (this.destroyed) return;

      const shouldShow = !!mine && !!roomId && mine.activeRoomId === roomId;
      if (!shouldShow) {
        this.despawn();
        return;
      }
      this.butlerName = mine!.name?.trim() || "";
      if (this.sprite && this.npcKey === mine!.npcKey) return; // ya está

      const catalog = this.npcOverride ? [this.npcOverride] : await getButlerCatalog().catch(() => [] as ButlerNpc[]);
      if (this.destroyed) return;
      const npc = catalog.find((n) => n.key === mine!.npcKey) ?? null;
      if (!npc?.spriteSheetUrl) {
        this.despawn();
        return;
      }
      await this.spawn(npc);
    } finally {
      this.syncing = false;
    }
  }

  private async spawn(npc: ButlerNpc): Promise<void> {
    this.despawn();
    this.npc = npc;
    this.npcKey = npc.key;

    // Punto de APOYO del jugador (sus pies): el sprite del mayordomo usa
    // origin(0.5, 1), así que su (x, y) también es un punto de apoyo.
    const player = (this.scene as any).player;
    const playerGround = player
      ? resolveActorGroundPoint(player)
      : { x: 0, y: 0 };
    const px = playerGround.x;
    const py = playerGround.y;

    const urls = new Set<string>([npc.spriteSheetUrl!]);
    for (const c of npc.animations ?? []) {
      if (c.spriteSheetUrl) urls.add(c.spriteSheetUrl);
    }
    await Promise.all(
      [...urls].map(async (url) => {
        try {
          this.sheetKeys.set(url, await loadTextureOnce(this.scene, url));
        } catch {
          /* si un sheet falla, ese clip simplemente no se dibuja */
        }
      }),
    );
    if (this.destroyed) return;
    this.textureKey = this.sheetKeys.get(npc.spriteSheetUrl!);
    if (!this.textureKey) return;

    // "Home" = un paso al costado del jugador; a partir de ahí deambula.
    // Empleados: aparecen sentados en su silla, o repartidos por la sala.
    const seat = this.options.seat?.() ?? null;
    // Sin silla: alrededor del centro de la sala (igual para todos los que miran).
    const grid = (this.scene as any).isoGrid;
    const center = this.options.colorSeed && grid ? grid.groundCenter?.(Math.floor(grid.width / 2), Math.floor(grid.height / 2)) : null;
    const cx = center?.x ?? px;
    const cy = center?.y ?? py;
    const scattered =
      !seat && this.options.nameplate
        ? this.randomPoint(cx, cy, this.options.wanderRadius ?? WANDER_RADIUS, this.options.colorSeed ? seededRng(this.options.colorSeed) : Math.random)
        : null;
    this.seatPoint = seat;
    this.homeX = seat?.x ?? scattered?.x ?? px - 28;
    this.homeY = seat?.y ?? scattered?.y ?? py;
    this.sprite = this.scene.add
      .sprite(this.homeX, this.homeY, this.textureKey)
      .setOrigin(0.5, 1);
    this.applyScale();
    syncActorDepth(this.scene, this.sprite);
    this.mountNameplate();
    if (this.options.onSelect) {
      this.sprite.setInteractive({ useHandCursor: true });
      this.sprite.on(
        "pointerdown",
        (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
          // Que no salga caminando hacia el tile además de abrir la carta.
          event.stopPropagation();
          this.options.onSelect?.();
        },
      );
    }
    this.lastX = this.homeX;
    this.lastY = this.homeY;
    this.targetX = this.homeX;
    this.targetY = this.homeY;

    this.timer = 0;
    this.mode = "PAUSE";
    this.modeUntil = this.randPause();
    this.idleTime = 0;
    this.resting = false;
    this.restThreshold = this.randRest();
    if (seat) {
      this.resting = true;
      this.idleTime = this.restThreshold;
    }
    this.greetingAt = this.timer + GREETING_DELAY_MS + (this.options.nameplate ? Math.random() * 8000 : 0);
    this.nextIdleLineAt = this.timer + this.randIdleGap();

    this.animKey = "";
    this.setClipFrame(this.pickClip(false), 0);
  }

  // Tamaño real del dibujo (sin el margen transparente de la celda) para
  // que el mayordomo mida lo mismo que un avatar, no el doble. Antes se
  // dibujaba la celda 1:1 (128×224 en la hoja actual) y quedaba gigante.
  private displayScale = 1;
  private figureHeight = 0;

  private applyScale(): void {
    if (!this.sprite || !this.textureKey || !this.npc) return;
    const fw = Math.max(1, Number(this.npc.frameWidth) || 32);
    const fh = Math.max(1, Number(this.npc.frameHeight) || 48);
    const box = measureOpaqueBox(this.scene, this.textureKey, 0, 0, fw, fh);
    const figure = box?.height ?? fh * 0.7;
    const target = playerVisualHeight((this.scene as any).player) * 1.05;
    this.displayScale = Phaser.Math.Clamp(target / figure, 0.25, 1.5);
    this.figureHeight = figure * this.displayScale;
    this.sprite.setScale(this.displayScale);
  }

  private ensureHud() {
    if (!this.hud) {
      const anchor = createHudAnchor(this.scene);
      const stack = new BubbleStack();
      anchor.root.appendChild(stack.element);
      this.hud = { ...anchor, stack };
    }
    return this.hud;
  }

  /** Nombre (y rol) siempre visibles sobre la cabeza, con el estilo de los jugadores. */
  private mountNameplate() {
    const label = this.options.nameplate;
    if (!label) return;
    const hud = this.ensureHud();
    const plate = document.createElement("div");
    plate.className = hudStyles.plate;
    const name = document.createElement("span");
    name.className = hudStyles.nameDefault;
    name.textContent = label.name;
    if (this.options.colorSeed) name.style.color = `hsl(${seedHash(this.options.colorSeed) % 360} 85% 72%)`;
    plate.appendChild(name);
    if (label.subtitle) {
      const role = document.createElement("span");
      role.className = hudStyles.level;
      role.textContent = label.subtitle;
      plate.appendChild(role);
    }
    hud.root.appendChild(plate);
    this.positionBubble();
  }

  despawn(): void {
    this.clearBubble();
    this.hud?.element.destroy();
    this.hud = undefined;
    this.sprite?.destroy();
    this.sprite = undefined;
    this.npc = null;
    this.npcKey = null;
    this.textureKey = undefined;
    this.sheetKeys.clear();
  }

  destroy(): void {
    this.destroyed = true;
    this.despawn();
  }

  private randPause() {
    return this.timer + PAUSE_MIN_MS + Math.random() * (PAUSE_MAX_MS - PAUSE_MIN_MS);
  }
  private randRest() {
    return REST_MIN_MS + Math.random() * (REST_MAX_MS - REST_MIN_MS);
  }
  private randIdleGap() {
    return IDLE_LINE_MIN_MS + Math.random() * (IDLE_LINE_MAX_MS - IDLE_LINE_MIN_MS);
  }

  // ---- Render de clips (idéntico criterio que PetSystem) -------------------

  private clipDims(clip: PetAnimClip) {
    return {
      fw: Math.max(1, Number(clip.frameWidth || this.npc?.frameWidth) || 32),
      fh: Math.max(1, Number(clip.frameHeight || this.npc?.frameHeight) || 32),
    };
  }

  private byTrigger(trigger: string): PetAnimClip | null {
    return (this.npc?.animations ?? []).find((c) => c.trigger === trigger) ?? null;
  }

  private staticIdleClip(): PetAnimClip | null {
    const base =
      this.byTrigger("MOVING") ?? (this.npc?.animations ?? [])[0] ?? null;
    if (!base) return null;
    return {
      key: "idle-static",
      trigger: "IDLE",
      row: base.row,
      startCol: 0,
      framesCount: 1,
      fps: 1,
      loop: false,
      spriteSheetUrl: base.spriteSheetUrl,
      frameWidth: base.frameWidth,
      frameHeight: base.frameHeight,
    };
  }

  private pickClip(moving: boolean): PetAnimClip | null {
    const clips = this.npc?.animations ?? [];
    if (!clips.length) return null;
    if (moving) return this.byTrigger("MOVING") ?? clips[0];
    if (this.resting) {
      return (
        this.byTrigger("SIT") ??
        this.byTrigger("IDLE") ??
        this.staticIdleClip()
      );
    }
    return this.byTrigger("IDLE") ?? this.staticIdleClip();
  }

  private setClipFrame(clip: PetAnimClip | null, frame: number): void {
    if (!clip || !this.sprite) return;
    const url = clip.spriteSheetUrl || this.npc?.spriteSheetUrl || "";
    const texKey = this.sheetKeys.get(url) ?? this.textureKey;
    if (!texKey) return;
    const tex = this.scene.textures.get(texKey);

    const { fw, fh } = this.clipDims(clip);
    const col = clip.startCol + frame;
    const perDirection =
      !clip.spriteSheetUrl &&
      (clip.trigger === "MOVING" || clip.trigger === "IDLE");
    const row = clip.row + (perDirection ? this.dirIndex : 0);
    const name = `butler-${texKey}-${row}-${col}-${fw}x${fh}`;
    if (!tex.has(name)) {
      tex.add(name, 0, col * fw, row * fh, fw, fh);
    }
    if (this.sprite.texture.key !== texKey) {
      this.sprite.setTexture(texKey, name);
    } else {
      this.sprite.setFrame(name);
    }
  }

  private dirFromVector(dx: number, dy: number): number {
    if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) return this.dirIndex;
    const bucket =
      ((Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) % 8) + 8) % 8;
    const name = NAME_BY_BUCKET[bucket];
    const idx = DIRECTION_ORDER.indexOf(name);
    const dirs = this.npc?.directions || 8;
    if (idx < 0) return 0;
    return idx < dirs ? idx : idx % dirs;
  }

  // ---- Frases / globo ----------------------------------------------------

  /** Dice esta frase ya (charlas entre empleados que arma RoomCompanions). */
  speak(text: string): void {
    this.say([text], true);
  }

  /** Frases nuevas (la oficina cambia): se usan desde la próxima que diga. */
  setLines(greetingLines: string[], idleLines: string[]): void {
    if (!this.npc) return;
    const same = this.npc.idleLines.join("|") === idleLines.join("|");
    this.npc = { ...this.npc, greetingLines, idleLines };
    if (!same) this.lineBag = [];
  }

  /** Siguiente frase sin repetir: dice todas (en orden al azar) antes de volver a empezar. */
  private nextLine(lines: string[]): string {
    const pool = lines.map((line) => line.trim()).filter(Boolean);
    if (pool.length === 0) return "";
    if (this.lineBag.length === 0) {
      this.lineBag = [...pool].sort(() => Math.random() - 0.5);
      if (this.lineBag.length > 1 && this.lineBag[0] === this.lastLine) this.lineBag.push(this.lineBag.shift()!);
    }
    this.lastLine = this.lineBag.shift() ?? "";
    return this.lastLine;
  }

  private say(lines: string[] | undefined, fresh = false): void {
    if (!this.sprite || !lines || lines.length === 0) return;
    // El saludo es siempre la primera (la más importante); el resto, sin repetir.
    const text = fresh ? lines[0]?.trim() : this.nextLine(lines);
    if (!text) return;
    if (fresh) this.lastLine = text;

    const hud = this.ensureHud();
    const bubble = createBubbleElement({
      message: text,
      // Tema oscuro fijo: se distingue de un jugador (que usa el suyo).
      theme: resolveChatBubbleTheme(
        this.options.colorSeed ? BUBBLE_THEME_IDS[seedHash(this.options.colorSeed) % BUBBLE_THEME_IDS.length] : "midnight",
      ),
      name: this.butlerName || this.npc?.name || undefined,
      face: frameToCanvas(this.sprite.frame),
    });
    // Mismo historial en cascada que los jugadores (BubbleStack).
    hud.stack.push(bubble, this.scene.time.now, BUBBLE_MS);
    this.positionBubble();
  }

  private positionBubble(): void {
    if (!this.hud || !this.sprite) return;
    // Globo justo sobre la cabeza del dibujo (no sobre el borde de la celda).
    const head = this.figureHeight || Math.max(1, Number(this.npc?.frameHeight) || 48) * this.displayScale;
    this.hud.element.setPosition(this.sprite.x, this.sprite.y - head - 6);
    this.hud.element.setDepth(Math.round(this.sprite.y));
  }

  private clearBubble(): void {
    this.hud?.stack.clear();
  }

  // ---- Deambular ---------------------------------------------------------

  private walkable(x: number, y: number): boolean {
    const check = (this.scene as any).isGroundWalkable;
    return typeof check === "function" ? check.call(this.scene, x, y) : true;
  }

  /** Punto caminable al azar alrededor de (cx, cy); null si no encontró. */
  private randomPoint(cx: number, cy: number, radius: number, rng: () => number = Math.random) {
    for (let attempt = 0; attempt < 10; attempt++) {
      const angle = rng() * Math.PI * 2;
      const r = radius * (0.35 + rng() * 0.65);
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r * 0.5; // iso: el piso se ve achatado
      if (this.walkable(x, y) && this.walkable((x + cx) / 2, (y + cy) / 2)) return { x, y };
    }
    return null;
  }

  private atSeat(): boolean {
    if (!this.seatPoint || !this.sprite) return false;
    return Math.hypot(this.sprite.x - this.seatPoint.x, this.sprite.y - this.seatPoint.y) <= SEAT_ARRIVE_DIST;
  }

  private walkTo(x: number, y: number) {
    this.targetX = x;
    this.targetY = y;
    this.mode = "WALK";
    // Tiempo suficiente para el trayecto (antes eran 4.5 s fijos: pasos cortos).
    const dist = this.sprite ? Math.hypot(x - this.sprite.x, y - this.sprite.y) : 0;
    this.modeUntil = this.timer + Math.max(WALK_TIMEOUT_MS, (dist / WANDER_SPEED) * 1000 + 1500);
    this.resting = false;
    this.idleTime = 0;
  }

  private lastSlot = -1;

  /** Lo mismo para todos los que miran: destino y frase salen de (semilla, slot). */
  private syncedDecide(slot: number) {
    if (!this.sprite || !this.npc) return;
    const seed = this.options.colorSeed!;
    const rng = seededRng(`${seed}:${slot}`);
    const seat = this.options.seat?.() ?? null;
    this.seatPoint = seat;
    const radius = this.options.wanderRadius ?? WANDER_RADIUS;
    const wander = rng();
    if (seat) {
      const point = wander < LEAVE_SEAT_CHANCE ? this.randomPoint(seat.x, seat.y, radius, rng) : null;
      if (point) this.walkTo(point.x, point.y);
      else if (!this.atSeat()) this.walkTo(seat.x, seat.y);
    } else if (wander < 0.6) {
      const point = this.randomPoint(this.homeX, this.homeY, radius, rng);
      if (point) this.walkTo(point.x, point.y);
    }
    // Frase: más o menos cada 3 slots, recorriendo su lista en orden
    // barajado por su semilla (no repite hasta decirlas todas).
    const lines = this.npc.idleLines ?? [];
    if (lines.length > 0 && rng() < 0.33) {
      const cycle = Math.floor(slot / 3);
      const order = lines.map((_, index) => index).sort((a, b) => seedHash(`${seed}:${a}`) - seedHash(`${seed}:${b}`));
      const line = lines[order[cycle % order.length]];
      if (line && line !== this.lastLine) {
        this.say([line], true);
      }
    }
  }

  private decideNext() {
    const seat = this.options.seat?.() ?? null;
    this.seatPoint = seat;
    const radius = this.options.wanderRadius ?? WANDER_RADIUS;
    if (seat && this.sprite) {
      if (!this.atSeat()) return this.walkTo(seat.x, seat.y);
      // Sentado en su puesto: casi siempre se queda trabajando.
      if (Math.random() >= LEAVE_SEAT_CHANCE) {
        this.modeUntil = this.randPause();
        return;
      }
      const point = this.randomPoint(seat.x, seat.y, radius);
      if (point) return this.walkTo(point.x, point.y);
      this.modeUntil = this.randPause();
      return;
    }
    const point = this.randomPoint(this.homeX, this.homeY, radius);
    if (point) return this.walkTo(point.x, point.y);
    this.modeUntil = this.randPause();
  }

  // ---- Loop ------------------------------------------------------------

  update(delta: number): void {
    if (!this.sprite || !this.npc) return;
    this.timer += delta;

    // Saludo de bienvenida (una vez).
    if (this.greetingAt > 0 && this.timer >= this.greetingAt) {
      this.greetingAt = -1;
      this.say(this.npc.greetingLines, true);
    }

    // Empleados: decisiones sincronizadas por reloj (ver SYNC_SLOT_MS).
    const synced = !!this.options.colorSeed;
    if (synced) {
      const slot = Math.floor(Date.now() / SYNC_SLOT_MS);
      if (slot !== this.lastSlot) {
        this.lastSlot = slot;
        this.syncedDecide(slot);
      }
    } else if (this.timer >= this.modeUntil) {
      if (this.mode === "PAUSE") {
        this.decideNext();
      } else {
        this.mode = "PAUSE";
        this.modeUntil = this.randPause();
      }
    }

    let moving = false;
    if (this.mode === "WALK") {
      const dx = this.targetX - this.sprite.x;
      const dy = this.targetY - this.sprite.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= ARRIVE_DIST) {
        this.mode = "PAUSE";
        this.modeUntil = this.randPause(); // randPause() ya incluye this.timer
        // Llegó a su silla: se sienta de una (mirando hacia abajo, al frente).
        if (this.atSeat()) {
          this.sprite.setPosition(this.seatPoint!.x, this.seatPoint!.y);
          this.resting = true;
          this.idleTime = this.restThreshold;
          this.dirIndex = 0;
        }
      } else {
        const step = (WANDER_SPEED * delta) / 1000;
        const k = Math.min(1, step / dist);
        this.sprite.x += dx * k;
        this.sprite.y += dy * k;
        moving = true;
      }
    }

    if (moving) {
      this.idleTime = 0;
      this.resting = false;
      this.restThreshold = this.randRest();
      this.dirIndex = this.dirFromVector(
        this.sprite.x - this.lastX,
        this.sprite.y - this.lastY,
      );
    } else {
      const before = this.idleTime;
      this.idleTime += delta;
      if (before < this.restThreshold && this.idleTime >= this.restThreshold) {
        this.resting = true;
      }
      // Frase suelta: solo cuando está quieto, para que se lea natural.
      if (!synced && this.timer >= this.nextIdleLineAt) {
        this.say(this.npc.idleLines);
        this.nextIdleLineAt = this.timer + this.randIdleGap();
      }
    }

    this.lastX = this.sprite.x;
    this.lastY = this.sprite.y;
    syncActorDepth(this.scene, this.sprite);

    // Globos: siguen al sprite; la pila los hace subir y desvanecerse sola.
    if (this.hud && (this.hud.stack.size > 0 || this.options.nameplate)) {
      this.positionBubble();
      this.hud.stack.update(this.scene.time.now);
    }

    const clip = this.pickClip(moving);
    if (!clip) return;

    const key = `${clip.key}:${this.dirIndex}`;
    if (key !== this.animKey) {
      this.animKey = key;
      this.animTime = 0;
    }
    this.animTime += delta;

    const fps = Math.max(1, Math.min(60, clip.fps || 6));
    const raw = Math.floor(this.animTime / (1000 / fps));
    const holdsLast =
      clip.trigger === "SIT" ||
      clip.trigger === "SLEEP" ||
      clip.trigger === "EAT" ||
      !clip.loop;
    const frame = holdsLast
      ? Math.min(raw, clip.framesCount - 1)
      : raw % clip.framesCount;
    this.setClipFrame(clip, frame);
  }
}
