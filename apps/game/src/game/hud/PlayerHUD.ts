import Phaser from "phaser";
import ModularPlayer from "../players/ModularPlayer";
import { getUserBadges, getBadgeConfigCached, type BadgeIconConfig } from "../network/badges";
import { loadTextureOnce } from "../utils/phaserAssetCache";
import type { AvatarSlot } from "../types/avatar";
import { HUD_DEPTH as WORLD_HUD_DEPTH } from "../utils/depth";
import {
  ChatBubbleStyle,
  ChatBubbleTheme,
  DEFAULT_CHAT_BUBBLE_STYLE,
  DEFAULT_NAMEPLATE_STYLE,
  NameplateStyle,
  resolveChatBubbleTheme,
} from "./nameplateStyles";

export interface HUDConfig {
  scene: Phaser.Scene;
  playerSprite: ModularPlayer | null;
  username: string;
  level?: number;
  // Overrides parciales — hoy nadie los pasa (todos usan el default), pero
  // ya están acá para cuando exista personalización Premium por usuario
  // (ver nameplateStyles.ts).
  nameplateStyle?: Partial<NameplateStyle>;
  chatBubbleStyle?: Partial<ChatBubbleStyle>;
  /** Tema de color de burbuja (ver CHAT_BUBBLE_THEMES). Default: "classic". */
  chatBubbleThemeId?: string;
}

type BadgeKind = "VERIFIED" | "CREATOR";
type BadgeVisual = Phaser.GameObjects.Image | Phaser.GameObjects.Sprite;

const VERIFIED_TEXTURE = "hud-badge-verified";
const CREATOR_TEXTURE = "hud-badge-creator";
const BADGE_SIZE = 14;

// Cuántos mensajes quedan visibles a la vez por jugador (historial apilado
// sobre la cabeza). Un límite bajo es intencional: más de esto se ve
// desordenado en pantalla y cuesta rendimiento si muchos jugadores hablan
// seguido en la misma sala.
const MAX_CHAT_STACK = 3;
const CHAT_STACK_GAP = 6;

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

// Slots que forman "la cara" del avatar modular — el mismo criterio que ya
// usa <AvatarPreview> (apps/game/.../AvatarEditor/AvatarPreview.tsx) para
// mostrar un ícono del personaje: apilar estas capas alcanza para que se vea
// como el jugador real, sin necesitar el cuerpo/piernas/brazos completos.
const FACE_SLOTS = new Set(["HEAD", "HAIR", "EYES", "ACCESSORY_FACE", "ACCESSORY_HEAD"]);

export interface FaceLayer {
  key: string;
  tint: number | null;
}

// Cada capa se agrega como una Image independiente dentro del contenedor de
// la burbuja (todas en la misma posición, apiladas por orden), en vez de
// pre-componerlas en una sola textura con RenderTexture+GeometryMask — esa
// versión anterior dependía de una combinación de APIs de Phaser más frágil
// y, si alguna fallaba en silencio, la cara nunca aparecía. Reusa
// loadTextureOnce (la misma caché de texturas que ya usa AvatarBuilder para
// dibujar al personaje en el mundo), así la cara del ícono SIEMPRE coincide
// con lo que ya se ve cargado para ese jugador.
async function buildFaceLayers(scene: Phaser.Scene, slots: AvatarSlot[]): Promise<FaceLayer[]> {
  const faceSlots = slots
    .filter((slot) => FACE_SLOTS.has(slot.slot) && !!slot.imageUrl)
    .sort((a, b) => (a.layer ?? 0) - (b.layer ?? 0));

  const layers: FaceLayer[] = [];
  for (const slot of faceSlots) {
    const key = await loadTextureOnce(scene, slot.imageUrl);
    if (!key) continue;
    layers.push({ key, tint: slot.colorable && slot.color ? slot.color : null });
  }
  return layers;
}

// Una entrada activa en el historial apilado de burbujas: se mantiene hasta
// MAX_CHAT_STACK a la vez, cada una con su propio timer de desaparición.
interface ChatStackEntry {
  container: Phaser.GameObjects.Container;
  height: number;
  token: number;
}

export default class PlayerHUD {
  // Antes era un 10000 hardcodeado acá: menor que la profundidad real de
  // cualquier mueble/avatar (tileY*1000+tileX, ver RoomItemsManager) para
  // cualquier fila >= 10, así que el nametag/chat/insignia desaparecía
  // detrás del propio jugador en la mayor parte de cualquier sala. Ahora
  // usa la misma constante compartida que el resto del motor (utils/depth.ts).
  private static readonly HUD_DEPTH = WORLD_HUD_DEPTH;

  private scene: Phaser.Scene;
  private sprite: ModularPlayer | null;
  private username: string;
  private usernameText: Phaser.GameObjects.Text;
  private chatStack: ChatStackEntry[] = [];
  private chatBubbleToken = 0;
  private badgeIcons: BadgeVisual[] = [];
  private hasAppeared = false;
  private readonly chatBubbleStyle: ChatBubbleStyle;
  private readonly chatBubbleTheme: ChatBubbleTheme;
  private avatarLayers: FaceLayer[] = [];

  constructor(config: HUDConfig) {
    this.scene = config.scene;
    this.sprite = config.playerSprite;
    this.username = config.username;
    const HUD_DEPTH = PlayerHUD.HUD_DEPTH;
    const style: NameplateStyle = { ...DEFAULT_NAMEPLATE_STYLE, ...config.nameplateStyle };
    this.chatBubbleStyle = { ...DEFAULT_CHAT_BUBBLE_STYLE, ...config.chatBubbleStyle };
    this.chatBubbleTheme = resolveChatBubbleTheme(config.chatBubbleThemeId);

    // Nombre y nivel en un solo texto/pill en vez de dos líneas flotantes con
    // estilos distintos (blanco+fondo vs. verde suelto): quedaba desprolijo
    // y no se leía como una sola etiqueta de jugador.
    const label =
      config.level !== undefined ? `${config.username}  ·  Lv.${config.level}` : config.username;

    // Antes tenía un fondo rectangular semitransparente (se veía como una
    // etiqueta/cartel). Ahora es texto "flotante" de verdad: sin fondo,
    // con contorno grueso (stroke nativo de Phaser, sin librería extra)
    // para seguir siendo legible sobre cualquier fondo de sala — mismo
    // criterio visual que Habbo y la mayoría de juegos sociales.
    // Ocultos si no hay sprite todavía; update() los posiciona y muestra.
    this.usernameText = this.scene.add
      .text(0, 0, label, {
        fontFamily: style.fontFamily,
        fontSize: `${style.fontSize}px`,
        color: style.textColor,
        fontStyle: "bold",
        stroke: style.outlineColor,
        strokeThickness: style.outlineWidth,
      })
      .setOrigin(0.5)
      .setDepth(HUD_DEPTH)
      .setAlpha(0)
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

  // Cabeza circular para mostrar junto al nombre dentro de la burbuja de
  // chat (ver showChat). Antes esto consultaba `avatarUrl` (la foto de
  // perfil estática de /profiles) — pero ese campo casi nunca está seteado,
  // porque el avatar real del juego es el compuesto por slots (HEAD/HAIR/
  // EYES/...), no una foto subida aparte. Ahora compone la cara con las
  // mismas capas que ya se usan para dibujar al personaje en el mundo (ver
  // ModularPlayer/AvatarBuilder), así siempre coincide con el avatar real.
  //
  // Se llama desde afuera (LobbyScene/PlayerSocketSystem) apenas se conocen
  // los slots del jugador — no en el constructor, porque el jugador local
  // arranca con avatarSlots vacío hasta que llega room:joined.
  async refreshAvatarHead(slots: AvatarSlot[] | null | undefined) {
    if (!slots || slots.length === 0) return;
    try {
      const layers = await buildFaceLayers(this.scene, slots);
      if (layers.length > 0) this.avatarLayers = layers;
    } catch {
      // sin avatar en la burbuja este ciclo, no es crítico
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

    // Fade-in suave la primera vez que el nombre tiene dónde aparecer (en
    // vez de aparecer de golpe) — solo una vez por HUD, no en cada frame.
    if (!this.hasAppeared) {
      this.hasAppeared = true;
      this.scene.tweens.add({
        targets: this.usernameText,
        alpha: 1,
        duration: 220,
        ease: "Sine.easeOut",
      });
    }

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

    this.layoutChatStack();
  }

  // Reposiciona todo el historial apilado para que siga al jugador en X, y
  // mantenga el orden vertical (más nuevo abajo, más viejo arriba) en Y.
  private layoutChatStack() {
    if (!this.sprite || this.chatStack.length === 0) return;

    let y = this.sprite.y - 104;
    for (const entry of this.chatStack) {
      entry.container.setPosition(this.sprite.x, y);
      y -= entry.height + CHAT_STACK_GAP;
    }
  }

  // Objetos Phaser que componen el HUD, para que la escena pueda excluirlos
  // de otras cámaras (p. ej. el minimapa) sin depender de propiedades internas.
  getDisplayObjects(): Phaser.GameObjects.GameObject[] {
    return [
      this.usernameText,
      ...this.chatStack.map((entry) => entry.container),
      ...this.badgeIcons,
    ].filter(Boolean) as Phaser.GameObjects.GameObject[];
  }

  // Burbuja de chat real (fondo redondeado + colita + cara del avatar a la
  // izquierda + mensaje a la derecha) en vez de un <Text> plano. Sin nombre
  // adentro — el nombre ya flota arriba de la cabeza (usernameText), ponerlo
  // también acá era redundante y hacía la burbuja más alta de lo necesario.
  // Ancho generoso (ver DEFAULT_CHAT_BUBBLE_STYLE.maxWidth) para que un
  // mensaje corto quede en una sola línea — la burbuja crece para los
  // lados, no hacia abajo. Cada mensaje nuevo apila arriba de los
  // anteriores (hasta MAX_CHAT_STACK) en vez de reemplazarlos al instante:
  // los viejos se desvanecen progresivamente hasta desaparecer.
  // themeId, si viene, prevalece sobre el tema por defecto de esta HUD —
  // así cada mensaje puede llevar el tema Premium que el remitente eligió
  // en Ajustes (ver network/auth.ts#GameUser.chatBubbleThemeId), aunque
  // dos jugadores distintos compartan la misma instancia de estilos base.
  showChat(message: string, duration = 3000, themeId?: string | null) {
    if (!this.sprite) {
      console.warn("[PlayerHUD] No se puede mostrar chat: sprite es null");
      return;
    }

    const style = this.chatBubbleStyle;
    const theme = themeId !== undefined ? resolveChatBubbleTheme(themeId) : this.chatBubbleTheme;
    const token = ++this.chatBubbleToken;

    const hasAvatar = this.avatarLayers.length > 0;
    const avatarSize = style.avatarSize;
    const avatarGap = 8;

    const messageText = this.scene.add
      .text(0, 0, message, {
        fontFamily: style.fontFamily,
        fontSize: `${style.fontSize}px`,
        color: theme.textColor,
        align: "left",
        wordWrap: { width: style.maxWidth },
      })
      .setOrigin(0, 0.5);

    const paddingX = 12;
    const paddingY = 8;
    const avatarBlockWidth = hasAvatar ? avatarSize + avatarGap : 0;
    const boxWidth = avatarBlockWidth + messageText.width + paddingX * 2;
    const boxHeight = Math.max(avatarSize, messageText.height) + paddingY * 2;
    const tailSize = 7;

    const bg = this.scene.add.graphics();
    bg.fillStyle(theme.backgroundColor, theme.backgroundAlpha);
    bg.lineStyle(style.borderWidth, theme.borderColor, 1);
    bg.fillRoundedRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight, style.cornerRadius);
    bg.strokeRoundedRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight, style.cornerRadius);
    // Colita apuntando hacia el jugador, cosida al borde inferior del bg.
    bg.fillTriangle(
      -tailSize,
      boxHeight / 2 - 1,
      tailSize,
      boxHeight / 2 - 1,
      0,
      boxHeight / 2 + tailSize,
    );

    const contentLeft = -boxWidth / 2 + paddingX;

    const children: Phaser.GameObjects.GameObject[] = [bg];

    if (hasAvatar) {
      const avatarX = contentLeft + avatarSize / 2;
      // Chip circular sutil detrás de la cara — ayuda a que se lea como
      // "avatar" incluso si la imagen del personaje no llena el círculo.
      const avatarBg = this.scene.add.graphics();
      avatarBg.fillStyle(0xffffff, 0.3);
      avatarBg.fillCircle(avatarX, 0, avatarSize / 2);
      children.push(avatarBg);

      for (const layer of this.avatarLayers) {
        const layerImage = this.scene.add
          .image(avatarX, 0, layer.key)
          .setOrigin(0.5)
          .setDisplaySize(avatarSize, avatarSize);
        if (layer.tint) layerImage.setTint(layer.tint);
        children.push(layerImage);
      }
    }

    messageText.setPosition(contentLeft + avatarBlockWidth, 0);
    children.push(messageText);

    const container = this.scene.add.container(this.sprite.x, this.sprite.y - 104, children);
    container.setDepth(PlayerHUD.HUD_DEPTH);
    container.setScale(0.85);
    container.setAlpha(0);

    const entry: ChatStackEntry = { container, height: boxHeight, token };
    this.chatStack.unshift(entry);

    // Límite duro: si ya había MAX_CHAT_STACK burbujas, la más vieja se
    // destruye de inmediato (sin animación) en vez de acumularse — evita
    // que una sala muy activa termine con decenas de contenedores vivos.
    while (this.chatStack.length > MAX_CHAT_STACK) {
      const removed = this.chatStack.pop();
      removed?.container.destroy();
    }

    this.layoutChatStack();
    this.applyStackFade();

    this.scene.tweens.add({
      targets: container,
      alpha: 1,
      scale: 1,
      duration: 160,
      ease: "Back.easeOut",
    });

    // Brillo diagonal que cruza la burbuja una sola vez al aparecer — solo
    // en temas Premium, para que se sientan un poco "especiales" sin
    // depender de ninguna librería de partículas/efectos: es un Rectangle
    // nativo de Phaser con blend ADD, sin máscara (por eso queda apenas más
    // ancho que la burbuja en las esquinas redondeadas, imperceptible en
    // movimiento).
    if (theme.tier === "premium") {
      const shine = this.scene.add
        .rectangle(-boxWidth / 2 - avatarSize, 0, avatarSize, boxHeight * 1.6, 0xffffff, 0.35)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAngle(20)
        .setDepth(PlayerHUD.HUD_DEPTH + 1);
      container.add(shine);

      this.scene.tweens.add({
        targets: shine,
        x: boxWidth / 2 + avatarSize,
        alpha: 0,
        duration: 650,
        delay: 120,
        ease: "Sine.easeIn",
        onComplete: () => shine.destroy(),
      });
    }

    this.scene.time.delayedCall(duration, () => {
      // Ya se removió de la pila (por el límite duro o por su propio timer
      // anterior) — no lo toques de nuevo.
      const index = this.chatStack.findIndex((e) => e.token === token);
      if (index === -1) return;

      this.scene.tweens.add({
        targets: container,
        alpha: 0,
        scale: 0.88,
        duration: 200,
        ease: "Cubic.easeIn",
        onComplete: () => {
          container.destroy();
          const stillIndex = this.chatStack.findIndex((e) => e.token === token);
          if (stillIndex !== -1) this.chatStack.splice(stillIndex, 1);
          this.layoutChatStack();
          this.applyStackFade();
        },
      });
    });
  }

  // Desvanecimiento progresivo: el mensaje más nuevo queda 100% opaco, cada
  // uno más viejo un poco más tenue, hasta casi desvanecerse antes de que le
  // toque desaparecer del todo.
  private applyStackFade() {
    this.chatStack.forEach((entry, index) => {
      if (index === 0) return; // el más nuevo ya maneja su propio fade-in
      const targetAlpha = Math.max(0.25, 1 - index * 0.35);
      this.scene.tweens.add({
        targets: entry.container,
        alpha: targetAlpha,
        duration: 200,
        ease: "Sine.easeOut",
      });
    });
  }

  destroy() {
    this.usernameText.destroy();
    this.chatStack.forEach((entry) => entry.container.destroy());
    this.chatStack = [];
    this.badgeIcons.forEach((icon) => icon.destroy());
  }

  // Método para asignar el sprite después (lo llamas desde LobbyScene)
  setPlayerSprite(sprite: ModularPlayer) {
    this.sprite = sprite;
    // Forzamos una actualización inmediata para que aparezcan los textos
    this.update();
  }
}
