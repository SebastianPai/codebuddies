// src/game/players/AvatarBuilder.ts
import Phaser from "phaser";
import { AvatarSlot } from "../types/avatar";
import { loadTextureOnce } from "../utils/phaserAssetCache";

export type SlotMap = {
  [slotName: string]: {
    base?: Phaser.GameObjects.Sprite;
    anim?: Phaser.GameObjects.Sprite;
  };
};

export default class AvatarBuilder {
  static async build(
    scene: Phaser.Scene,
    container: Phaser.GameObjects.Container,
    avatarSlots: AvatarSlot[],
    slotMap: SlotMap,
    skinColor: number = 0xffffff,
  ) {
    console.log("[AvatarBuilder PRO] 🚀 build START");

    const scale = 0.5;

    const sortedSlots = [...avatarSlots].sort(
      (a, b) => (a.layer || 0) - (b.layer || 0),
    );

    for (const slot of sortedSlots) {
      const spriteSheet = slot?.sprites?.[0];
      const baseTextureKey = slot.imageUrl;

      console.log("🧩 SLOT:", {
        slot: slot.slot,
        base: baseTextureKey,
        anim: spriteSheet?.imageUrl,
        colorable: slot.colorable,
        color: slot.color,
      });

      // ───────────── BASE (IDLE) ─────────────
      let baseSprite: Phaser.GameObjects.Sprite | undefined;

      if (baseTextureKey) {
        await loadTextureOnce(scene, baseTextureKey);

        if (scene.textures.exists(baseTextureKey)) {
          baseSprite = scene.add
            .sprite(slot.offsetX || 0, slot.offsetY || 0, baseTextureKey)
            .setScale(scale)
            .setDepth(slot.layer || 0);

          // ✅ COLOR CORRECTO POR SLOT
          if (slot.colorable) {
            baseSprite.setTint(slot.color ?? skinColor);
          }

          container.add(baseSprite);
        }
      }

      // ───────────── ANIMACIÓN ─────────────
      let animSprite: Phaser.GameObjects.Sprite | undefined;

      if (spriteSheet?.imageUrl) {
        const textureKey = spriteSheet.imageUrl;

        await loadTextureOnce(scene, textureKey);

        if (scene.textures.exists(textureKey)) {
          const texture = scene.textures.get(textureKey);

          const fw = spriteSheet.frameWidth;
          const fh = spriteSheet.frameHeight;

          const texWidth = texture.source[0].width;
          const texHeight = texture.source[0].height;

          const cols = Math.floor(texWidth / fw);
          const rows = Math.floor(texHeight / fh);

          if (cols > 0 && rows > 0) {
            let frameIndex = 0;

            for (let y = 0; y < rows; y++) {
              for (let x = 0; x < cols; x++) {
                const frameName = frameIndex.toString();

                if (!texture.has(frameName)) {
                  texture.add(frameName, 0, x * fw, y * fh, fw, fh);
                }

                frameIndex++;
              }
            }

            const dirMap: Record<string, number> = {
              down: 0,
              up: 1,
              left: 2,
              right: 3,
            };

            Object.entries(dirMap).forEach(([dir, rowIndex]) => {
              const animKey = `${slot.slot}_${dir}`;

              if (scene.anims.exists(animKey)) return;
              if (rowIndex >= rows) return;

              const start = rowIndex * cols;
              const end = start + cols - 1;

              const frames = [];

              for (let i = start; i <= end; i++) {
                frames.push({
                  key: textureKey,
                  frame: i.toString(),
                });
              }

              scene.anims.create({
                key: animKey,
                frames,
                frameRate: spriteSheet.animation?.speed || 6,
                repeat: -1, // 🔥 SIEMPRE LOOP
              });
            });

            animSprite = scene.add
              .sprite(slot.offsetX || 0, slot.offsetY || 0, textureKey, "0")
              .setScale(scale)
              .setDepth(slot.layer || 0)
              .setVisible(false);

            // ✅ COLOR CORRECTO TAMBIÉN EN ANIM
            if (slot.colorable) {
              animSprite.setTint(slot.color ?? skinColor);
            }

            container.add(animSprite);
          }
        }
      }

      slotMap[slot.slot] = {
        base: baseSprite,
        anim: animSprite,
      };
    }

    console.log("[AvatarBuilder PRO] ✅ Avatar COMPLETO");
  }
}
