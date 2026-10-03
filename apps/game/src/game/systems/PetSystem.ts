import Phaser from "phaser";
import { loadTextureOnce } from "../utils/phaserAssetCache";
import { getMyPet, getPetSpeciesList, type Pet, type PetSpecies, type PetAnimClip, type RoomPet } from "../network/pets";
import { resolveActorGroundPoint, syncActorDepth } from "../iso/IsoActorDepth";

// Orden estándar de filas del spritesheet -> dirección. Debe coincidir con
// COMPANION_DIRECTION_ORDER del backend / admin.
const DIRECTION_ORDER = ["S", "N", "SE", "NW", "E", "W", "NE", "SW"];
// Ángulo de pantalla (atan2(dy,dx)) -> nombre de dirección, en 8 buckets
// de 45° arrancando en Este y girando en sentido horario.
const NAME_BY_BUCKET = ["E", "SE", "S", "SW", "W", "NW", "N", "NE"];

const FOLLOW_SPEED = 90; // px/seg, cuando va hacia su dueño
const ROAM_SPEED = 42; // px/seg, paseando sola
const STOP_DISTANCE = 40; // se detiene a esta distancia del dueño
// Si el dueño se aleja más que esto, deja lo que esté haciendo y lo sigue
// (antes lo seguía pegada siempre: ahora tiene su propia vida cerca de él).
const FOLLOW_FAR = 130;
const ROAM_RADIUS_NEAR_OWNER = 80;
const ROAM_RADIUS_ALONE = 120;
const ARRIVE_DIST = 4;
const ROAM_TIMEOUT_MS = 5000;
// A los ~10s quieta (con jitter) elige al azar sentarse o dormir.
const REST_MIN_MS = 8000;
const REST_MAX_MS = 13000;

type Mode = "FOLLOW" | "ROAM" | "IDLE" | "REST";

export default class PetSystem {
  private scene: Phaser.Scene;
  private sprite?: Phaser.GameObjects.Sprite;
  private species: PetSpecies | null = null;
  private pet: Pet | null = null;
  private textureKey?: string; // sheet principal
  // url del spritesheet -> texture key cargada. Cada clip puede tener su
  // propia imagen (ej: dormir en otro PNG).
  private sheetKeys = new Map<string, string>();

  private dirIndex = 0; // fila actual
  private animKey = ""; // clip actual
  private animTime = 0;
  private idleTime = 0;
  private restThreshold = REST_MIN_MS;
  private restChoice: "SIT" | "SLEEP" | null = null;
  private lastX = 0;
  private lastY = 0;
  private syncing = false;
  // Destruido mientras un sync() esperaba la red (cambio de sala o
  // reconexión): al volver no debe crear una mascota huérfana.
  private destroyed = false;

  // Comportamiento propio: pasea, se queda quieta, se sienta o duerme.
  private mode: Mode = "IDLE";
  private timer = 0;
  private decideAt = 0;
  private modeStartedAt = 0;
  private targetX = 0;
  private targetY = 0;
  private homeX = 0;
  private homeY = 0;

  /**
   * Sin `record`: la mascota propia (lee /pets/me) y sigue al jugador local.
   * Con `record`: la mascota de otra persona en esta sala; sigue a su dueño
   * si está en la sala y si no, pasea sola.
   */
  constructor(scene: Phaser.Scene, private readonly record?: RoomPet) {
    this.scene = scene;
  }

  /** Lee /pets/me y decide si la mascota debe estar en esta sala. */
  async sync(): Promise<void> {
    if (this.syncing || this.destroyed) return;
    this.syncing = true;
    try {
      const roomId: string | null =
        (typeof window !== "undefined" && (window as any).currentRoomId) || null;
      const pet = this.record
        ? ({ species: this.record.species, activeRoomId: this.record.activeRoomId } as Pet)
        : await getMyPet().catch(() => null);
      if (this.destroyed) return;
      this.pet = pet;

      const shouldShow = !!pet && !!roomId && pet.activeRoomId === roomId;
      if (!shouldShow) {
        this.despawn();
        return;
      }
      if (this.sprite && this.species?.key === pet!.species) return; // ya está

      const list = await getPetSpeciesList().catch(() => [] as PetSpecies[]);
      if (this.destroyed) return;
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

    // Punto de APOYO del dueño (sus pies), no el origen de su Container:
    // el sprite de la mascota usa origin(0.5, 1), así que su (x, y) también
    // es un punto de apoyo. Comparar orígenes de sprite con orígenes de
    // container mezclaba dos anclajes distintos. Si el dueño no está, aparece
    // cerca del jugador local (la entrada de la sala).
    const player = this.ownerSprite() ?? (this.scene as any).player;
    const playerGround = player
      ? resolveActorGroundPoint(player)
      : { x: 0, y: 0 };
    const px = playerGround.x;
    const py = playerGround.y;

    // Cargar el sheet principal + el propio de cada clip que tenga uno.
    const urls = new Set<string>([species.spriteSheetUrl!]);
    for (const c of species.animations ?? []) {
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
    this.textureKey = this.sheetKeys.get(species.spriteSheetUrl!);
    if (!this.textureKey) return;

    this.sprite = this.scene.add
      .sprite(px - 24, py, this.textureKey)
      .setOrigin(0.5, 1);
    syncActorDepth(this.scene, this.sprite);
    this.lastX = px - 24;
    this.lastY = py;
    this.homeX = px - 24;
    this.homeY = py;
    this.mode = "IDLE";
    this.decideAt = this.timer + 1500;
    this.animKey = "";
    this.setClipFrame(this.pickClip(false), 0);
  }

  despawn(): void {
    this.sprite?.destroy();
    this.sprite = undefined;
    this.species = null;
    this.textureKey = undefined;
    this.sheetKeys.clear();
  }

  destroy(): void {
    this.destroyed = true;
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
    if (!clip || !this.sprite) return;

    // Textura de este clip: la propia si tiene, si no la principal.
    const url = clip.spriteSheetUrl || this.species?.spriteSheetUrl || "";
    const texKey = this.sheetKeys.get(url) ?? this.textureKey;
    if (!texKey) return;
    const tex = this.scene.textures.get(texKey);

    const { fw, fh } = this.clipDims(clip);
    const col = clip.startCol + frame;
    // Solo caminar/idle rotan por dirección (8 filas). Sentarse/dormir/comer,
    // o cualquier clip con imagen propia, usan su fila tal cual (la pose de
    // descanso suele ser una sola, no 8).
    const perDirection =
      !clip.spriteSheetUrl &&
      (clip.trigger === "MOVING" || clip.trigger === "IDLE");
    const row = clip.row + (perDirection ? this.dirIndex : 0);
    const name = `pet-${texKey}-${row}-${col}-${fw}x${fh}`;
    if (!tex.has(name)) {
      tex.add(name, 0, col * fw, row * fh, fw, fh);
    }
    // setTexture (no solo setFrame): el clip puede vivir en OTRA imagen.
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
    const dirs = this.species?.directions || 8;
    if (idx < 0) return 0;
    return idx < dirs ? idx : idx % dirs;
  }

  /** Quién es el dueño en pantalla (null si no está en la sala). */
  private ownerSprite(): any | null {
    const scene = this.scene as any;
    if (!this.record) return scene.player ?? null;
    const me = scene.game?.user?.username ?? (typeof window !== "undefined" ? (window as any).currentUser?.username : undefined);
    if (me && me === this.record.ownerUsername) return scene.player ?? null;
    const others: any[] = scene.otherPlayers?.getChildren?.() ?? [];
    return others.find((other) => other.username === this.record!.ownerUsername) ?? null;
  }

  private walkable(x: number, y: number): boolean {
    const check = (this.scene as any).isGroundWalkable;
    return typeof check === "function" ? check.call(this.scene, x, y) : true;
  }

  /** Un punto caminable al azar alrededor de (cx, cy). */
  private randomPoint(cx: number, cy: number, radius: number) {
    for (let attempt = 0; attempt < 10; attempt++) {
      const angle = Math.random() * Math.PI * 2;
      const r = radius * (0.35 + Math.random() * 0.65);
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r * 0.5; // iso: el piso se ve achatado
      if (this.walkable(x, y)) return { x, y };
    }
    return null;
  }

  /** Elige qué hacer ahora: pasear, quedarse quieta, sentarse o dormir. */
  private decide(anchorX: number, anchorY: number, radius: number) {
    const roll = Math.random();
    this.modeStartedAt = this.timer;
    if (roll < 0.45) {
      const point = this.randomPoint(anchorX, anchorY, radius);
      if (point) {
        this.mode = "ROAM";
        this.targetX = point.x;
        this.targetY = point.y;
        this.decideAt = this.timer + ROAM_TIMEOUT_MS;
        return;
      }
    }
    if (roll < 0.75) {
      this.mode = "IDLE";
      this.decideAt = this.timer + 2500 + Math.random() * 4500;
      return;
    }
    this.mode = "REST";
    this.restChoice = Math.random() < 0.5 ? "SIT" : "SLEEP";
    // Dormir dura más que sentarse.
    this.decideAt = this.timer + (this.restChoice === "SLEEP" ? 12000 + Math.random() * 14000 : 6000 + Math.random() * 6000);
  }

  update(delta: number): void {
    if (!this.sprite || !this.species) return;
    this.timer += delta;

    const owner = this.ownerSprite();
    const ownerGround = owner ? resolveActorGroundPoint(owner) : null;

    // El dueño se alejó: deja lo que estaba haciendo y va con él.
    if (ownerGround) {
      const away = Math.hypot(ownerGround.x - this.sprite.x, ownerGround.y - this.sprite.y);
      if (away > FOLLOW_FAR && this.mode !== "FOLLOW") {
        this.mode = "FOLLOW";
        this.restChoice = null;
      }
    }

    let moving = false;
    let speed = ROAM_SPEED;
    if (this.mode === "FOLLOW" && ownerGround) {
      this.targetX = ownerGround.x - 22;
      this.targetY = ownerGround.y;
      speed = FOLLOW_SPEED;
      const dist = Math.hypot(this.targetX - this.sprite.x, this.targetY - this.sprite.y);
      if (dist <= STOP_DISTANCE) {
        this.mode = "IDLE";
        this.decideAt = this.timer + 1500 + Math.random() * 3000;
      } else {
        moving = true;
      }
    } else if (this.mode === "FOLLOW") {
      // El dueño se fue de la sala: se queda por acá.
      this.mode = "IDLE";
      this.homeX = this.sprite.x;
      this.homeY = this.sprite.y;
      this.decideAt = this.timer + 2000;
    } else if (this.mode === "ROAM") {
      const dist = Math.hypot(this.targetX - this.sprite.x, this.targetY - this.sprite.y);
      if (dist <= ARRIVE_DIST || this.timer - this.modeStartedAt > ROAM_TIMEOUT_MS) {
        this.mode = "IDLE";
        this.decideAt = this.timer + 1500 + Math.random() * 3500;
      } else {
        moving = true;
      }
    }

    if (!moving && this.timer >= this.decideAt) {
      const anchorX = ownerGround ? ownerGround.x : this.homeX;
      const anchorY = ownerGround ? ownerGround.y : this.homeY;
      this.decide(anchorX, anchorY, ownerGround ? ROAM_RADIUS_NEAR_OWNER : ROAM_RADIUS_ALONE);
    }

    if (moving) {
      const dx = this.targetX - this.sprite.x;
      const dy = this.targetY - this.sprite.y;
      const dist = Math.hypot(dx, dy);
      const step = (speed * delta) / 1000;
      const k = Math.min(1, step / Math.max(0.001, dist));
      const nextX = this.sprite.x + dx * k;
      const nextY = this.sprite.y + dy * k;
      // Paseando nunca pisa fuera del piso (siguiendo al dueño sí puede
      // cortar camino: él ya está en un lugar válido).
      if (this.mode === "FOLLOW" || this.walkable(nextX, nextY)) {
        this.sprite.x = nextX;
        this.sprite.y = nextY;
      } else {
        this.mode = "IDLE";
        this.decideAt = this.timer + 1200;
      }
      this.idleTime = 0;
      this.restThreshold = REST_MIN_MS + Math.random() * (REST_MAX_MS - REST_MIN_MS);
      this.dirIndex = this.dirFromVector(this.sprite.x - this.lastX, this.sprite.y - this.lastY);
    } else {
      this.idleTime += delta;
    }
    if (this.mode !== "REST") this.restChoice = moving ? null : this.restChoice;

    this.lastX = this.sprite.x;
    this.lastY = this.sprite.y;
    syncActorDepth(this.scene, this.sprite);

    const clip =
      this.mode === "REST" && this.restChoice && !moving
        ? this.byTrigger(this.restChoice) ??
          this.byTrigger(this.restChoice === "SIT" ? "SLEEP" : "SIT") ??
          this.byTrigger("IDLE") ??
          this.staticIdleClip()
        : this.pickClip(moving);
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
