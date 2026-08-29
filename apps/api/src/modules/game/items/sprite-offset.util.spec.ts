import {
  SPRITE_OFFSET_LIMIT,
  buildSpriteOffsetData,
  clampSpriteOffset,
  normalizeSpriteOffsetMap,
  normalizeSpriteOffsetSync,
} from './sprite-offset.util';

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
    expect(clampSpriteOffset('15')).toBe(15);
  });

  it('truncates decimals to avoid sub-pixel rendering', () => {
    expect(clampSpriteOffset(12.9)).toBe(12);
    expect(clampSpriteOffset(-3.7)).toBe(-3);
  });

  it('clamps to the [-LIMIT, LIMIT] range', () => {
    expect(clampSpriteOffset(99999)).toBe(SPRITE_OFFSET_LIMIT);
    expect(clampSpriteOffset(-99999)).toBe(-SPRITE_OFFSET_LIMIT);
    expect(clampSpriteOffset(SPRITE_OFFSET_LIMIT + 1)).toBe(SPRITE_OFFSET_LIMIT);
  });
});

describe('normalizeSpriteOffsetSync', () => {
  it('accepts the three known modes, defaults everything else to "mirror"', () => {
    expect(normalizeSpriteOffsetSync('all')).toBe('all');
    expect(normalizeSpriteOffsetSync('none')).toBe('none');
    expect(normalizeSpriteOffsetSync('mirror')).toBe('mirror');
    expect(normalizeSpriteOffsetSync(undefined)).toBe('mirror');
    expect(normalizeSpriteOffsetSync('garbage')).toBe('mirror');
  });
});

describe('normalizeSpriteOffsetMap', () => {
  it('"all" collapses every direction to the SOUTH value', () => {
    const map = normalizeSpriteOffsetMap(
      {
        NORTH: { x: 1, y: 2 },
        EAST: { x: 3, y: 4 },
        SOUTH: { x: -8, y: 14 },
        WEST: { x: 9, y: 9 },
      },
      'all',
    );
    expect(map.NORTH).toEqual({ x: -8, y: 14 });
    expect(map.EAST).toEqual({ x: -8, y: 14 });
    expect(map.SOUTH).toEqual({ x: -8, y: 14 });
    expect(map.WEST).toEqual({ x: -8, y: 14 });
  });

  it('"mirror" links NORTH=SOUTH and EAST=WEST', () => {
    const map = normalizeSpriteOffsetMap(
      {
        NORTH: { x: 2, y: 5 },
        EAST: { x: -12, y: 7 },
        SOUTH: { x: 999, y: 999 },
        WEST: { x: 999, y: 999 },
      },
      'mirror',
    );
    expect(map.SOUTH).toEqual(map.NORTH);
    expect(map.SOUTH).toEqual({ x: 2, y: 5 });
    expect(map.WEST).toEqual(map.EAST);
    expect(map.WEST).toEqual({ x: -12, y: 7 });
  });

  it('"none" keeps all four independent and clamps each axis', () => {
    const map = normalizeSpriteOffsetMap(
      {
        NORTH: { x: 1.9, y: -2 },
        EAST: { x: 5000, y: 3 },
        SOUTH: { x: 0, y: 0 },
        WEST: { x: -4, y: -5000 },
      },
      'none',
    );
    expect(map.NORTH).toEqual({ x: 1, y: -2 });
    expect(map.EAST).toEqual({ x: SPRITE_OFFSET_LIMIT, y: 3 });
    expect(map.WEST).toEqual({ x: -4, y: -SPRITE_OFFSET_LIMIT });
  });

  it('fills missing directions from the fallback (legacy scalar)', () => {
    const map = normalizeSpriteOffsetMap(undefined, 'none', { x: -8, y: 14 });
    expect(map.NORTH).toEqual({ x: -8, y: 14 });
    expect(map.WEST).toEqual({ x: -8, y: 14 });
  });
});

describe('buildSpriteOffsetData', () => {
  it('seeds the map from the legacy scalar when no map is sent', () => {
    const out = buildSpriteOffsetData({ spriteOffsetX: 10, spriteOffsetY: -6 });
    expect(out.spriteOffsetSync).toBe('mirror');
    expect(out.spriteOffsets.NORTH).toEqual({ x: 10, y: -6 });
    expect(out.spriteOffsets.WEST).toEqual({ x: 10, y: -6 });
    // legacy scalar column mirrors SOUTH
    expect(out.spriteOffsetX).toBe(10);
    expect(out.spriteOffsetY).toBe(-6);
  });

  it('keeps EAST/WEST distinct from NORTH/SOUTH in mirror mode', () => {
    const out = buildSpriteOffsetData({
      spriteOffsetSync: 'mirror',
      spriteOffsets: {
        NORTH: { x: 0, y: 12 },
        EAST: { x: -10, y: 4 },
      },
    });
    expect(out.spriteOffsets.SOUTH).toEqual({ x: 0, y: 12 });
    expect(out.spriteOffsets.WEST).toEqual({ x: -10, y: 4 });
    expect(out.spriteOffsetX).toBe(0); // SOUTH.x
    expect(out.spriteOffsetY).toBe(12); // SOUTH.y
  });

  it('takes sync/map from `existing` on a partial update', () => {
    const out = buildSpriteOffsetData({
      spriteOffsetSync: 'none',
      existing: {
        spriteOffsetSync: 'mirror',
        spriteOffsets: {
          NORTH: { x: 1, y: 1 },
          EAST: { x: 2, y: 2 },
          SOUTH: { x: 1, y: 1 },
          WEST: { x: 2, y: 2 },
        },
        spriteOffsetX: 1,
        spriteOffsetY: 1,
      },
    });
    // sync switched to none, map preserved from existing
    expect(out.spriteOffsetSync).toBe('none');
    expect(out.spriteOffsets.EAST).toEqual({ x: 2, y: 2 });
    expect(out.spriteOffsets.NORTH).toEqual({ x: 1, y: 1 });
  });
});
