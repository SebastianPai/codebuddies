import { SPRITE_OFFSET_LIMIT, clampSpriteOffset } from './sprite-offset.util';

describe('clampSpriteOffset', () => {
  it('defaults non-numeric / missing values to 0', () => {
    expect(clampSpriteOffset(undefined)).toBe(0);
    expect(clampSpriteOffset(null)).toBe(0);
    expect(clampSpriteOffset('')).toBe(0);
    expect(clampSpriteOffset('abc')).toBe(0);
    expect(clampSpriteOffset(NaN)).toBe(0);
    expect(clampSpriteOffset(Infinity)).toBe(0);
  });

  it('passes small positive and negative values through unchanged', () => {
    expect(clampSpriteOffset(0)).toBe(0);
    expect(clampSpriteOffset(10)).toBe(10);
    expect(clampSpriteOffset(-8)).toBe(-8);
    expect(clampSpriteOffset(24)).toBe(24);
    expect(clampSpriteOffset('15')).toBe(15);
  });

  it('truncates decimals to avoid sub-pixel rendering', () => {
    expect(clampSpriteOffset(12.9)).toBe(12);
    expect(clampSpriteOffset(-3.7)).toBe(-3);
  });

  it('clamps to the [-LIMIT, LIMIT] range', () => {
    expect(clampSpriteOffset(99999)).toBe(SPRITE_OFFSET_LIMIT);
    expect(clampSpriteOffset(-99999)).toBe(-SPRITE_OFFSET_LIMIT);
    expect(clampSpriteOffset(SPRITE_OFFSET_LIMIT)).toBe(SPRITE_OFFSET_LIMIT);
    expect(clampSpriteOffset(SPRITE_OFFSET_LIMIT + 1)).toBe(
      SPRITE_OFFSET_LIMIT,
    );
  });
});
