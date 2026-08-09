// src/game/players/ModularPlayer.ts
import Phaser from "phaser";
import AvatarBuilder, { SlotMap } from "./AvatarBuilder";
import { AvatarSlot } from "../types/avatar";

export default class ModularPlayer extends Phaser.GameObjects.Container {
  avatarSlots: AvatarSlot[] = [];
  slotMap: SlotMap = {};
  skinColor: number = 0xffffff;

  currentDirection: "up" | "down" | "left" | "right" = "down";
  isMoving = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    avatarSlots: AvatarSlot[] = [],
    skinColor: number = 0xffffff,
  ) {
    super(scene, x, y);

    this.avatarSlots = avatarSlots;
    this.skinColor = skinColor;

    scene.add.existing(this);

    if (avatarSlots.length > 0) {
      this.buildAvatar();
    }
  }

  async buildAvatar() {
    await AvatarBuilder.build(
      this.scene,
      this,
      this.avatarSlots,
      this.slotMap,
      this.skinColor,
    );

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

  move(x: number, y: number) {
    this.setPosition(x, y);
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
