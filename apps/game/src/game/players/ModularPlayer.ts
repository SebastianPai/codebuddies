// src/game/players/ModularPlayer.ts
import Phaser from "phaser";
import AvatarBuilder, { SlotMap } from "./AvatarBuilder";
import { AvatarSlot } from "../types/avatar";

/**
 * Avatar modular del jugador.
 *
 * PUNTO DE APOYO ("ground point")
 *
 * Un ModularPlayer es un Container, no un Sprite con `origin(0.5, 1)`. Su
 * (0,0) no está en los pies: cada parte del avatar se coloca en su propio
 * `(slot.offsetX, slot.offsetY)` con origin centrado y escala 0.5 (ver
 * AvatarBuilder), así que la distancia del origen del Container a los pies
 * depende ENTERAMENTE de cómo esté configurado ese avatar en la base de
 * datos. No es una constante del juego.
 *
 * Antes se suplía con un único `PLAYER_Y_OFFSET = -20` global, calibrado a
 * ojo. Para el avatar actual el valor real resultó ser ~84 px, y esos 64 px
 * de diferencia son exactamente los que hacían que la sombra de contacto
 * flotara por encima de los pies. Y como el número correcto cambia con cada
 * composición de avatar, ninguna constante podía arreglarlo.
 *
 * Ahora la fuente de verdad es el punto de apoyo: `groundX/groundY` es
 * dónde el personaje PISA, y la posición del Container se deriva restando el
 * `footOffsetY` MEDIDO de los sprites reales. Cambiar de ropa remide y
 * recoloca sin que el personaje se mueva del suelo.
 */
export default class ModularPlayer extends Phaser.GameObjects.Container {
  avatarSlots: AvatarSlot[] = [];
  slotMap: SlotMap = {};
  skinColor: number = 0xffffff;

  currentDirection: "up" | "down" | "left" | "right" = "down";
  isMoving = false;

  // Fuente de verdad: dónde apoya el personaje en el suelo.
  private groundX = 0;
  private groundY = 0;

  // Distancia medida del origen del Container a los pies del avatar.
  private footOffsetY = 0;

  constructor(
    scene: Phaser.Scene,
    groundX: number,
    groundY: number,
    avatarSlots: AvatarSlot[] = [],
    skinColor: number = 0xffffff,
  ) {
    super(scene, groundX, groundY);

    this.groundX = groundX;
    this.groundY = groundY;
    this.avatarSlots = avatarSlots;
    this.skinColor = skinColor;

    scene.add.existing(this);

    if (avatarSlots.length > 0) {
      void this.buildAvatar();
    }
  }

  // ─────────────────────── punto de apoyo ───────────────────────

  /** Dónde pisa el personaje, en coordenadas de mundo. */
  getGroundPoint(): { x: number; y: number } {
    return { x: this.groundX, y: this.groundY };
  }

  /** Coloca al personaje por su punto de apoyo, no por el origen del sprite. */
  setGroundPosition(x: number, y: number) {
    this.groundX = x;
    this.groundY = y;
    this.applyGroundPosition();
  }

  /** Distancia medida del origen del Container a los pies (0 si no hay avatar). */
  getFootOffsetY(): number {
    return this.footOffsetY;
  }

  private applyGroundPosition() {
    this.setPosition(this.groundX, this.groundY - this.footOffsetY);
  }

  /**
   * Mide dónde caen los pies respecto del origen del Container.
   *
   * Se recorre `slotMap` en vez de usar `getBounds()` porque getBounds()
   * depende de la visibilidad de los hijos, y aquí conviven dos sprites por
   * slot (base e idle) de los que sólo uno está visible según el estado —
   * la medida saldría distinta caminando que parado. Recorriendo los
   * sprites se obtiene el mismo valor siempre.
   *
   * Cada parte tiene origin centrado (0.5, 0.5) por defecto, así que su
   * borde inferior local es `y + displayHeight·(1 − originY)`.
   */
  private measureFootOffset() {
    let bottom = -Infinity;

    for (const slotName in this.slotMap) {
      const slot = this.slotMap[slotName];
      if (!slot) continue;

      for (const sprite of [slot.base, slot.anim]) {
        if (!sprite) continue;
        bottom = Math.max(
          bottom,
          sprite.y + sprite.displayHeight * (1 - sprite.originY),
        );
      }
    }

    this.footOffsetY = Number.isFinite(bottom) ? bottom : 0;
  }

  // ─────────────────────── construcción ───────────────────────

  async buildAvatar() {
    await AvatarBuilder.build(
      this.scene,
      this,
      this.avatarSlots,
      this.slotMap,
      this.skinColor,
    );

    // El avatar nuevo puede tener otra altura: remedir y recolocar para que
    // los pies sigan en el mismo punto del suelo (el personaje no debe
    // "saltar" al cambiarse de ropa).
    this.measureFootOffset();
    this.applyGroundPosition();

    this.playIdle();
  }

  async updateAvatar(newSlots: AvatarSlot[], newSkinColor?: number) {
    this.removeAll(true);

    this.avatarSlots = newSlots;

    if (newSkinColor !== undefined) {
      this.skinColor = newSkinColor;
    }

    this.slotMap = {};

    await this.buildAvatar();
  }

  /** Mueve el personaje por su punto de apoyo (alias legible para la red). */
  move(groundX: number, groundY: number) {
    this.setGroundPosition(groundX, groundY);
  }

  // 🔥 MOVIMIENTO
  playAnimation(direction: "up" | "down" | "left" | "right") {
    this.currentDirection = direction;
    this.isMoving = true;

    for (const slotName in this.slotMap) {
      const slot = this.slotMap[slotName];
      if (!slot) continue;

      slot.base?.setVisible(false);

      if (slot.anim) {
        const animKey = `${slotName}_${direction}`;

        if (!this.scene.anims.exists(animKey)) continue;

        slot.anim.setVisible(true);

        // 🔥 CLAVE: siempre reproducir correctamente
        slot.anim.play(animKey, true);
      }
    }
  }

  // 🔥 IDLE
  playIdle() {
    this.isMoving = false;

    for (const slotName in this.slotMap) {
      const slot = this.slotMap[slotName];
      if (!slot) continue;

      slot.base?.setVisible(true);

      if (slot.anim) {
        slot.anim.setVisible(false);
        slot.anim.anims.stop();
      }
    }
  }
}
