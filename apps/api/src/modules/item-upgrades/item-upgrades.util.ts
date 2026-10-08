import { lockedStatesFor } from '@codebuddies/world-objects';
import type { PrismaService } from '../../prisma/prisma.service';

type PrismaLike = Pick<PrismaService, 'itemUpgrade' | 'userItemUpgrade'>;

// Estados del behavior de `itemId` que `ownerId` todavía no desbloqueó. El
// dueño es quien colocó el objeto (RoomItem.userId): sus mejoras valen para
// todas sus copias de ese objeto, en cualquier sala, y para cualquier
// jugador que lo toque.
export async function lockedStatesForOwner(
  prisma: PrismaLike,
  ownerId: string,
  itemId: string,
): Promise<string[]> {
  const upgrades = await prisma.itemUpgrade.findMany({
    where: { itemId, active: true },
    select: { id: true, unlockStates: true },
  });
  if (upgrades.length === 0) return [];
  const owned = await prisma.userItemUpgrade.findMany({
    where: { userId: ownerId, upgradeId: { in: upgrades.map((u) => u.id) } },
    select: { upgradeId: true },
  });
  return lockedStatesFor(upgrades, new Set(owned.map((o) => o.upgradeId)));
}

// Versión en lote para armar la sala entera de una vez: clave
// `${ownerId}:${itemId}` → estados bloqueados.
export async function lockedStatesForPairs(
  prisma: PrismaLike,
  pairs: Array<{ ownerId: string; itemId: string }>,
): Promise<Map<string, string[]>> {
  const result = new Map<string, string[]>();
  const itemIds = [...new Set(pairs.map((p) => p.itemId))];
  if (itemIds.length === 0) return result;

  const upgrades = await prisma.itemUpgrade.findMany({
    where: { itemId: { in: itemIds }, active: true },
    select: { id: true, itemId: true, unlockStates: true },
  });
  if (upgrades.length === 0) return result;

  const ownerIds = [...new Set(pairs.map((p) => p.ownerId))];
  const owned = await prisma.userItemUpgrade.findMany({
    where: { userId: { in: ownerIds }, upgradeId: { in: upgrades.map((u) => u.id) } },
    select: { userId: true, upgradeId: true },
  });

  for (const { ownerId, itemId } of pairs) {
    const key = `${ownerId}:${itemId}`;
    if (result.has(key)) continue;
    const itemUpgrades = upgrades.filter((u) => u.itemId === itemId);
    if (itemUpgrades.length === 0) continue;
    const ownedIds = new Set(owned.filter((o) => o.userId === ownerId).map((o) => o.upgradeId));
    result.set(key, lockedStatesFor(itemUpgrades, ownedIds));
  }
  return result;
}
