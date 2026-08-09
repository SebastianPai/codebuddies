import Phaser from "phaser";

// Antes no existía ningún sistema de partículas en todo el cliente (grep de
// "particle"/"emitter" en apps/game/src daba cero resultados) — comprar un
// ítem o subir de nivel se sentía como "la UI actualizó un dato", nunca
// como un festejo. Estos son los dos presets mínimos: un brillo dorado
// corto para recompensas chicas (compra) y un estallido multicolor más
// grande para hitos (subir de nivel, desbloquear un logro).

const SPARKLE_TEXTURE = "fx-sparkle-dot";

function ensureSparkleTexture(scene: Phaser.Scene) {
  if (scene.textures.exists(SPARKLE_TEXTURE)) return;

  const g = scene.add.graphics();
  g.fillStyle(0xffffff, 1);
  g.fillCircle(4, 4, 4);
  g.generateTexture(SPARKLE_TEXTURE, 8, 8);
  g.destroy();
}

// Muy por encima de cualquier depth real del mundo (ver utils/depth.ts) —
// un festejo tiene que verse siempre, sin importar en qué tile esté parado
// el jugador.
const FX_DEPTH = 5_000_000;

export function burstSparkle(scene: Phaser.Scene, x: number, y: number) {
  ensureSparkleTexture(scene);

  const emitter = scene.add.particles(x, y, SPARKLE_TEXTURE, {
    lifespan: 500,
    speed: { min: 60, max: 140 },
    angle: { min: 250, max: 290 },
    scale: { start: 1.2, end: 0 },
    tint: 0xffd54a,
    quantity: 12,
    emitting: false,
  });
  emitter.setDepth(FX_DEPTH);
  emitter.explode(12);

  scene.time.delayedCall(600, () => emitter.destroy());
}

export function burstConfetti(scene: Phaser.Scene, x: number, y: number) {
  ensureSparkleTexture(scene);

  const colors = [0xffd54a, 0x4ade80, 0x60a5fa, 0xf472b6, 0xffffff];
  const emitter = scene.add.particles(x, y, SPARKLE_TEXTURE, {
    lifespan: 800,
    speed: { min: 80, max: 220 },
    angle: { min: 0, max: 360 },
    gravityY: 220,
    scale: { start: 1.4, end: 0 },
    tint: colors,
    quantity: 28,
    emitting: false,
  });
  emitter.setDepth(FX_DEPTH);
  emitter.explode(28);

  scene.time.delayedCall(900, () => emitter.destroy());
}
