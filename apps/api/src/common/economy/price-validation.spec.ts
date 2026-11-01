import { BadRequestException } from '@nestjs/common';
import { assertValidShopPrice } from './price-validation';
import { getRarityDefinition, isKnownRarity, isModularBlock, ItemRarity, RARITY_DEFINITIONS } from './rarity.constants';

describe('rarity.constants', () => {
  it('defines exactly 5 tiers in the order Common..Legendary', () => {
    expect(RARITY_DEFINITIONS.map((d) => d.key)).toEqual([
      'common',
      'uncommon',
      'rare',
      'epic',
      'legendary',
    ]);
  });

  it('matches the reference coin ranges from the economy audit', () => {
    expect(getRarityDefinition(ItemRarity.COMMON)).toMatchObject({ minCoins: 5, maxCoins: 20 });
    expect(getRarityDefinition(ItemRarity.UNCOMMON)).toMatchObject({ minCoins: 25, maxCoins: 60 });
    expect(getRarityDefinition(ItemRarity.RARE)).toMatchObject({ minCoins: 70, maxCoins: 150 });
    expect(getRarityDefinition(ItemRarity.EPIC)).toMatchObject({ minCoins: 180, maxCoins: 350 });
    expect(getRarityDefinition(ItemRarity.LEGENDARY)).toMatchObject({ minCoins: 400, maxCoins: 750 });
  });

  it('throws for an unknown rarity id', () => {
    expect(() => getRarityDefinition(99)).toThrow();
    expect(isKnownRarity(99)).toBe(false);
  });
});

describe('assertValidShopPrice', () => {
  it.each([null, undefined, 0])('allows "no vendible" price %p regardless of rarity', (price) => {
    expect(() => assertValidShopPrice(ItemRarity.LEGENDARY, price as never)).not.toThrow();
  });

  it('rejects a negative price', () => {
    expect(() => assertValidShopPrice(ItemRarity.COMMON, -10)).toThrow(BadRequestException);
  });

  it('rejects an unknown rarity id', () => {
    expect(() => assertValidShopPrice(99, 100)).toThrow(BadRequestException);
  });

  it.each([
    [ItemRarity.COMMON, 5],
    [ItemRarity.COMMON, 20],
    [ItemRarity.UNCOMMON, 25],
    [ItemRarity.UNCOMMON, 60],
    [ItemRarity.RARE, 70],
    [ItemRarity.RARE, 150],
    [ItemRarity.EPIC, 180],
    [ItemRarity.EPIC, 350],
    [ItemRarity.LEGENDARY, 400],
    [ItemRarity.LEGENDARY, 750],
  ])('accepts the boundary price %p for rarity %p', (rarity, price) => {
    expect(() => assertValidShopPrice(rarity, price)).not.toThrow();
  });

  it.each([
    [ItemRarity.COMMON, 4],
    [ItemRarity.COMMON, 21],
    [ItemRarity.UNCOMMON, 24],
    [ItemRarity.UNCOMMON, 61],
    [ItemRarity.RARE, 69],
    [ItemRarity.RARE, 151],
    [ItemRarity.EPIC, 179],
    [ItemRarity.EPIC, 351],
    [ItemRarity.LEGENDARY, 399],
    [ItemRarity.LEGENDARY, 751],
  ])('rejects the just-out-of-range price %p for rarity %p', (rarity, price) => {
    expect(() => assertValidShopPrice(rarity, price)).toThrow(BadRequestException);
  });

  // Caso real de la auditoría: el único item Epic del catálogo costaba
  // 100 coins (10 tras el rebalanceo ÷10) -- muy por debajo del piso de su
  // rango. La validación debe rechazar que alguien guarde esa combinación.
  it('rejects the under-priced Epic case found in the audit (10 coins)', () => {
    expect(() => assertValidShopPrice(ItemRarity.EPIC, 10)).toThrow(BadRequestException);
  });

  it.each([1, 3, 5])('accepts a modular block at %p coins regardless of rarity', (price) => {
    expect(() => assertValidShopPrice(ItemRarity.LEGENDARY, price, true)).not.toThrow();
  });

  it.each([6, 20])('rejects a modular block priced above the block range (%p)', (price) => {
    expect(() => assertValidShopPrice(ItemRarity.COMMON, price, true)).toThrow(BadRequestException);
  });
});

describe('isModularBlock', () => {
  it('is true only for stackable 1x1 items', () => {
    expect(isModularBlock({ canBeStacked: true, footprintWidth: 1, footprintHeight: 1 })).toBe(true);
    expect(isModularBlock({ canBeStacked: true, footprintWidth: 2, footprintHeight: 1 })).toBe(false);
    expect(isModularBlock({ canBeStacked: false, footprintWidth: 1, footprintHeight: 1 })).toBe(false);
    expect(isModularBlock(null)).toBe(false);
  });
});
