import Phaser from "phaser";
import ModularPlayer from "../players/ModularPlayer";
import { getUserBadges, getBadgeConfigCached, type BadgeIconConfig } from "../network/badges";

export interface HUDConfig {
  scene: Phaser.Scene;
  playerSprite: ModularPlayer | null;
  username: string;
  level?: number;
}

type BadgeKind = "VERIFIED" | "CREATOR";
type BadgeVisual = Phaser.GameObjects.Image | Phaser.GameObjects.Sprite;

const VERIFIED_TEXTURE = "hud-badge-verified";
const CREATOR_TEXTURE = "hud-badge-creator";
const BADGE_SIZE = 14;

// Genera las texturas de insignia por defecto una sola vez por sesión (no
// por jugador): un círculo de color es lo más simple que se puede dibujar
// con Graphics a este tamaño y sigue siendo reconocible como "insignia" sin
// caer en texto/emoji — mismo código azul/dorado que usa <UserBadges> en el
// resto del juego (ver components/shared/UserBadges.tsx). Se usan cuando el
// admin no subió ícono propio, o como respaldo si la imagen falla al cargar.
function ensureDefaultBadgeTextures(scene: Phaser.Scene) {
  if (!scene.textures.exists(VERIFIED_TEXTURE)) {
    const g = scene.add.graphics();
    g.fillStyle(0x3b82f6, 1);
    g.fillCircle(BADGE_SIZE / 2, BADGE_SIZE / 2, BADGE_SIZE / 2);
    g.lineStyle(1.5, 0xffffff, 0.9);
    g.strokeCircle(BADGE_SIZE / 2, BADGE_SIZE / 2, BADGE_SIZE / 2 - 1);
    g.generateTexture(VERIFIED_TEXTURE, BADGE_SIZE, BADGE_SIZE);
    g.destroy();
  }

  if (!scene.textures.exists(CREATOR_TEXTURE)) {
    const g = scene.add.graphics();
    g.fillStyle(0xfacc15, 1);
    g.fillCircle(BADGE_SIZE / 2, BADGE_SIZE / 2, BADGE_SIZE / 2);
    g.lineStyle(1.5, 0xffffff, 0.9);
    g.strokeCircle(BADGE_SIZE / 2, BADGE_SIZE / 2, BADGE_SIZE / 2 - 1);
    g.generateTexture(CREATOR_TEXTURE, BADGE_SIZE, BADGE_SIZE);
    g.destroy();
  }
}

// Convierte una URL en una clave de textura válida y estable (para no
// recargar la misma imagen dos veces mientras dure la sesión).
function textureKeyFor(prefix: string, url: string): string {
  return `hud-badge-${prefix}-${url.replace(/[^a-zA-Z0-9]/g, "_").slice(-60)}`;
}

function measureImage(url: string): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

// Un solo LoaderPlugin por escena: si dos jugadores con la misma insignia se
// unen casi al mismo tiempo, ambos piden la MISMA textura — esta caché evita
// dos cargas duplicadas y hace que el segundo simplemente espere la primera.
const textureLoads = new Map<string, Promise<boolean>>();
// Ancho/alto real de cada textura de insignia ya cargada — un frame de
// sprite no siempre es cuadrado (frameWidth = anchoTotal/frameCount), y sin
// esto se forzaba a un tamaño cuadrado que aplastaba la imagen verticalmente.
const textureDims = new Map<string, { width: number; height: number }>();

function loadImageTexture(scene: Phaser.Scene, key: string, url: string): Promise<boolean> {
  if (scene.textures.exists(key)) return Promise.resolve(true);

  const cached = textureLoads.get(key);
  if (cached) return cached;

  const promise = new Promise<boolean>((resolve) => {
    scene.load.image(key, url);
    scene.load.once(`filecomplete-image-${key}`, () => {
      const source = scene.textures.get(key).getSourceImage() as HTMLImageElement;
      textureDims.set(key, { width: source.width, height: source.height });
      resolve(true);
    });
    scene.load.once(Phaser.Loader.Events.FILE_LOAD_ERROR, () => resolve(false));
    scene.load.start();
  });

  textureLoads.set(key, promise);
  return promise;
}

async function loadSpritesheetTexture(
  scene: Phaser.Scene,
  key: string,
  url: string,
  frameCount: number,
): Promise<boolean> {
  if (scene.textures.exists(key)) return true;

  const cached = textureLoads.get(key);
  if (cached) return cached;

  const promise = (async () => {
    const dims = await measureImage(url);
    if (!dims) return false;

    // El admin sube una tira horizontal de `frameCount` cuadros iguales
    // (ej. 1000px / 6 = ~166px por cuadro) — el ancho exacto no importa,
    // se calcula del ancho real de la imagen subida.
    const frameWidth = Math.max(1, Math.floor(dims.width / frameCount));
    const frameHeight = dims.height;
    textureDims.set(key, { width: frameWidth, height: frameHeight });

    return new Promise<boolean>((resolve) => {
      scene.load.spritesheet(key, url, { frameWidth, frameHeight });
      scene.load.once(`filecomplete-spritesheet-${key}`, () => resolve(true));
      scene.load.once(Phaser.Loader.Events.FILE_LOAD_ERROR, () => resolve(false));
      scene.load.start();
    });
  })();

  textureLoads.set(key, promise);
  return promise;
}

function aspectOf(key: string): number {
  const dims = textureDims.get(key);
  return dims && dims.height > 0 ? dims.width / dims.height : 1;
}

export default class PlayerHUD {
  // Sin esto, el nametag quedaba con depth por defecto (0) y los muebles
  // (depth ~ y*1000, ver FurnitureSocketSystem) lo tapaban por completo.
  // Mismo valor que usa chatText, para que el nametag siempre flote por
  // encima de cualquier objeto del mundo.
  private static readonly HUD_DEPTH = 10000;

  private scene: Phaser.Scene;
  private sprite: ModularPlayer | null;
  private usernameText: Phaser.GameObjects.Text;
  private chatText?: Phaser.GameObjects.Text;
  private badgeIcons: BadgeVisual[] = [];

  constructor(config: HUDConfig) {
    this.scene = config.scene;
    this.sprite = config.playerSprite;
    const HUD_DEPTH = PlayerHUD.HUD_DEPTH;

    // Nombre y nivel en un solo texto/pill en vez de dos líneas flotantes con
    // estilos distintos (blanco+fondo vs. verde suelto): quedaba desprolijo
    // y no se leía como una sola etiqueta de jugador.
    const label =
      config.level !== undefined ? `${config.username}  ·  Lv.${config.level}` : config.username;

    // Ocultos si no hay sprite todavía; update() los posiciona y muestra.
    this.usernameText = this.scene.add
      .text(0, 0, label, {
        fontFamily: "Arial, sans-serif",
        fontSize: "13px",
        color: "#f8fafc",
        fontStyle: "bold",
        backgroundColor: "rgba(10, 12, 16, 0.72)",
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5)
      .setDepth(HUD_DEPTH)
      .setVisible(!!this.sprite);

    void this.loadBadges(config.username);
  }

  private async loadBadges(username: string) {
    try {
      const [{ verified, isCreator }, config] = await Promise.all([
        getUserBadges(username),
        getBadgeConfigCached(),
      ]);
      if (!verified && !isCreator) return;

      if (verified) this.badgeIcons.push(await this.buildBadgeVisual("VERIFIED", config.VERIFIED));
      if (isCreator) this.badgeIcons.push(await this.buildBadgeVisual("CREATOR", config.CREATOR));

      this.update();
    } catch {
      // sin insignias este ciclo, no es crítico
    }
  }

  private async buildBadgeVisual(kind: BadgeKind, config: BadgeIconConfig): Promise<BadgeVisual> {
    const fallbackTexture = kind === "VERIFIED" ? VERIFIED_TEXTURE : CREATOR_TEXTURE;
    const fallbackToDefault = () => {
      ensureDefaultBadgeTextures(this.scene);
      return this.createBadgeImage(fallbackTexture);
    };

    if (!config.iconUrl) return fallbackToDefault();

    const key = textureKeyFor(kind.toLowerCase(), config.iconUrl);

    if (config.mode === "SPRITE") {
      const ok = await loadSpritesheetTexture(this.scene, key, config.iconUrl, config.frameCount);
      if (!ok) return fallbackToDefault();

      const animKey = `${key}-anim`;
      if (!this.scene.anims.exists(animKey)) {
        this.scene.anims.create({
          key: animKey,
          frames: this.scene.anims.generateFrameNumbers(key, { start: 0, end: config.frameCount - 1 }),
          frameRate: config.frameRate,
          // "yoyo" es exactamente 1,2,3..N,N-1..1 (ida y vuelta) que pidió el
          // admin para "PINGPONG"; sin yoyo, repeat:-1 hace el corte directo
          // N -> 1 que pidió para "LOOP".
          yoyo: config.direction === "PINGPONG",
          repeat: -1,
        });
      }

      // El tamaño de un ícono propio lo controla el admin (config.size); el
      // ícono por defecto (círculo de color) se queda en BADGE_SIZE fijo.
      return this.scene.add
        .sprite(0, 0, key)
        .setOrigin(0.5)
        .setDepth(PlayerHUD.HUD_DEPTH)
        .setDisplaySize(config.size * aspectOf(key), config.size)
        .setVisible(!!this.sprite)
        .play(animKey);
    }

    const ok = await loadImageTexture(this.scene, key, config.iconUrl);
    if (!ok) return fallbackToDefault();

    return this.createBadgeImage(key, config.size, aspectOf(key));
  }

  private createBadgeImage(texture: string, size = BADGE_SIZE, aspect = 1) {
    return this.scene.add
      .image(0, 0, texture)
      .setOrigin(0.5)
      .setDepth(PlayerHUD.HUD_DEPTH)
      .setDisplaySize(size * aspect, size)
      .setVisible(!!this.sprite);
  }

  update() {
    // Si no hay sprite → no hacemos nada (evita errores)
    if (!this.sprite) {
      return;
    }

    // Ahora sí sincronizamos posición
    this.usernameText.setPosition(this.sprite.x, this.sprite.y - 50);
    this.usernameText.setVisible(true);

    // Insignias alineadas a la derecha del pill del nombre. Se usa el ancho
    // real de cada ícono (displayWidth) en vez de BADGE_SIZE fijo, porque un
    // sprite no cuadrado puede ser más angosto o más ancho que BADGE_SIZE.
    if (this.badgeIcons.length > 0) {
      let iconX = this.sprite.x + this.usernameText.displayWidth / 2 + 4;
      for (const icon of this.badgeIcons) {
        iconX += icon.displayWidth / 2;
        icon.setPosition(iconX, this.sprite.y - 50).setVisible(true);
        iconX += icon.displayWidth / 2 + 3;
      }
    }

    if (this.chatText) {
      this.chatText.setPosition(this.sprite.x, this.sprite.y - 100);
      this.chatText.setDepth(PlayerHUD.HUD_DEPTH);
    }
  }

  // Objetos Phaser que componen el HUD, para que la escena pueda excluirlos
  // de otras cámaras (p. ej. el minimapa) sin depender de propiedades internas.
  getDisplayObjects(): Phaser.GameObjects.GameObject[] {
    return [this.usernameText, this.chatText, ...this.badgeIcons].filter(
      Boolean,
    ) as Phaser.GameObjects.GameObject[];
  }

  showChat(message: string, duration = 3000) {
    if (this.chatText) this.chatText.destroy();

    // Creamos el chat solo si ya hay sprite (para evitar null)
    if (!this.sprite) {
      console.warn("[PlayerHUD] No se puede mostrar chat: sprite es null");
      return;
    }

    this.chatText = this.scene.add
      .text(this.sprite.x, this.sprite.y - 100, message, {
        fontSize: "14px",
        color: "#ffff00",
        backgroundColor: "rgba(0,0,0,0.8)",
        padding: { x: 8, y: 6 },
        wordWrap: { width: 200 },
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(PlayerHUD.HUD_DEPTH);

    this.scene.time.delayedCall(duration, () => {
      this.chatText?.destroy();
      this.chatText = undefined;
    });
  }

  destroy() {
    this.usernameText.destroy();
    this.chatText?.destroy();
    this.badgeIcons.forEach((icon) => icon.destroy());
  }

  // Método para asignar el sprite después (lo llamas desde LobbyScene)
  setPlayerSprite(sprite: ModularPlayer) {
    this.sprite = sprite;
    // Forzamos una actualización inmediata para que aparezcan los textos
    this.update();
  }
}
