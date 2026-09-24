import Phaser from "phaser";
import ModularPlayer from "../players/ModularPlayer";
import {
  getBadgeConfigCached,
  getSpriteFrameAspect,
  getUserBadges,
  type BadgeIconConfig,
} from "../network/badges";
import type { AvatarSlot } from "../types/avatar";
import {
  ChatBubbleStyle,
  ChatBubbleTheme,
  NameplateStyle,
  resolveChatBubbleTheme,
} from "./nameplateStyles";
import {
  createBubbleElement,
  createHudAnchor,
  hudStyles as styles,
  nameEffectClass,
  paintBubbleFace,
  removeBubbleElement,
  snapshotHead,
} from "./domHud";

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
  /** Efecto visual de nombre (ver @codebuddies/visual-effects). */
  nameEffectId?: string | null;
}

type BadgeKind = "VERIFIED" | "CREATOR";

// Cuántos mensajes quedan visibles a la vez por jugador. Más que esto se ve
// desordenado y, en una sala muy activa, acumula nodos sin sentido.
const MAX_CHAT_STACK = 3;

// Desde el punto del sprite hasta la base del nombre (arriba de la cabeza).
const HUD_OFFSET_Y = 42;

/**
 * Nombre + insignias + burbujas de chat de un jugador, en HTML encima del
 * canvas (Phaser DOMElement: sigue la cámara y el zoom solo).
 *
 * Antes era Text/Graphics de Phaser con un shader propio que imitaba los
 * efectos de nombre; nunca terminaba de verse igual que la UI. Ahora usa las
 * mismas clases CSS que RarityText. Contrapartida asumida: el HUD siempre
 * queda por encima de los muebles (como en Habbo).
 */
export default class PlayerHUD {
  private scene: Phaser.Scene;
  private sprite: ModularPlayer | null;
  private username: string;
  private level?: number;
  private nameEffectId: string | null;
  private readonly chatBubbleTheme: ChatBubbleTheme;

  private element: Phaser.GameObjects.DOMElement;
  private root: HTMLDivElement;
  private stack: HTMLDivElement;
  private nameEl: HTMLSpanElement;
  private badgesEl: HTMLSpanElement;

  // Retrato (cabeza + cuello) capturado del personaje tal como se ve. Se
  // recaptura en el próximo mensaje después de un cambio de avatar.
  private face: HTMLCanvasElement | null = null;
  private faceDirty = true;
  private faceCapture: Promise<HTMLCanvasElement | null> | null = null;
  private bubbles: Array<{ el: HTMLElement; token: number }> = [];
  private chatBubbleToken = 0;
  private destroyed = false;

  constructor(config: HUDConfig) {
    this.scene = config.scene;
    this.sprite = config.playerSprite;
    this.username = config.username;
    this.level = config.level;
    this.nameEffectId = config.nameEffectId ?? null;
    this.chatBubbleTheme = resolveChatBubbleTheme(config.chatBubbleThemeId);

    const { element, root } = createHudAnchor(this.scene);
    this.element = element;
    this.root = root;

    this.stack = document.createElement("div");
    this.stack.className = styles.stack;

    const plate = document.createElement("div");
    plate.className = styles.plate;

    this.nameEl = document.createElement("span");
    this.nameEl.textContent = config.username;
    plate.appendChild(this.nameEl);

    if (config.level !== undefined) {
      const levelEl = document.createElement("span");
      levelEl.className = styles.level;
      levelEl.textContent = `Lv.${config.level}`;
      plate.appendChild(levelEl);
    }

    this.badgesEl = document.createElement("span");
    this.badgesEl.className = styles.badges;
    plate.appendChild(this.badgesEl);

    this.root.append(this.stack, plate);
    this.applyNameEffect();
    this.setVisible(!!this.sprite);

    void this.loadBadges(config.username);
  }

  // Llamado por PlayerSocketSystem al recibir "playerNameEffectUpdated".
  setNameEffect(nameEffectId: string | null | undefined) {
    const normalized = nameEffectId ?? null;
    if (normalized === this.nameEffectId) return;
    this.nameEffectId = normalized;
    this.applyNameEffect();
  }

  private applyNameEffect() {
    const effect = nameEffectClass(this.nameEffectId);
    this.nameEl.className = effect || styles.nameDefault;
  }

  private setVisible(visible: boolean) {
    this.root.classList.toggle(styles.hidden, !visible);
  }

  private async loadBadges(username: string) {
    try {
      const [{ verified, isCreator }, config] = await Promise.all([
        getUserBadges(username),
        getBadgeConfigCached(),
      ]);
      if (this.destroyed || (!verified && !isCreator)) return;

      if (verified) this.badgesEl.appendChild(await this.buildBadge("VERIFIED", config.VERIFIED));
      if (isCreator) this.badgesEl.appendChild(await this.buildBadge("CREATOR", config.CREATOR));
    } catch {
      // sin insignias este ciclo, no es crítico
    }
  }

  private async buildBadge(kind: BadgeKind, config: BadgeIconConfig): Promise<HTMLElement> {
    if (!config.iconUrl) {
      const dot = document.createElement("span");
      dot.className = `${styles.badgeDot} ${kind === "VERIFIED" ? styles.badgeVerified : styles.badgeCreator}`;
      return dot;
    }

    const height = Math.max(8, config.size || 16);

    if (config.mode === "SPRITE" && config.frameCount > 1) {
      const aspect = await getSpriteFrameAspect(config.iconUrl, config.frameCount);
      const sprite = document.createElement("span");
      sprite.className = styles.badgeSprite;
      sprite.style.width = `${Math.round(height * aspect)}px`;
      sprite.style.height = `${height}px`;
      sprite.style.backgroundImage = `url("${config.iconUrl}")`;
      sprite.style.backgroundSize = `${config.frameCount * 100}% 100%`;
      // steps(N-1, jump-none) recorre exactamente los N cuadros de la tira;
      // PINGPONG = ida y vuelta, LOOP = corte directo al primero.
      sprite.style.animationDuration = `${config.frameCount / Math.max(1, config.frameRate)}s`;
      sprite.style.animationTimingFunction = `steps(${config.frameCount - 1}, jump-none)`;
      sprite.style.animationDirection = config.direction === "PINGPONG" ? "alternate" : "normal";
      return sprite;
    }

    const img = document.createElement("img");
    img.className = styles.badgeImg;
    img.src = config.iconUrl;
    img.alt = "";
    img.style.height = `${height}px`;
    return img;
  }

  // Llamado al entrar a la sala y cada vez que el jugador cambia de ropa:
  // el retrato se vuelve a capturar en su próximo mensaje (para entonces el
  // sprite ya muestra el avatar nuevo).
  async refreshAvatarHead(slots?: AvatarSlot[] | null) {
    // Sin slots todavía (jugador local antes de room:joined) no hay nada que
    // recapturar; el retrato actual sigue valiendo.
    if (!slots || slots.length === 0) return;
    this.faceDirty = true;
  }

  private captureFace(): Promise<HTMLCanvasElement | null> {
    if (!this.sprite) return Promise.resolve(null);
    if (!this.faceDirty && this.face) return Promise.resolve(this.face);
    if (this.faceCapture) return this.faceCapture;

    this.faceCapture = snapshotHead(this.scene, this.sprite)
      .then((face) => {
        if (face) {
          this.face = face;
          this.faceDirty = false;
        }
        return this.face;
      })
      .catch(() => this.face)
      .finally(() => {
        this.faceCapture = null;
      });
    return this.faceCapture;
  }

  update() {
    if (!this.sprite || this.destroyed) return;
    this.element.setPosition(this.sprite.x, this.sprite.y - HUD_OFFSET_Y);
    // El más cercano a la cámara (más abajo en pantalla) queda encima cuando
    // dos nombres se cruzan.
    this.element.setDepth(Math.round(this.sprite.y));
    this.setVisible(true);
  }

  // Burbuja nueva abajo (pegada al nombre); las anteriores suben y se van
  // desvaneciendo. themeId, si viene, es el tema que eligió el remitente.
  showChat(message: string, duration = 3000, themeId?: string | null) {
    if (!this.sprite || this.destroyed) return;

    const theme = themeId !== undefined ? resolveChatBubbleTheme(themeId) : this.chatBubbleTheme;
    const token = ++this.chatBubbleToken;

    const el = createBubbleElement({
      message,
      theme,
      name: this.username,
      nameEffectId: this.nameEffectId,
      face: this.faceDirty ? null : this.face,
      withFace: true,
    });
    if (this.faceDirty || !this.face) {
      void this.captureFace().then((face) => {
        if (face) paintBubbleFace(el, face);
      });
    }
    this.stack.appendChild(el);
    this.bubbles.push({ el, token });

    // Límite duro: la más vieja se va sin animación.
    while (this.bubbles.length > MAX_CHAT_STACK) {
      this.bubbles.shift()?.el.remove();
    }
    this.applyStackFade();
    this.update();

    this.scene.time.delayedCall(duration, () => {
      const index = this.bubbles.findIndex((entry) => entry.token === token);
      if (index === -1) return;
      const [entry] = this.bubbles.splice(index, 1);
      removeBubbleElement(entry.el);
      this.applyStackFade();
    });
  }

  // La más nueva 100% opaca, cada una más vieja un poco más tenue.
  private applyStackFade() {
    const newest = this.bubbles.length - 1;
    this.bubbles.forEach((entry, index) => {
      const age = newest - index;
      entry.el.style.opacity = String(Math.max(0.3, 1 - age * 0.35));
    });
  }

  destroy() {
    this.destroyed = true;
    this.bubbles = [];
    this.element.destroy();
  }

  setPlayerSprite(sprite: ModularPlayer) {
    this.sprite = sprite;
    this.update();
  }
}
