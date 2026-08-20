import { BadRequestException } from '@nestjs/common';
import { assertValidShopPrice } from './price-validation';
import { getRarityDefinition, isKnownRarity, ItemRarity, RARITY_DEFINITIONS } from './rarity.constants';

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
    expect(getRarityDefinition(ItemRarity.COMMON)).toMatchObject({ minCoins: 50, maxCoins: 200 });
    expect(getRarityDefinition(ItemRarity.UNCOMMON)).toMatchObject({ minCoins: 250, maxCoins: 600 });
    expect(getRarityDefinition(ItemRarity.RARE)).toMatchObject({ minCoins: 700, maxCoins: 1500 });
    expect(getRarityDefinition(ItemRarity.EPIC)).toMatchObject({ minCoins: 1800, maxCoins: 3500 });
    expect(getRarityDefinition(ItemRarity.LEGENDARY)).toMatchObject({ minCoins: 4000, maxCoins: 7500 });
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
    [ItemRarity.COMMON, 50],
    [ItemRarity.COMMON, 200],
    [ItemRarity.UNCOMMON, 250],
    [ItemRarity.UNCOMMON, 600],
    [ItemRarity.RARE, 700],
    [ItemRarity.RARE, 1500],
    [ItemRarity.EPIC, 1800],
    [ItemRarity.EPIC, 3500],
    [ItemRarity.LEGENDARY, 4000],
    [ItemRarity.LEGENDARY, 7500],
  ])('accepts the boundary price %p for rarity %p', (rarity, price) => {
    expect(() => assertValidShopPrice(rarity, price)).not.toThrow();
  });

  it.each([
    [ItemRarity.COMMON, 49],
    [ItemRarity.COMMON, 201],
    [ItemRarity.UNCOMMON, 249],
    [ItemRarity.UNCOMMON, 601],
    [ItemRarity.RARE, 699],
    [ItemRarity.RARE, 1501],
    [ItemRarity.EPIC, 1799],
    [ItemRarity.EPIC, 3501],
    [ItemRarity.LEGENDARY, 3999],
    [ItemRarity.LEGENDARY, 7501],
  ])('rejects the just-out-of-range price %p for rarity %p', (rarity, price) => {
    expect(() => assertValidShopPrice(rarity, price)).toThrow(BadRequestException);
  });

  // Caso real de la auditoría: el único item Epic del catálogo cuesta 100
  // coins -- muy por debajo del piso de su rango (1800). Esta fase no toca
  // ese precio existente, pero la validación sí debe rechazar que alguien
  // vuelva a guardar esa combinación de acá en más.
  it('rejects the exact under-priced Epic case found in the audit (100 coins)', () => {
    expect(() => assertValidShopPrice(ItemRarity.EPIC, 100)).toThrow(BadRequestException);
  });
});
