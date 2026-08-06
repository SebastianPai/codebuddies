import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  ThemeAssetAnimationDirection,
  ThemeAssetIconMode,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const MAX_VARIANTS_PER_SLOT = 5;

// Slots conocidos por el código — agregar uno acá + consumirlo en el
// frontend (Navbar/RoomList/etc.) es todo lo que hace falta para sumar una
// nueva imagen administrable, sin migraciones nuevas.
const SLOT_REGISTRY: { key: string; label: string; category: string }[] = [
  { key: 'LOGO', label: 'Logo principal', category: 'Marca' },
  { key: 'ROOM_DOOR', label: 'Puerta de Salas', category: 'Juego' },
];

export type ResolvedThemeAsset = {
  imageUrl: string;
  mode: ThemeAssetIconMode;
  frameCount: number;
  direction: ThemeAssetAnimationDirection;
  frameRate: number;
};

type UpsertVariantInput = {
  name?: string;
  imageUrl?: string;
  mode?: ThemeAssetIconMode;
  frameCount?: number;
  direction?: ThemeAssetAnimationDirection;
  frameRate?: number;
  order?: number;
};

@Injectable()
export class ThemeAssetsService {
  constructor(private readonly prisma: PrismaService) {}

  // Idempotente: crea los slots que falten sin tocar los que ya existen (y
  // sus variantes). Se llama antes de cualquier lectura/escritura del admin
  // para que el panel siempre muestre todos los slots conocidos.
  private async ensureSlotsSeeded() {
    await Promise.all(
      SLOT_REGISTRY.map((slot) =>
        this.prisma.themeAssetSlot.upsert({
          where: { key: slot.key },
          update: {},
          create: slot,
        }),
      ),
    );
  }

  // Público — { LOGO: {...} | null, ROOM_DOOR: {...} | null }. null significa
  // "sin variante activa, el frontend usa su imagen hardcodeada por defecto".
  async getResolved(): Promise<Record<string, ResolvedThemeAsset | null>> {
    const slots = await this.prisma.themeAssetSlot.findMany({
      include: { variants: { where: { isActive: true }, take: 1 } },
    });

    const result: Record<string, ResolvedThemeAsset | null> = {};
    for (const slot of slots) {
      const active = slot.variants[0];
      result[slot.key] = active
        ? {
            imageUrl: active.imageUrl,
            mode: active.mode,
            frameCount: active.frameCount,
            direction: active.direction,
            frameRate: active.frameRate,
          }
        : null;
    }
    return result;
  }

  // ---- admin ----

  async adminListSlots() {
    await this.ensureSlotsSeeded();

    return this.prisma.themeAssetSlot.findMany({
      orderBy: { key: 'asc' },
      include: { variants: { orderBy: { order: 'asc' } } },
    });
  }

  async adminCreateVariant(slotKey: string, input: UpsertVariantInput) {
    const slot = await this.prisma.themeAssetSlot.findUnique({
      where: { key: slotKey },
      include: { variants: true },
    });
    if (!slot) throw new NotFoundException('Slot no encontrado');

    if (slot.variants.length >= MAX_VARIANTS_PER_SLOT) {
      throw new BadRequestException(`Cada imagen admite como máximo ${MAX_VARIANTS_PER_SLOT} variantes.`);
    }
    if (!input.imageUrl) {
      throw new BadRequestException('imageUrl es requerido');
    }

    const name = input.name?.trim() || `Variante ${slot.variants.length + 1}`;
    if (slot.variants.some((variant) => variant.name === name)) {
      throw new BadRequestException('Ya existe una variante con ese nombre en este slot.');
    }

    // La primera variante de un slot se activa sola — si no, subir la
    // primera imagen "no hace nada" a la vista y confunde. Desde la segunda
    // en adelante queda en manos del admin (para poder preparar, por
    // ejemplo, la imagen de Navidad con anticipación sin reemplazar la que
    // ya está activa).
    const isFirstVariant = slot.variants.length === 0;

    await this.prisma.themeAssetVariant.create({
      data: {
        slotId: slot.id,
        name,
        imageUrl: input.imageUrl,
        isActive: isFirstVariant,
        mode: input.mode ?? ThemeAssetIconMode.STATIC,
        frameCount: input.frameCount ?? 6,
        direction: input.direction ?? ThemeAssetAnimationDirection.PINGPONG,
        frameRate: input.frameRate ?? 10,
        order: slot.variants.length,
      },
    });

    return this.adminListSlots();
  }

  async adminUpdateVariant(variantId: string, input: UpsertVariantInput) {
    const data = {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
      ...(input.mode !== undefined ? { mode: input.mode } : {}),
      ...(input.frameCount !== undefined ? { frameCount: input.frameCount } : {}),
      ...(input.direction !== undefined ? { direction: input.direction } : {}),
      ...(input.frameRate !== undefined ? { frameRate: input.frameRate } : {}),
    };

    await this.prisma.themeAssetVariant.update({ where: { id: variantId }, data });

    return this.adminListSlots();
  }

  async adminDeleteVariant(variantId: string) {
    await this.prisma.themeAssetVariant.delete({ where: { id: variantId } });

    return this.adminListSlots();
  }

  // variantId null = ninguna variante activa para ese slot (fallback del código).
  async adminSetActive(slotKey: string, variantId: string | null) {
    const slot = await this.prisma.themeAssetSlot.findUnique({
      where: { key: slotKey },
      include: { variants: true },
    });
    if (!slot) throw new NotFoundException('Slot no encontrado');

    if (variantId && !slot.variants.some((variant) => variant.id === variantId)) {
      throw new BadRequestException('Esa variante no pertenece a este slot.');
    }

    await this.prisma.$transaction([
      this.prisma.themeAssetVariant.updateMany({
        where: { slotId: slot.id, isActive: true },
        data: { isActive: false },
      }),
      ...(variantId
        ? [
            this.prisma.themeAssetVariant.update({
              where: { id: variantId },
              data: { isActive: true },
            }),
          ]
        : []),
    ]);

    return this.adminListSlots();
  }
}
