import { CoinBoostScope, CoinPurchaseStatus } from '@prisma/client';
import { BOOST_PACKAGES, MAX_COIN_MULTIPLIER, boostedCoins, findBoostPackage } from './boost-packages';
import { CoinBoostsService } from './coin-boosts.service';

describe('boostedCoins', () => {
  it('multiplica y redondea a monedas enteras', () => {
    expect(boostedCoins(10, 1.5)).toBe(15);
    expect(boostedCoins(5, 1.5)).toBe(8);
  });
  it('nunca pasa del tope ni baja de x1', () => {
    expect(boostedCoins(10, 2.25)).toBe(10 * MAX_COIN_MULTIPLIER);
    expect(boostedCoins(10, 0.5)).toBe(10);
  });
  it('no toca montos cero o negativos (gastos)', () => {
    expect(boostedCoins(0, 2)).toBe(0);
    expect(boostedCoins(-20, 2)).toBe(-20);
  });
});

describe('catálogo', () => {
  it('tiene un boost personal y uno comunitario, precios en servidor', () => {
    expect(findBoostPackage('boost_personal_24h')?.scope).toBe(CoinBoostScope.PERSONAL);
    expect(findBoostPackage('boost_community_1h')?.durationMinutes).toBe(60);
    expect(findBoostPackage('nope')).toBeUndefined();
    for (const pkg of BOOST_PACKAGES) expect(pkg.priceUsd).toBeGreaterThan(0);
  });
});

describe('CoinBoostsService', () => {
  const tx = () => ({
    coinBoost: { findFirst: jest.fn(), aggregate: jest.fn(), findUnique: jest.fn(), updateMany: jest.fn() },
    user: { update: jest.fn() },
    coinTransaction: { create: jest.fn() },
  });

  it('sin boosts: multiplicador 1 y no entrega extra', async () => {
    const db = tx();
    db.coinBoost.findFirst.mockResolvedValue(null);
    const service = new CoinBoostsService(db as never, {} as never);
    await expect(service.grantBonus(db as never, 'u1', 20, 'progress:exercise')).resolves.toBe(0);
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it('personal x1.5 + comunitario x1.5 se recorta a x2 y deja el extra en el ledger', async () => {
    const db = tx();
    db.coinBoost.findFirst.mockResolvedValue({ multiplier: 1.5 });
    const service = new CoinBoostsService(db as never, {} as never);
    await expect(service.grantBonus(db as never, 'u1', 20, 'mission:daily')).resolves.toBe(20);
    expect(db.user.update).toHaveBeenCalledWith({ where: { id: 'u1' }, data: { coins: { increment: 20 } } });
    expect(db.coinTransaction.create.mock.calls[0][0].data.reason).toMatch(/^boost:x2:/);
  });

  it('activar es idempotente: un boost ya completado no se vuelve a activar', async () => {
    const db = tx();
    const completed = { id: 'b1', status: CoinPurchaseStatus.COMPLETED };
    db.coinBoost.findUnique.mockResolvedValue(completed);
    const prisma = { ...db, $transaction: (run: (t: unknown) => unknown) => run(db) };
    const service = new CoinBoostsService(prisma as never, {} as never);
    await expect(service.activate('b1', 'txn_1')).resolves.toBe(completed);
    expect(db.coinBoost.updateMany).not.toHaveBeenCalled();
  });

  it('encadena: el nuevo boost empieza cuando termina el último del mismo alcance', async () => {
    const db = tx();
    const lastEnd = new Date(Date.now() + 30 * 60_000);
    db.coinBoost.findUnique.mockResolvedValueOnce({ id: 'b2', status: CoinPurchaseStatus.PENDING, scope: CoinBoostScope.COMMUNITY, userId: 'u2', durationMinutes: 60 });
    db.coinBoost.aggregate.mockResolvedValue({ _max: { endsAt: lastEnd } });
    db.coinBoost.updateMany.mockResolvedValue({ count: 1 });
    const prisma = { ...db, $transaction: (run: (t: unknown) => unknown) => run(db) };
    const service = new CoinBoostsService(prisma as never, {} as never);
    await service.activate('b2', null);
    const data = db.coinBoost.updateMany.mock.calls[0][0].data;
    expect(data.startsAt).toEqual(lastEnd);
    expect(data.endsAt.getTime() - lastEnd.getTime()).toBe(60 * 60_000);
  });
});
