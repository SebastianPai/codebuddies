import Phaser from "phaser";
import { loadTextureOnce } from "../utils/phaserAssetCache";
import {
  doPetAction,
  getMyPet,
  getPetSpeciesList,
  type Pet,
  type PetAccessory,
  type PetAction,
  type PetSpecies,
  type PetAnimClip,
  type PetTrick,
  type RoomPet,
} from "../network/pets";
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

type Mode = "FOLLOW" | "ROAM" | "IDLE" | "REST" | "USE";

// Cosas de la sala que la mascota usa sola: se marcan con una etiqueta en
// el ítem (admin → tags): "pet:bed"/"cama", "pet:food"/"comida",
// "pet:water"/"agua", "pet:toy"/"juguete".
type SpotKind = "bed" | "food" | "water" | "toy";
const SPOT_TAGS: Record<SpotKind, RegExp> = {
  bed: /^(pet:bed|cama|bed|cucha)$/i,
  food: /^(pet:food|comida|comedero|food)$/i,
  water: /^(pet:water|agua|bebedero|water)$/i,
  toy: /^(pet:toy|juguete|toy|pelota)$/i,
};
const SPOT_ACTION: Partial<Record<SpotKind, PetAction>> = { food: "feed", water: "water", toy: "play" };
const SPOT_COOLDOWN_MS = 25_000;
const USE_SPEED = 60;

function spotKindOf(item: any): SpotKind | null {
  const tags: string[] = Array.isArray(item?.tags) ? item.tags : [];
  for (const kind of Object.keys(SPOT_TAGS) as SpotKind[]) {
    if (tags.some((tag) => SPOT_TAGS[kind].test(String(tag).trim()))) return kind;
  }
  return null;
}

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

  // Usando una cosa de la sala (cama, comedero...).
  private useKind: SpotKind | null = null;
  private usePhase: "GO" | "DO" = "GO";
  private useUntil = 0;
  private lastUseAt = -SPOT_COOLDOWN_MS;

  // Truco en curso (animación del juego, la ven todos los de la sala).
  private tricking = false;

  // Accesorio dibujado sobre la cabeza.
  private accessory?: Phaser.GameObjects.Image;
  private accessoryUrl: string | null = null;
  private headCache = new Map<string, { top: number; cx: number }>();

  /**
   * Sin `record`: la mascota propia (lee /pets/me) y sigue al jugador local.
   * Con `record`: la mascota de otra persona en esta sala; sigue a su dueño
   * si está en la sala y si no, pasea sola.
   */
  constructor(scene: Phaser.Scene, private record?: RoomPet) {
    this.scene = scene;
  }

  /** Datos nuevos de la mascota de otra persona (p. ej. cambió el accesorio). */
  updateRecord(record: RoomPet): void {
    if (!this.record) return;
    this.record = record;
    void this.refreshAccessory();
  }

  /** Id de la mascota que dibuja este sistema (para los trucos por socket). */
  get petId(): string | null {
    return this.record?.id ?? this.pet?.id ?? null;
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
      if (this.sprite && this.species?.key === pet!.species) {
        void this.refreshAccessory(); // ya está; quizá cambió el accesorio
        return;
      }

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
    void this.refreshAccessory();
  }

  private currentAccessory(): PetAccessory | null {
    return (this.record ? this.record.accessory : this.pet?.accessory) ?? null;
  }

  private async refreshAccessory(): Promise<void> {
    const url = this.currentAccessory()?.imageUrl ?? null;
    if (url === this.accessoryUrl && (this.accessory || !url)) return;
    this.accessoryUrl = url;
    this.accessory?.destroy();
    this.accessory = undefined;
    if (!url || !this.sprite) return;
    try {
      const key = await loadTextureOnce(this.scene, url);
      if (this.destroyed || !this.sprite || this.accessoryUrl !== url) return;
      this.accessory = this.scene.add.image(this.sprite.x, this.sprite.y, key).setOrigin(0.5, 0.8);
      this.placeAccessory();
    } catch {
      /* sin accesorio si la imagen no carga */
    }
  }

  /**
   * Punto más alto con color del cuadro actual (la cabeza), en píxeles del
   * cuadro. Se calcula una vez por cuadro; si la imagen no se puede leer
   * (CORS), se usa un cuarto de la altura.
   */
  private headOf(): { top: number; cx: number } | null {
    const sprite = this.sprite;
    if (!sprite) return null;
    const frame = sprite.frame;
    const key = `${sprite.texture.key}:${frame.name}`;
    const cached = this.headCache.get(key);
    if (cached) return cached;
    const w = Math.max(1, Math.round(frame.cutWidth));
    const h = Math.max(1, Math.round(frame.cutHeight));
    let result = { top: Math.round(h * 0.25), cx: w / 2 };
    try {
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      const source = frame.source.image as CanvasImageSource;
      if (ctx && source) {
        ctx.drawImage(source, frame.cutX, frame.cutY, w, h, 0, 0, w, h);
        const data = ctx.getImageData(0, 0, w, h).data;
        let top = -1;
        for (let y = 0; y < h && top < 0; y++) {
          for (let x = 0; x < w; x++) {
            if (data[(y * w + x) * 4 + 3] > 40) {
              top = y;
              break;
            }
          }
        }
        if (top >= 0) {
          // Centro de lo que hay en las primeras filas de la cabeza.
          let sum = 0;
          let count = 0;
          for (let y = top; y < Math.min(h, top + 4); y++) {
            for (let x = 0; x < w; x++) {
              if (data[(y * w + x) * 4 + 3] > 40) {
                sum += x;
                count++;
              }
            }
          }
          result = { top, cx: count ? sum / count : w / 2 };
        }
      }
    } catch {
      /* imagen sin CORS: queda la estimación */
    }
    this.headCache.set(key, result);
    return result;
  }

  private placeAccessory(): void {
    const sprite = this.sprite;
    const accessory = this.accessory;
    if (!sprite || !accessory) return;
    const head = this.headOf();
    if (!head) return;
    const w = sprite.frame.cutWidth;
    const left = sprite.x - sprite.displayWidth / 2;
    const top = sprite.y - sprite.displayHeight;
    const cx = sprite.flipX ? w - head.cx : head.cx;
    accessory.setScale(sprite.scaleX, sprite.scaleY);
    accessory.setPosition(left + cx * sprite.scaleX, top + head.top * sprite.scaleY + 2 * sprite.scaleY);
    accessory.setAngle(sprite.angle);
    accessory.setFlipX(sprite.flipX);
    accessory.setDepth(sprite.depth + 0.01);
    accessory.setVisible(sprite.visible);
  }

  // ====================== COSAS DE LA SALA ======================

  /** Cosas para mascotas que hay en la sala, con dónde pararse para usarlas. */
  private petSpots(): Array<{ kind: SpotKind; x: number; y: number }> {
    const scene = this.scene as any;
    const grid = scene.isoGrid;
    const all: any[] = scene.roomItems?.getAll?.() ?? [];
    if (!grid || !all.length) return [];
    const spots: Array<{ kind: SpotKind; x: number; y: number }> = [];
    for (const object of all) {
      const kind = spotKindOf(object.item);
      if (!kind) continue;
      // Cama: encima. Lo demás: parada justo delante.
      const point = kind === "bed" ? grid.groundCenter(object.tileX, object.tileY) : grid.groundAnchor(object.tileX, object.tileY);
      if (point) spots.push({ kind, x: point.x, y: point.y + (kind === "bed" ? 2 : 6) });
    }
    return spots;
  }

  /** Va a usar algo si le hace falta (o a veces por gusto). */
  private tryUseSpot(): boolean {
    if (this.timer - this.lastUseAt < SPOT_COOLDOWN_MS) return false;
    const spots = this.petSpots();
    if (!spots.length) return false;
    const pet = this.pet;
    const needs: SpotKind[] = [];
    if (!this.record && pet) {
      if (pet.hunger < 55) needs.push("food");
      if (pet.thirst < 55) needs.push("water");
      if (pet.energy < 40) needs.push("bed");
      if (pet.happiness < 60) needs.push("toy");
    }
    const wanted = spots.filter((spot) => needs.includes(spot.kind));
    const pool = wanted.length ? wanted : Math.random() < 0.3 ? spots : [];
    if (!pool.length) return false;
    const spot = pool[Math.floor(Math.random() * pool.length)];
    this.mode = "USE";
    this.useKind = spot.kind;
    this.usePhase = "GO";
    this.targetX = spot.x;
    this.targetY = spot.y;
    this.modeStartedAt = this.timer;
    this.lastUseAt = this.timer;
    return true;
  }

  private startUsing(): void {
    const kind = this.useKind;
    this.usePhase = "DO";
    this.useUntil =
      this.timer + (kind === "bed" ? 15000 + Math.random() * 12000 : kind === "toy" ? 3000 : 4500);
    if (kind === "toy") this.playTrick("jump");
    // La propia: comer, beber o jugar cuenta de verdad (el servidor pone
    // el límite de cada cuánto).
    const action = kind ? SPOT_ACTION[kind] : undefined;
    if (!this.record && action) {
      void doPetAction(action)
        .then((pet) => {
          if (pet && !this.destroyed) this.pet = { ...pet, accessory: pet.accessory ?? this.pet?.accessory };
        })
        .catch(() => undefined);
    }
  }

  // ====================== TRUCOS ======================

  /** Hace un truco (lo mandó el servidor: lo ven todos los de la sala). */
  playTrick(trick: PetTrick | string): void {
    const sprite = this.sprite;
    if (!sprite || this.tricking) return;
    this.tricking = true;
    if (this.mode !== "USE") {
      this.mode = "IDLE";
      this.decideAt = this.timer + 2600;
    }
    const tweens = this.scene.tweens;
    const baseY = sprite.y;
    const done = () => {
      sprite.setAngle(0);
      sprite.setY(baseY);
      this.tricking = false;
    };
    switch (trick) {
      case "jump":
        tweens.add({ targets: sprite, y: baseY - 22, duration: 170, yoyo: true, repeat: 1, ease: "Quad.easeOut", onComplete: done });
        break;
      case "spin": {
        let flips = 0;
        this.scene.time.addEvent({
          delay: 110,
          repeat: 7,
          callback: () => {
            sprite.setFlipX(!sprite.flipX);
            if (++flips >= 8) {
              sprite.setFlipX(false);
              done();
            }
          },
        });
        tweens.add({ targets: sprite, y: baseY - 8, duration: 220, yoyo: true, repeat: 1 });
        break;
      }
      case "dance":
        sprite.setAngle(-12);
        tweens.add({ targets: sprite, angle: 12, duration: 200, yoyo: true, repeat: 4, ease: "Sine.easeInOut", onComplete: done });
        tweens.add({ targets: sprite, y: baseY - 6, duration: 200, yoyo: true, repeat: 4 });
        break;
      case "flip":
        tweens.add({ targets: sprite, y: baseY - 30, duration: 260, yoyo: true, ease: "Quad.easeOut" });
        tweens.add({ targets: sprite, angle: 360, duration: 520, ease: "Sine.easeInOut", onComplete: done });
        break;
      case "love":
      default: {
        for (let i = 0; i < 4; i++) {
          // Coraz\u00f3n dibujado (nada de emojis): dos c\u00edrculos y un tri\u00e1ngulo.
          const heart = this.scene.add
            .graphics({ x: sprite.x + (i - 1.5) * 9, y: sprite.y - sprite.displayHeight * 0.7 })
            .fillStyle(0xff6fae, 1)
            .fillCircle(-2.5, -1.5, 3)
            .fillCircle(2.5, -1.5, 3)
            .fillTriangle(-5.4, -0.5, 5.4, -0.5, 0, 5.5)
            .setDepth(sprite.depth + 1)
            .setAlpha(0);
          tweens.add({
            targets: heart,
            y: heart.y - 34 - Math.random() * 14,
            alpha: { from: 1, to: 0 },
            delay: i * 140,
            duration: 1100,
            onComplete: () => heart.destroy(),
          });
        }
        tweens.add({ targets: sprite, y: baseY - 10, duration: 160, yoyo: true, repeat: 1, onComplete: done });
        break;
      }
    }
  }

  despawn(): void {
    this.accessory?.destroy();
    this.accessory = undefined;
    this.accessoryUrl = null;
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
    if (this.tryUseSpot()) return;
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
    } else if (this.mode === "USE") {
      if (this.usePhase === "GO") {
        const dist = Math.hypot(this.targetX - this.sprite.x, this.targetY - this.sprite.y);
        if (dist <= ARRIVE_DIST) {
          this.startUsing();
        } else if (this.timer - this.modeStartedAt > 15000) {
          this.mode = "IDLE";
          this.decideAt = this.timer + 1500;
        } else {
          moving = true;
          speed = USE_SPEED;
        }
      } else if (this.timer >= this.useUntil) {
        this.mode = "IDLE";
        this.useKind = null;
        this.decideAt = this.timer + 1500 + Math.random() * 2500;
      }
    } else if (this.mode === "ROAM") {
      const dist = Math.hypot(this.targetX - this.sprite.x, this.targetY - this.sprite.y);
      if (dist <= ARRIVE_DIST || this.timer - this.modeStartedAt > ROAM_TIMEOUT_MS) {
        this.mode = "IDLE";
        this.decideAt = this.timer + 1500 + Math.random() * 3500;
      } else {
        moving = true;
      }
    }

    if (this.tricking) moving = false;

    if (!moving && this.mode !== "USE" && this.timer >= this.decideAt) {
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
      if (this.mode === "FOLLOW" || this.mode === "USE" || this.walkable(nextX, nextY)) {
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

    this.placeAccessory();

    const useClip =
      this.mode === "USE" && this.usePhase === "DO" && this.useKind && this.useKind !== "toy"
        ? this.useKind === "bed"
          ? this.byTrigger("SLEEP") ?? this.byTrigger("SIT")
          : this.byTrigger("EAT") ?? this.byTrigger("SIT")
        : null;
    const clip = useClip ??
      (this.mode === "REST" && this.restChoice && !moving
        ? this.byTrigger(this.restChoice) ??
          this.byTrigger(this.restChoice === "SIT" ? "SLEEP" : "SIT") ??
          this.byTrigger("IDLE") ??
          this.staticIdleClip()
        : this.pickClip(moving));
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
