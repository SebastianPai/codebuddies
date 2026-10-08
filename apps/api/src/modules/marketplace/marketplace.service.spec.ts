import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { TV_BEHAVIOR } from '@codebuddies/world-objects';

import { MarketplaceService } from './marketplace.service';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Publicación y republicación de un world item del Marketplace.
 *
 * Lo que se prueba acá es el CABLEADO, no el mapeo (eso está en
 * marketplace-world-data.util.spec.ts): que `updatePublishedItemFromContent`
 * de verdad lee la fila existente y se la pasa al mapeo, y que el efecto
 * neto sobre la fila de WorldItemData es conservar la configuración avanzada.
 *
 * `applyPrismaUpdate` simula lo que hace Postgres con el `update` de un
 * upsert: las columnas presentes se escriben, las ausentes se quedan como
 * estaban. Es lo que convierte "la clave está ausente" en la afirmación que
 * de verdad importa: "después de republicar, la fila SIGUE teniendo esto".
 */
function applyPrismaUpdate<T extends Record<string, any>>(
  row: T,
  update: Record<string, any>,
): T {
  return { ...row, ...update };
}

const TV_PAYLOAD = {
  worldData: {
    kind: 'FURNITURE',
    width: 512,
    height: 128,
    directions: 4,
    footprintWidth: 1,
    footprintHeight: 1,
    spriteSheetUrl: 'https://cdn/tv.png',
    isCollidable: true,
    placementType: 'FLOOR',
  },
  item: { rarity: 2, colorable: false },
};

/** Fila que un admin dejó configurada desde /admin/world-items. */
const CONFIGURED_ROW = {
  itemId: 'item-tv',
  width: 512,
  height: 128,
  directions: 4,
  footprintWidth: 1,
  footprintHeight: 1,
  footprints: null,
  surfaces: null,
  engineData: { frameWidth: 128, frameHeight: 128 },
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
  spriteSheetUrl: 'https://cdn/tv.png',
  previewImageUrl: 'https://cdn/tv-preview.png',
  frameWidth: 128,
  frameHeight: 128,
  syncDirections: true,
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
};

describe('MarketplaceService — publicación de world items', () => {
  let service: MarketplaceService;

  const tx = {
    item: { create: jest.fn(), update: jest.fn() },
    itemTranslation: { create: jest.fn(), updateMany: jest.fn() },
    language: { findFirst: jest.fn() },
    worldItemData: { create: jest.fn(), upsert: jest.fn(), findUnique: jest.fn() },
    avatarItemData: { create: jest.fn(), upsert: jest.fn() },
    marketplaceContent: { update: jest.fn(), findFirst: jest.fn() },
    marketplaceContentVersion: { findFirst: jest.fn(), create: jest.fn() },
    marketplaceReviewComment: { create: jest.fn() },
  };

  const prisma = {
    marketplaceContent: { findUnique: jest.fn() },
    marketplaceSettings: { upsert: jest.fn() },
    $transaction: jest.fn((callback: (client: typeof tx) => unknown) => callback(tx)),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation((callback: (client: typeof tx) => unknown) =>
      callback(tx),
    );
    tx.item.create.mockResolvedValue({ id: 'item-tv' });
    tx.language.findFirst.mockResolvedValue({ id: 'lang-es' });
    tx.marketplaceContentVersion.findFirst.mockResolvedValue(null);
    tx.marketplaceContent.update.mockImplementation(({ data }: any) => ({
      id: 'content-1',
      status: data.status,
      title: 'TV',
      description: null,
      priceCoins: 500,
      payload: TV_PAYLOAD,
    }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [MarketplaceService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<MarketplaceService>(MarketplaceService);
  });

  /** Dispara la publicación vía reviewContent, la ruta real del admin. */
  async function publish(content: Record<string, any>) {
    prisma.marketplaceContent.findUnique.mockResolvedValue(content);
    await service.reviewContent({ userId: 'admin-1' }, 'content-1', 'PUBLISH');
  }

  const baseContent = {
    id: 'content-1',
    creatorId: 'creator-1',
    type: 'WORLD_ITEM',
    status: 'APPROVED',
    title: 'TV',
    description: 'Una tele',
    category: 'electronics',
    tags: ['tv'],
    priceCoins: 500,
    spriteUrl: 'https://cdn/tv.png',
    previewUrl: 'https://cdn/tv-preview.png',
    payload: TV_PAYLOAD,
    publishedItemId: null,
    publishedAt: null,
    retiredAt: null,
    metadata: null,
  };

  describe('primera publicación', () => {
    it('crea WorldItemData sin behavior cuando el payload no lo trae', async () => {
      await publish(baseContent);

      expect(tx.worldItemData.create).toHaveBeenCalledTimes(1);
      const data = tx.worldItemData.create.mock.calls[0][0].data;
      expect(data.itemId).toBe('item-tv');
      // Objeto estático: el comportamiento de siempre.
      expect('behavior' in data).toBe(false);
      // Y aun así engineData queda derivado, no nulo.
      expect(data.engineData.frameWidth).toBe(128);
    });

    it('crea WorldItemData con behavior cuando el payload lo trae', async () => {
      await publish({
        ...baseContent,
        payload: {
          ...TV_PAYLOAD,
          worldData: { ...TV_PAYLOAD.worldData, behavior: TV_BEHAVIOR },
        },
      });

      const data = tx.worldItemData.create.mock.calls[0][0].data;
      expect(data.behavior).toEqual(TV_BEHAVIOR);
    });

    it('rechaza publicar un behavior inválido', async () => {
      await expect(
        publish({
          ...baseContent,
          payload: {
            ...TV_PAYLOAD,
            worldData: {
              ...TV_PAYLOAD.worldData,
              behavior: { version: 1, initialState: 'NO_EXISTE', states: [], animations: [], transitions: [] },
            },
          },
        }),
      ).rejects.toThrow(BadRequestException);

      expect(tx.worldItemData.create).not.toHaveBeenCalled();
    });
  });

  describe('republicación de un item ya publicado (EL BUG)', () => {
    // Fila de partida de cada caso. Se mezcla sobre ESTA, no sobre la
    // constante, para que un test que simula otra fila de partida (ej: un item
    // viejo sin behavior) mida lo que realmente configuró.
    let startingRow: Record<string, any>;

    beforeEach(() => {
      startingRow = { ...CONFIGURED_ROW };
      tx.worldItemData.findUnique.mockImplementation(async () => startingRow);
    });

    /** Republica y devuelve la fila resultante tras aplicar el update. */
    async function republishAndMerge(payload: Record<string, any> = TV_PAYLOAD) {
      await publish({ ...baseContent, payload, publishedItemId: 'item-tv' });

      expect(tx.worldItemData.upsert).toHaveBeenCalledTimes(1);
      const call = tx.worldItemData.upsert.mock.calls[0][0];
      return applyPrismaUpdate(startingRow, call.update);
    }

    it('lee la fila existente antes de escribir', async () => {
      // Sin esta lectura no hay nada que conservar: era la causa del bug.
      await republishAndMerge();
      expect(tx.worldItemData.findUnique).toHaveBeenCalledWith({
        where: { itemId: 'item-tv' },
      });
    });

    it('la fila CONSERVA interactionTypes, isInteractable, spriteOffsets, engineData y behavior', async () => {
      const row = await republishAndMerge();

      expect(row.interactionTypes).toEqual(['TOGGLE']);
      expect(row.isInteractable).toBe(true);
      expect(row.spriteOffsets.NORTH).toEqual({ x: 5, y: -10 });
      expect(row.spriteOffsetSync).toBe('all');
      expect(row.spriteOffsetX).toBe(5);
      expect(row.spriteOffsetY).toBe(-10);
      expect(row.engineData).toBeDefined();
      expect(row.engineData.frameWidth).toBe(128);
      expect(row.behavior).toEqual(TV_BEHAVIOR);
    });

    it('la fila conserva el resto de la config avanzada', async () => {
      const row = await republishAndMerge();

      expect(row.rotatable).toBe(true);
      expect(row.category).toBe('ELECTRONICS');
      expect(row.allowsStacking).toBe(true);
      expect(row.sitX).toBe(3);
      expect(row.sitY).toBe(4);
      expect(row.sitElevation).toBe(2);
      expect(row.teleportTargetRoomId).toBe('room-9');
      expect(row.teleportTargetX).toBe(7);
      expect(row.teleportTargetY).toBe(8);
      expect(row.placementType).toBe('FLOOR');
    });

    it('lo que el creador SÍ cambió se aplica', async () => {
      const row = await republishAndMerge({
        ...TV_PAYLOAD,
        worldData: { ...TV_PAYLOAD.worldData, width: 256, directions: 2 },
      });

      expect(row.width).toBe(256);
      expect(row.directions).toBe(2);
      expect(row.engineData.frameWidth).toBe(128); // 256 / 2 caras
    });

    it('un behavior nuevo en el payload reemplaza al guardado', async () => {
      const replacement = {
        version: 1,
        initialState: 'IDLE',
        states: [{ key: 'IDLE', animation: null }],
        animations: [],
        transitions: [],
      };

      const row = await republishAndMerge({
        ...TV_PAYLOAD,
        worldData: { ...TV_PAYLOAD.worldData, behavior: replacement },
      });

      expect(row.behavior).toMatchObject({ initialState: 'IDLE', transitions: [] });
    });

    it('un item viejo SIN behavior sigue sin behavior tras republicar', async () => {
      // Compatibilidad: republicar una silla no le inventa una máquina de
      // estados ni cambia nada de su render.
      startingRow = {
        ...CONFIGURED_ROW,
        behavior: null,
        interactionTypes: [],
        isInteractable: false,
      };

      const row = await republishAndMerge();

      expect(row.behavior).toBeNull();
      expect(row.interactionTypes).toEqual([]);
      expect(row.isInteractable).toBe(false);
    });

    it('el upsert usa el mismo objeto para update y para create', async () => {
      await republishAndMerge();
      const call = tx.worldItemData.upsert.mock.calls[0][0];

      expect(call.create).toEqual({ itemId: 'item-tv', ...call.update });
    });
  });
  // ═══════════════ atlas de animacion (Fase 8) ═══════════════
  //
  // Un behavior con atlas reales lleva las URLs de los sprites DENTRO del JSON.
  // Publicar y republicar no puede perderlas: si se pierde una, el objeto queda
  // en la sala sin animacion y sin ninguna forma de recuperarla salvo reeditar.
  describe('behavior con atlas de animacion', () => {
    const ATLAS = {
      off: 'https://cdn.test/objects/tv/animations/off/1-a.png',
      turn_on: 'https://cdn.test/objects/tv/animations/turn_on/2-b.png',
      screen_loop: 'https://cdn.test/objects/tv/animations/screen_loop/3-c.png',
      turn_off: 'https://cdn.test/objects/tv/animations/turn_off/4-d.png',
    } as Record<string, string>;

    /** TV_BEHAVIOR con una url de atlas real por animacion. */
    const behaviorWithAtlases = {
      ...TV_BEHAVIOR,
      animations: TV_BEHAVIOR.animations.map((animation) => ({
        ...animation,
        spriteSheetUrl: ATLAS[animation.key],
      })),
    };

    const payloadWithAtlases = {
      ...TV_PAYLOAD,
      worldData: { ...TV_PAYLOAD.worldData, behavior: behaviorWithAtlases },
    };

    it('la primera publicacion guarda todas las urls de atlas', async () => {
      await publish({ ...baseContent, payload: payloadWithAtlases });

      const data = tx.worldItemData.create.mock.calls[0][0].data;
      const urls = data.behavior.animations.map((a: any) => a.spriteSheetUrl);

      expect(urls).toEqual([
        ATLAS.off,
        ATLAS.turn_on,
        ATLAS.screen_loop,
        ATLAS.turn_off,
      ]);
    });

    it('cada animacion conserva SU propio atlas, no el del item', async () => {
      // El atlas es por animacion (uno por PNG generado), no uno global: si se
      // colapsaran todos a `spriteSheetUrl` del item, la TV reproduciria
      // siempre la misma imagen.
      await publish({ ...baseContent, payload: payloadWithAtlases });

      const data = tx.worldItemData.create.mock.calls[0][0].data;
      const urls = new Set(
        data.behavior.animations.map((a: any) => a.spriteSheetUrl),
      );
      expect(urls.size).toBe(4);
      expect(data.spriteSheetUrl).not.toBe(ATLAS.turn_on);
    });

    it('conserva fps, loop, framesCount y directional de cada animacion', async () => {
      await publish({ ...baseContent, payload: payloadWithAtlases });

      const data = tx.worldItemData.create.mock.calls[0][0].data;
      const turnOn = data.behavior.animations.find((a: any) => a.key === 'turn_on');

      expect(turnOn).toMatchObject({
        fps: 12,
        loop: false,
        framesCount: 5,
        directional: true,
        row: 4,
        startCol: 0,
      });
    });

    it('republicar NO pierde las urls de atlas', async () => {
      // El editor del creador vuelve a mandar el behavior completo; el mapeo
      // tiene que escribirlo tal cual.
      tx.worldItemData.findUnique.mockResolvedValue({
        ...CONFIGURED_ROW,
        behavior: behaviorWithAtlases,
      });

      await publish({
        ...baseContent,
        payload: payloadWithAtlases,
        publishedItemId: 'item-tv',
      });

      const update = tx.worldItemData.upsert.mock.calls[0][0].update;
      const urls = update.behavior.animations.map((a: any) => a.spriteSheetUrl);
      expect(urls).toEqual([
        ATLAS.off,
        ATLAS.turn_on,
        ATLAS.screen_loop,
        ATLAS.turn_off,
      ]);
    });

    it('reemplazar el atlas de una animacion se persiste', async () => {
      const replaced = {
        ...behaviorWithAtlases,
        animations: behaviorWithAtlases.animations.map((animation) =>
          animation.key === 'turn_on'
            ? { ...animation, spriteSheetUrl: 'https://cdn.test/nuevo.png' }
            : animation,
        ),
      };

      tx.worldItemData.findUnique.mockResolvedValue({
        ...CONFIGURED_ROW,
        behavior: behaviorWithAtlases,
      });

      await publish({
        ...baseContent,
        payload: {
          ...TV_PAYLOAD,
          worldData: { ...TV_PAYLOAD.worldData, behavior: replaced },
        },
        publishedItemId: 'item-tv',
      });

      const update = tx.worldItemData.upsert.mock.calls[0][0].update;
      const turnOn = update.behavior.animations.find((a: any) => a.key === 'turn_on');
      expect(turnOn.spriteSheetUrl).toBe('https://cdn.test/nuevo.png');
    });

    it('un behavior con atlas y campos avanzados sobrevive a republicar entero', async () => {
      // La prueba de regresion completa del bug historico, ahora incluyendo las
      // urls de los sprites.
      tx.worldItemData.findUnique.mockResolvedValue({
        ...CONFIGURED_ROW,
        behavior: behaviorWithAtlases,
      });

      await publish({ ...baseContent, publishedItemId: 'item-tv' });

      const call = tx.worldItemData.upsert.mock.calls[0][0];
      const row = { ...CONFIGURED_ROW, behavior: behaviorWithAtlases, ...call.update };

      expect(row.behavior.animations[1].spriteSheetUrl).toBe(ATLAS.turn_on);
      expect(row.interactionTypes).toEqual(['TOGGLE']);
      expect(row.isInteractable).toBe(true);
      expect(row.engineData.frameWidth).toBe(128);
      expect(row.spriteOffsets.NORTH).toEqual({ x: 5, y: -10 });
      expect(row.sitX).toBe(3);
      expect(row.allowsStacking).toBe(true);
    });
  });
});
