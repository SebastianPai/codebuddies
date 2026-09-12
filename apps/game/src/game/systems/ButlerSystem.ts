import Phaser from "phaser";
import { loadTextureOnce } from "../utils/phaserAssetCache";
import { getMyButler, getButlerCatalog, type ButlerNpc } from "../network/butlers";
import type { PetAnimClip } from "../network/pets";
import { resolveActorGroundPoint, syncActorDepth } from "../iso/IsoActorDepth";
import { WORLD_OVERLAY_DEPTH } from "../utils/depth";

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
const BUBBLE_MS = 5000; // cuánto dura una frase en pantalla
const IDLE_LINE_MIN_MS = 16000;
const IDLE_LINE_MAX_MS = 34000;

type Mode = "PAUSE" | "WALK";

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
  private bubble?: Phaser.GameObjects.Container;
  private bubbleUntil = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /** Lee /butlers/me y decide si el mayordomo debe estar en esta sala. */
  async sync(): Promise<void> {
    if (this.syncing) return;
    this.syncing = true;
    try {
      const roomId: string | null =
        (typeof window !== "undefined" && (window as any).currentRoomId) || null;
      const mine = await getMyButler().catch(() => null);

      const shouldShow = !!mine && !!roomId && mine.activeRoomId === roomId;
      if (!shouldShow) {
        this.despawn();
        return;
      }
      if (this.sprite && this.npcKey === mine!.npcKey) return; // ya está

      const catalog = await getButlerCatalog().catch(() => [] as ButlerNpc[]);
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
    this.textureKey = this.sheetKeys.get(npc.spriteSheetUrl!);
    if (!this.textureKey) return;

    // "Home" = un paso al costado del jugador; a partir de ahí deambula.
    this.homeX = px - 28;
    this.homeY = py;
    this.sprite = this.scene.add
      .sprite(this.homeX, this.homeY, this.textureKey)
      .setOrigin(0.5, 1);
    syncActorDepth(this.scene, this.sprite);
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
    this.greetingAt = this.timer + GREETING_DELAY_MS;
    this.nextIdleLineAt = this.timer + this.randIdleGap();

    this.animKey = "";
    this.setClipFrame(this.pickClip(false), 0);
  }

  despawn(): void {
    this.sprite?.destroy();
    this.sprite = undefined;
    this.npc = null;
    this.npcKey = null;
    this.textureKey = undefined;
    this.sheetKeys.clear();
    this.clearBubble();
  }

  destroy(): void {
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

  private say(lines: string[] | undefined): void {
    if (!this.sprite || !lines || lines.length === 0) return;
    const text = lines[Math.floor(Math.random() * lines.length)]?.trim();
    if (!text) return;
    this.clearBubble();

    const label = this.scene.add
      .text(0, 0, text, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "12px",
        color: "#f4f4f5",
        align: "center",
        wordWrap: { width: 150 },
      })
      .setOrigin(0.5, 1);

    const padX = 8;
    const padY = 5;
    const w = label.width + padX * 2;
    const h = label.height + padY * 2;
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x18181b, 0.92);
    bg.lineStyle(1, 0x3f3f46, 1);
    bg.fillRoundedRect(-w / 2, -h, w, h, 6);
    bg.strokeRoundedRect(-w / 2, -h, w, h, 6);
    bg.fillTriangle(-4, -1, 4, -1, 0, 5);

    // Por encima de cualquier objeto del mundo pero por debajo del
    // resaltado de tile, la luz ambiental y el HUD — mismo orden relativo
    // que tenía el 100000 literal de antes, ahora sin número mágico (el
    // techo del mundo cambió al pasar a la profundidad isométrica).
    this.bubble = this.scene.add
      .container(this.sprite.x, this.sprite.y, [bg, label])
      .setDepth(WORLD_OVERLAY_DEPTH - 1);
    this.bubbleUntil = this.timer + BUBBLE_MS;
    this.positionBubble();
  }

  private positionBubble(): void {
    if (!this.bubble || !this.sprite) return;
    const fh = Math.max(1, Number(this.npc?.frameHeight) || 48);
    this.bubble.setPosition(this.sprite.x, this.sprite.y - fh - 6);
  }

  private clearBubble(): void {
    this.bubble?.destroy();
    this.bubble = undefined;
    this.bubbleUntil = 0;
  }

  // ---- Loop ------------------------------------------------------------

  update(delta: number): void {
    if (!this.sprite || !this.npc) return;
    this.timer += delta;

    // Saludo de bienvenida (una vez).
    if (this.greetingAt > 0 && this.timer >= this.greetingAt) {
      this.greetingAt = -1;
      this.say(this.npc.greetingLines);
    }

    // Cambios de estado del deambular.
    if (this.timer >= this.modeUntil) {
      if (this.mode === "PAUSE") {
        // Elegir un punto al azar dentro del radio alrededor de "home".
        const ang = Math.random() * Math.PI * 2;
        const rad = Math.random() * WANDER_RADIUS;
        this.targetX = this.homeX + Math.cos(ang) * rad;
        this.targetY = this.homeY + Math.sin(ang) * rad * 0.6; // pisada isométrica
        this.mode = "WALK";
        this.modeUntil = this.timer + WALK_TIMEOUT_MS;
        this.resting = false;
        this.idleTime = 0;
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
      if (this.timer >= this.nextIdleLineAt) {
        this.say(this.npc.idleLines);
        this.nextIdleLineAt = this.timer + this.randIdleGap();
      }
    }

    this.lastX = this.sprite.x;
    this.lastY = this.sprite.y;
    syncActorDepth(this.scene, this.sprite);

    // Globo de diálogo: sigue al sprite y se cierra al vencer.
    if (this.bubble) {
      if (this.timer >= this.bubbleUntil) this.clearBubble();
      else this.positionBubble();
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
