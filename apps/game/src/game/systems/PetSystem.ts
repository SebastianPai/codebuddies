import Phaser from "phaser";
import { loadTextureOnce } from "../utils/phaserAssetCache";
import { getMyPet, getPetSpeciesList, type Pet, type PetSpecies, type PetAnimClip } from "../network/pets";

// Orden estándar de filas del spritesheet -> dirección. Debe coincidir con
// COMPANION_DIRECTION_ORDER del backend / admin.
const DIRECTION_ORDER = ["S", "N", "SE", "NW", "E", "W", "NE", "SW"];
// Ángulo de pantalla (atan2(dy,dx)) -> nombre de dirección, en 8 buckets
// de 45° arrancando en Este y girando en sentido horario.
const NAME_BY_BUCKET = ["E", "SE", "S", "SW", "W", "NW", "N", "NE"];

const FOLLOW_SPEED = 90; // px/seg
const STOP_DISTANCE = 40; // se detiene a esta distancia del jugador
// A los ~10s quieta (con jitter) elige al azar sentarse o dormir.
const REST_MIN_MS = 8000;
const REST_MAX_MS = 13000;

export default class PetSystem {
  private scene: Phaser.Scene;
  private sprite?: Phaser.GameObjects.Sprite;
  private species: PetSpecies | null = null;
  private pet: Pet | null = null;
  private textureKey?: string;

  private dirIndex = 0; // fila actual
  private animKey = ""; // clip actual
  private animTime = 0;
  private idleTime = 0;
  private restThreshold = REST_MIN_MS;
  private restChoice: "SIT" | "SLEEP" | null = null;
  private lastX = 0;
  private lastY = 0;
  private syncing = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /** Lee /pets/me y decide si la mascota debe estar en esta sala. */
  async sync(): Promise<void> {
    if (this.syncing) return;
    this.syncing = true;
    try {
      const roomId: string | null =
        (typeof window !== "undefined" && (window as any).currentRoomId) || null;
      const pet = await getMyPet().catch(() => null);
      this.pet = pet;

      const shouldShow = !!pet && !!roomId && pet.activeRoomId === roomId;
      if (!shouldShow) {
        this.despawn();
        return;
      }
      if (this.sprite && this.species?.key === pet!.species) return; // ya está

      const list = await getPetSpeciesList().catch(() => [] as PetSpecies[]);
      const species = list.find((s) => s.key === pet!.species) ?? null;
      if (!species?.spriteSheetUrl) {
        this.despawn();
        return;
      }
      await this.spawn(species);
    } finally {
      this.syncing = false;
    }
  }

  private async spawn(species: PetSpecies): Promise<void> {
    this.despawn();
    this.species = species;

    const player = (this.scene as any).player;
    const px = player?.x ?? 0;
    const py = player?.y ?? 0;

    try {
      this.textureKey = await loadTextureOnce(this.scene, species.spriteSheetUrl!);
    } catch {
      return;
    }

    this.sprite = this.scene.add
      .sprite(px - 24, py, this.textureKey)
      .setOrigin(0.5, 1)
      .setDepth(py);
    this.lastX = px - 24;
    this.lastY = py;
    this.animKey = "";
    this.setClipFrame(this.pickClip(false), 0);
  }

  despawn(): void {
    this.sprite?.destroy();
    this.sprite = undefined;
    this.species = null;
    this.textureKey = undefined;
  }

  destroy(): void {
    this.despawn();
    this.pet = null;
  }

  private clipDims(clip: PetAnimClip) {
    return {
      fw: Math.max(1, Number(clip.frameWidth || this.species?.frameWidth) || 32),
      fh: Math.max(1, Number(clip.frameHeight || this.species?.frameHeight) || 32),
    };
  }

  private byTrigger(trigger: string): PetAnimClip | null {
    return (this.species?.animations ?? []).find((c) => c.trigger === trigger) ?? null;
  }

  // Pose quieta sintética: cuadro 0 de la fila (columna 0 = idle en el
  // layout estándar). Se usa si no hay un clip IDLE de verdad.
  private staticIdleClip(): PetAnimClip | null {
    const base =
      this.byTrigger("MOVING") ?? (this.species?.animations ?? [])[0] ?? null;
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
    const clips = this.species?.animations ?? [];
    if (!clips.length) return null;

    if (moving) return this.byTrigger("MOVING") ?? clips[0];

    // Quieta: si ya pasó el umbral, sentarse o dormir (elegido una vez).
    if (this.idleTime >= this.restThreshold && this.restChoice) {
      return (
        this.byTrigger(this.restChoice) ??
        this.byTrigger(this.restChoice === "SIT" ? "SLEEP" : "SIT") ??
        this.byTrigger("IDLE") ??
        this.staticIdleClip()
      );
    }
    return this.byTrigger("IDLE") ?? this.staticIdleClip();
  }

  private setClipFrame(clip: PetAnimClip | null, frame: number): void {
    if (!clip || !this.sprite || !this.textureKey) return;
    const tex = this.scene.textures.get(this.textureKey);
    const { fw, fh } = this.clipDims(clip);
    const col = clip.startCol + frame;
    const row = clip.row + this.dirIndex;
    const name = `pet-${this.species?.key}-${row}-${col}-${fw}x${fh}`;
    if (!tex.has(name)) {
      tex.add(name, 0, col * fw, row * fh, fw, fh);
    }
    this.sprite.setFrame(name);
  }

  private dirFromVector(dx: number, dy: number): number {
    if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) return this.dirIndex;
    const bucket =
      ((Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) % 8) + 8) % 8;
    const name = NAME_BY_BUCKET[bucket];
    const idx = DIRECTION_ORDER.indexOf(name);
    const dirs = this.species?.directions || 8;
    if (idx < 0) return 0;
    return idx < dirs ? idx : idx % dirs;
  }

  update(delta: number): void {
    if (!this.sprite || !this.species) return;
    const player = (this.scene as any).player;
    if (!player) return;

    const targetX = player.x - 22;
    const targetY = player.y;
    const dx = targetX - this.sprite.x;
    const dy = targetY - this.sprite.y;
    const dist = Math.hypot(dx, dy);
    const moving = dist > STOP_DISTANCE;

    if (moving) {
      const step = (FOLLOW_SPEED * delta) / 1000;
      const k = Math.min(1, step / dist);
      this.sprite.x += dx * k;
      this.sprite.y += dy * k;
      this.idleTime = 0;
      this.restChoice = null;
      this.restThreshold =
        REST_MIN_MS + Math.random() * (REST_MAX_MS - REST_MIN_MS);
      this.dirIndex = this.dirFromVector(
        this.sprite.x - this.lastX,
        this.sprite.y - this.lastY,
      );
    } else {
      const before = this.idleTime;
      this.idleTime += delta;
      // Al cruzar el umbral por primera vez, decide sentarse o dormir.
      if (before < this.restThreshold && this.idleTime >= this.restThreshold) {
        this.restChoice = Math.random() < 0.5 ? "SIT" : "SLEEP";
      }
    }
    this.lastX = this.sprite.x;
    this.lastY = this.sprite.y;
    this.sprite.setDepth(this.sprite.y);

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
    // Sentarse / dormir / comer SIEMPRE terminan quietos en el último
    // cuadro (aunque el clip esté marcado como loop). Solo caminar e idle
    // se repiten en bucle.
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
