import path from "path";

/**
 * Concede (y revoca) UNA fila de inventario para la QA de Game/Multiplayer.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * POR QUÉ ESTO Y NO COMPRARLO POR LA TIENDA
 *
 * Colocar un objeto exige tenerlo en `UserItem` (`RoomItemsService#placeItem`,
 * ver el chequeo `userId_itemId`). Llegar ahí por la tienda real añadiría
 * monedas, precios y el flujo de compra a esta fase — que la Fase 11 excluye
 * explícitamente ("no comenzar Marketplace/monetización"). Escribir la fila
 * directamente es el mismo patrón de "seeding reversible" que ya se aprobó en
 * la Fase 5 para el E2E físico: no toca ningún servicio ni motor, sólo pone y
 * quita UN dato de prueba.
 *
 * Nunca se usa para nada que el propio flujo de guardado/publicación no haya
 * escrito ya — el behavior, el atlas, `engineData`, etc. salen todos de la UI
 * real. Esto sólo resuelve "que el admin sea dueño del item para poder
 * colocarlo", que de otro modo exigiría simular una compra completa.
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PrismaClient } = require(
  require.resolve("@prisma/client", { paths: [path.join(__dirname, "..", "apps", "api")] }),
);

let prisma: any = null;
function client() {
  if (!prisma) prisma = new PrismaClient();
  return prisma;
}

export async function grantItem(userId: string, itemId: string): Promise<void> {
  await client().userItem.upsert({
    where: { userId_itemId: { userId, itemId } },
    update: { amount: { increment: 1 } },
    create: { userId, itemId, amount: 1 },
  });
}

export async function revokeItem(userId: string, itemId: string): Promise<void> {
  await client()
    .userItem.delete({ where: { userId_itemId: { userId, itemId } } })
    .catch(() => {
      // Ya no estaba (por ejemplo, si el item se borró primero): nada que revocar.
    });
}

export async function disconnectGrantClient(): Promise<void> {
  if (prisma) await prisma.$disconnect();
}
