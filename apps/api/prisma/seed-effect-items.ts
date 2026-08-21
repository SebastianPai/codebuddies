import { ItemType, PrismaClient } from '@prisma/client';

// Los 9 efectos "ownable" del sistema de Name Effect (ver plan de
// entitlements) -- no incluidos en Premium, se compran en la tienda con
// coins, se pueden regalar (ItemsService.giftItem), o se otorgan como
// recompensa de Battle Pass (BattlePassTier.itemId ya soporta esto sin
// código nuevo). effectKey debe matchear un id real de
// packages/visual-effects/index.ts.
type EffectItemSeed = {
  effectKey: string;
  name: string;
  description: string;
  coinsPrice: number;
};

const EFFECT_ITEMS: EffectItemSeed[] = [
  { effectKey: 'rainbow', name: 'Efecto de Nombre: Arcoíris', description: 'Tu nombre brilla con todos los colores del arcoíris.', coinsPrice: 3000 },
  { effectKey: 'mythic', name: 'Efecto de Nombre: Mítico', description: 'Un degradado magenta-violeta digno de leyenda.', coinsPrice: 3500 },
  { effectKey: 'divine', name: 'Efecto de Nombre: Divino', description: 'Un resplandor dorado suave y radiante.', coinsPrice: 3500 },
  { effectKey: 'galaxy', name: 'Efecto de Nombre: Galaxia', description: 'Tonos de un cielo estrellado infinito.', coinsPrice: 4000 },
  { effectKey: 'aurora', name: 'Efecto de Nombre: Aurora', description: 'Los colores de una aurora boreal.', coinsPrice: 4000 },
  { effectKey: 'holographic', name: 'Efecto de Nombre: Holográfico', description: 'Un shimmer pastel multicolor, como una lámina holográfica.', coinsPrice: 4500 },
  { effectKey: 'obsidian', name: 'Efecto de Nombre: Obsidiana', description: 'Negro profundo con vetas violeta.', coinsPrice: 3000 },
  { effectKey: 'matrix', name: 'Efecto de Nombre: Matrix', description: 'Verde digital sobre fondo oscuro.', coinsPrice: 3000 },
  { effectKey: 'crystal', name: 'Efecto de Nombre: Cristal', description: 'Reflejos prismáticos lila y blanco.', coinsPrice: 3000 },
];

export async function seedEffectItems(prisma: PrismaClient) {
  const language = await prisma.language.findUnique({ where: { code: 'es' } });
  if (!language) {
    console.warn('seedEffectItems: idioma "es" no encontrado, se omite el seed.');
    return;
  }

  for (const effect of EFFECT_ITEMS) {
    const existing = await prisma.item.findFirst({
      where: { type: ItemType.EFFECT, effectKey: effect.effectKey },
      select: { id: true },
    });
    if (existing) continue;

    await prisma.item.create({
      data: {
        type: ItemType.EFFECT,
        effectKey: effect.effectKey,
        coinsPrice: effect.coinsPrice,
        shopVisible: true,
        maxStack: 1,
        isTradable: false,
        translations: {
          create: {
            languageId: language.id,
            name: effect.name,
            description: effect.description,
          },
        },
      },
    });
  }

  console.log(`seedEffectItems: ${EFFECT_ITEMS.length} items de efecto verificados/creados.`);
}
