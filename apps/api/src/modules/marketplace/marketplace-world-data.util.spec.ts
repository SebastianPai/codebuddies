import { TV_BEHAVIOR } from '@codebuddies/world-objects';

import { buildMarketplaceWorldData } from './marketplace-world-data.util';

/**
 * EL BUG QUE ESTE ARCHIVO EXISTE PARA QUE NO VUELVA.
 *
 * `createPublishedItemFromContent` y `updatePublishedItemFromContent`
 * escribían cada uno su propio objeto `data` a mano, y el del update sólo
 * cubría 11 de las ~30 columnas de WorldItemData. Republicar un item
 * publicado le borraba la configuración avanzada — justo la que el editor del
 * creador no manda porque sólo la toca un admin.
 *
 * Ahora las dos rutas llaman a `buildMarketplaceWorldData`, y estos tests
 * fijan las dos propiedades que importan:
 *   1. lo que el payload NO trae se CONSERVA de la fila existente;
 *   2. crear y actualizar producen el MISMO conjunto de columnas.
 */

/** worldData tal como lo manda el editor del creador para un world item. */
function creatorPayload(overrides: Record<string, any> = {}) {
  return {
    kind: 'FURNITURE',
    width: 512,
    height: 128,
    spriteSheetUrl: 'https://cdn/tv.png',
    previewImageUrl: 'https://cdn/tv.png',
    frameWidth: 128,
    frameHeight: 128,
    directions: 4,
    rotatable: true,
    footprintWidth: 1,
    footprintHeight: 1,
    syncDirections: true,
    footprints: undefined,
    surfaces: undefined,
    spriteOffsets: {
      NORTH: { x: 0, y: -4 },
      EAST: { x: 2, y: -4 },
      SOUTH: { x: 0, y: -4 },
      WEST: { x: 2, y: -4 },
    },
    spriteOffsetSync: 'mirror',
    isCollidable: true,
    walkable: false,
    isInteractable: false,
    placementType: 'FLOOR',
    allowsStacking: false,
    canBeStacked: false,
    stackHeight: 10,
    maxStackHeight: 10,
    ...overrides,
  };
}

/**
 * Fila de WorldItemData de un item YA publicado al que un admin le configuró
 * la parte avanzada desde /admin/world-items.
 */
function existingRow(overrides: Record<string, any> = {}) {
  return {
    width: 512,
    height: 128,
    spriteSheetUrl: 'https://cdn/tv.png',
    previewImageUrl: 'https://cdn/tv-preview.png',
    frameWidth: 128,
    frameHeight: 128,
    footprintWidth: 1,
    footprintHeight: 1,
    syncDirections: true,
    footprints: null,
    surfaces: null,
    engineData: { frameWidth: 128, frameHeight: 128 },
    directions: 4,
    kind: 'FURNITURE',
    category: 'ELECTRONICS',
    isCollidable: true,
    walkable: false,
    isInteractable: true,
    rotatable: true,
    placementType: 'FLOOR',
    allowsStacking: true,
    canBeStacked: false,
    stackHeight: 10,
    maxStackHeight: 10,
    interactionTypes: ['TOGGLE'],
    sitX: 3,
    sitY: 4,
    sitElevation: 2,
    teleportTargetRoomId: 'room-9',
    teleportTargetX: 7,
    teleportTargetY: 8,
    spriteOffsets: {
      NORTH: { x: 5, y: -10 },
      EAST: { x: 5, y: -10 },
      SOUTH: { x: 5, y: -10 },
      WEST: { x: 5, y: -10 },
    },
    spriteOffsetSync: 'all',
    spriteOffsetX: 5,
    spriteOffsetY: -10,
    behavior: TV_BEHAVIOR,
    ...overrides,
  };
}

describe('buildMarketplaceWorldData — primera publicación', () => {
  it('mapea el payload del creador a columnas', () => {
    const data = buildMarketplaceWorldData({
      worldData: creatorPayload(),
      imageUrl: 'https://cdn/tv.png',
      previewUrl: 'https://cdn/tv-preview.png',
      existing: null,
    }) as any;

    expect(data.kind).toBe('FURNITURE');
    expect(data.width).toBe(512);
    expect(data.directions).toBe(4);
    expect(data.isCollidable).toBe(true);
    expect(data.previewImageUrl).toBe('https://cdn/tv-preview.png');
  });

  it('DERIVA engineData en el servidor en vez de copiarlo del payload', () => {
    // Antes el create guardaba `worldData.engineData` tal como venía del
    // cliente — un dato con el que el motor recorta el spritesheet, en manos
    // de quien sube el contenido. Ahora sale de buildWorldEngineData().
    const data = buildMarketplaceWorldData({
      worldData: creatorPayload({
        engineData: { frameWidth: 9999, frameHeight: 9999, inventado: true },
      }),
      imageUrl: 'https://cdn/tv.png',
      previewUrl: null,
      existing: null,
    }) as any;

    expect(data.engineData.frameWidth).toBe(128); // 512 / 4 caras
    expect(data.engineData.frameHeight).toBe(128);
    expect(data.engineData.inventado).toBeUndefined();
    expect(data.engineData.footprints.NORTH).toBeDefined();
  });

  it('persiste los spriteOffsets del creador, que antes se ignoraban', () => {
    const data = buildMarketplaceWorldData({
      worldData: creatorPayload(),
      imageUrl: 'https://cdn/tv.png',
      previewUrl: null,
      existing: null,
    }) as any;

    expect(data.spriteOffsets.NORTH).toEqual({ x: 0, y: -4 });
    expect(data.spriteOffsetSync).toBe('mirror');
    // Escalares legacy = SOUTH, para lectores viejos.
    expect(data.spriteOffsetY).toBe(-4);
  });

  it('sin behavior en el payload no escribe la columna', () => {
    // Objeto estático: comportamiento de siempre, y el `data` de Prisma ni
    // menciona la columna.
    const data = buildMarketplaceWorldData({
      worldData: creatorPayload(),
      imageUrl: 'https://cdn/chair.png',
      previewUrl: null,
      existing: null,
    });

    expect('behavior' in data).toBe(false);
  });

  it('con behavior válido lo persiste', () => {
    const data = buildMarketplaceWorldData({
      worldData: creatorPayload({ behavior: TV_BEHAVIOR }),
      imageUrl: 'https://cdn/tv.png',
      previewUrl: null,
      existing: null,
    }) as any;

    expect(data.behavior).toEqual(TV_BEHAVIOR);
  });

  it('con behavior inválido lanza en vez de publicar basura', () => {
    expect(() =>
      buildMarketplaceWorldData({
        worldData: creatorPayload({ behavior: { version: 1, states: 'nope' } }),
        imageUrl: 'https://cdn/tv.png',
        previewUrl: null,
        existing: null,
      }),
    ).toThrow(/Comportamiento del objeto inválido|inválido/);
  });

  it('descarta un interactionType que no está en el enum', () => {
    const data = buildMarketplaceWorldData({
      worldData: creatorPayload({ interactionTypes: ['TOGGLE', 'DROP_TABLES', 'OPEN'] }),
      imageUrl: null,
      previewUrl: null,
      existing: null,
    }) as any;

    expect(data.interactionTypes).toEqual(['TOGGLE', 'OPEN']);
  });
});

describe('buildMarketplaceWorldData — republicación (EL BUG)', () => {
  // El editor del creador NO manda estos campos: los edita un admin aparte.
  // Antes, "ausente" se traducía a "volvé al default" y se perdían.
  const creatorReedit = creatorPayload({
    interactionTypes: undefined,
    isInteractable: undefined,
    sitX: undefined,
    sitY: undefined,
    sitElevation: undefined,
    teleportTargetRoomId: undefined,
    teleportTargetX: undefined,
    teleportTargetY: undefined,
    spriteOffsets: undefined,
    spriteOffsetSync: undefined,
    behavior: undefined,
    rotatable: undefined,
    allowsStacking: undefined,
    category: undefined,
  });

  function republish(existing = existingRow()) {
    return buildMarketplaceWorldData({
      worldData: creatorReedit,
      imageUrl: 'https://cdn/tv.png',
      previewUrl: 'https://cdn/tv-preview.png',
      existing,
    }) as any;
  }

  it('conserva interactionTypes', () => {
    expect(republish().interactionTypes).toEqual(['TOGGLE']);
  });

  it('conserva isInteractable', () => {
    // Si esto vuelve a false, interactItem() responde "Este objeto no es
    // interactivo" y el mueble queda muerto para toda la sala.
    expect(republish().isInteractable).toBe(true);
  });

  it('conserva spriteOffsets (y sus escalares legacy)', () => {
    const data = republish();
    expect(data.spriteOffsets.NORTH).toEqual({ x: 5, y: -10 });
    expect(data.spriteOffsetSync).toBe('all');
    expect(data.spriteOffsetX).toBe(5);
    expect(data.spriteOffsetY).toBe(-10);
  });

  it('conserva engineData coherente (no lo deja en null)', () => {
    // El juego lee frameWidth de engineData; sin él cae a width/4 y un sprite
    // de 1 o 2 caras se recorta fuera de rango.
    const data = republish();
    expect(data.engineData).toBeDefined();
    expect(data.engineData.frameWidth).toBe(128);
    expect(data.footprints.NORTH.occupied).toBeDefined();
  });

  it('conserva behavior: omite la clave, que es como Prisma deja la columna intacta', () => {
    // Para `behavior` la conservación NO se hace reescribiendo el valor, a
    // diferencia del resto de las columnas: omitir la clave en el `update` de
    // Prisma deja el JSON como está.
    //
    // Se hace así a propósito. Reescribirlo obligaría a revalidarlo en cada
    // republicación, y si el contrato se endurece (un límite más bajo, un
    // trigger que se retira) un objeto perfectamente funcional empezaría a
    // fallar al republicar por un dato que el creador no puede arreglar.
    //
    // El efecto REAL sobre la fila se verifica en marketplace.service.spec.ts,
    // que simula el merge que hace Postgres.
    expect('behavior' in republish()).toBe(false);
  });

  it('conserva el resto de la config avanzada', () => {
    const data = republish();
    expect(data.rotatable).toBe(true);
    expect(data.placementType).toBe('FLOOR');
    expect(data.category).toBe('ELECTRONICS');
    expect(data.allowsStacking).toBe(true);
    expect(data.sitX).toBe(3);
    expect(data.sitY).toBe(4);
    expect(data.sitElevation).toBe(2);
    expect(data.teleportTargetRoomId).toBe('room-9');
    expect(data.teleportTargetX).toBe(7);
    expect(data.teleportTargetY).toBe(8);
  });

  it('lo que el payload SÍ trae gana sobre lo existente', () => {
    // Conservar no puede volverse "ignorar": el creador tiene que poder
    // cambiar lo suyo.
    const data = buildMarketplaceWorldData({
      worldData: creatorPayload({ width: 256, directions: 2, isCollidable: false }),
      imageUrl: 'https://cdn/tv.png',
      previewUrl: null,
      existing: existingRow(),
    }) as any;

    expect(data.width).toBe(256);
    expect(data.directions).toBe(2);
    expect(data.isCollidable).toBe(false);
    expect(data.engineData.frameWidth).toBe(128); // 256 / 2 caras
  });

  it('un behavior nuevo en el payload reemplaza al viejo', () => {
    const replacement = {
      version: 1 as const,
      initialState: 'IDLE',
      states: [{ key: 'IDLE', animation: null }],
      animations: [],
      transitions: [],
    };
    const replaced = buildMarketplaceWorldData({
      worldData: creatorPayload({ behavior: replacement }),
      imageUrl: null,
      previewUrl: null,
      existing: existingRow({ behavior: TV_BEHAVIOR }),
    }) as any;
    expect(replaced.behavior).toEqual(replacement);
  });

  it('behavior: null limpia la columna (objeto vuelve a estático)', () => {
    const data = buildMarketplaceWorldData({
      worldData: creatorPayload({ behavior: null }),
      imageUrl: null,
      previewUrl: null,
      existing: existingRow({ behavior: TV_BEHAVIOR }),
    }) as any;

    // Prisma.JsonNull, no undefined: la columna se escribe a NULL.
    expect('behavior' in data).toBe(true);
    expect(data.behavior).not.toEqual(TV_BEHAVIOR);
  });

  it('un item publicado SIN behavior sigue sin behavior', () => {
    // Compatibilidad: republicar una silla no le inventa una máquina de
    // estados.
    const data = buildMarketplaceWorldData({
      worldData: creatorReedit,
      imageUrl: null,
      previewUrl: null,
      existing: existingRow({ behavior: null }),
    });

    expect('behavior' in data).toBe(false);
  });
});

describe('paridad create / update', () => {
  it('las dos rutas escriben EXACTAMENTE el mismo conjunto de columnas', () => {
    // Este test es el que impide que el bug vuelva: si alguien agrega una
    // columna a una rama y no a la otra, ya no hay "otra rama" — pero si
    // alguien reintroduce un mapeo a mano, esto lo detecta.
    const created = buildMarketplaceWorldData({
      worldData: creatorPayload({ behavior: TV_BEHAVIOR }),
      imageUrl: 'https://cdn/tv.png',
      previewUrl: 'https://cdn/tv-preview.png',
      existing: null,
    });

    const updated = buildMarketplaceWorldData({
      worldData: creatorPayload({ behavior: TV_BEHAVIOR }),
      imageUrl: 'https://cdn/tv.png',
      previewUrl: 'https://cdn/tv-preview.png',
      existing: existingRow(),
    });

    expect(Object.keys(created).sort()).toEqual(Object.keys(updated).sort());
  });

  it('cubre todas las columnas configurables de WorldItemData', () => {
    // Lista explícita: si el modelo gana una columna que el marketplace debe
    // publicar, este test recuerda agregarla al mapeo.
    const data = buildMarketplaceWorldData({
      worldData: creatorPayload({ behavior: TV_BEHAVIOR }),
      imageUrl: 'https://cdn/tv.png',
      previewUrl: null,
      existing: null,
    });

    for (const column of [
      'width',
      'height',
      'spriteSheetUrl',
      'previewImageUrl',
      'frameWidth',
      'frameHeight',
      'footprintWidth',
      'footprintHeight',
      'syncDirections',
      'footprints',
      'surfaces',
      'engineData',
      'directions',
      'kind',
      'category',
      'isCollidable',
      'walkable',
      'isInteractable',
      'rotatable',
      'placementType',
      'allowsStacking',
      'canBeStacked',
      'stackHeight',
      'maxStackHeight',
      'interactionTypes',
      'sitX',
      'sitY',
      'sitElevation',
      'teleportTargetRoomId',
      'teleportTargetX',
      'teleportTargetY',
      'spriteOffsets',
      'spriteOffsetSync',
      'spriteOffsetX',
      'spriteOffsetY',
      'behavior',
    ]) {
      expect(Object.keys(data)).toContain(column);
    }
  });
});
