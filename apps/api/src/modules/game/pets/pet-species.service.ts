import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  normalizeAnimations,
  normalizeDirections,
} from './companion-animations';

type SpeciesInput = {
  key?: string;
  name?: string;
  spriteSheetUrl?: string | null;
  previewUrl?: string | null;
  frameWidth?: number;
  frameHeight?: number;
  framesCount?: number;
  directions?: number;
  animations?: unknown;
  coinsPrice?: number | null;
  gemsPrice?: number | null;
  shopVisible?: boolean;
  enabled?: boolean;
  sortOrder?: number;
};

const nullableInt = (v: unknown): number | null => {
  if (v == null || v === '') return null;
  const n = Math.trunc(Number(v));
  return Number.isFinite(n) && n >= 0 ? n : null;
};

const posInt = (n: unknown, fallback: number) => {
  const v = Math.trunc(Number(n));
  return Number.isFinite(v) && v > 0 ? v : fallback;
};

@Injectable()
export class PetSpeciesService {
  constructor(private prisma: PrismaService) {}

  // Para el juego: solo las habilitadas, ordenadas.
  listEnabled() {
    return this.prisma.petSpeciesConfig.findMany({
      where: { enabled: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  listAll() {
    return this.prisma.petSpeciesConfig.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  private normalize(data: SpeciesInput) {
    return {
      ...(data.key !== undefined && {
        key: String(data.key).trim().toLowerCase().slice(0, 32),
      }),
      ...(data.name !== undefined && { name: String(data.name).trim().slice(0, 64) }),
      ...(data.spriteSheetUrl !== undefined && {
        spriteSheetUrl: data.spriteSheetUrl || null,
      }),
      ...(data.previewUrl !== undefined && { previewUrl: data.previewUrl || null }),
      ...(data.frameWidth !== undefined && {
        frameWidth: posInt(data.frameWidth, 64),
      }),
      ...(data.frameHeight !== undefined && {
        frameHeight: posInt(data.frameHeight, 64),
      }),
      ...(data.framesCount !== undefined && {
        framesCount: posInt(data.framesCount, 1),
      }),
      ...(data.directions !== undefined && {
        directions: normalizeDirections(data.directions),
      }),
      ...(data.animations !== undefined && {
        animations: normalizeAnimations(data.animations) as any,
      }),
      ...(data.coinsPrice !== undefined && {
        coinsPrice: nullableInt(data.coinsPrice),
      }),
      ...(data.gemsPrice !== undefined && {
        gemsPrice: nullableInt(data.gemsPrice),
      }),
      ...(data.shopVisible !== undefined && {
        shopVisible: Boolean(data.shopVisible),
      }),
      ...(data.enabled !== undefined && { enabled: Boolean(data.enabled) }),
      ...(data.sortOrder !== undefined && {
        sortOrder: Math.trunc(Number(data.sortOrder)) || 0,
      }),
    };
  }

  async create(data: SpeciesInput) {
    const payload = this.normalize(data);
    return this.prisma.petSpeciesConfig.create({
      data: {
        key: payload.key ?? `species-${Date.now()}`,
        name: payload.name ?? 'Sin nombre',
        spriteSheetUrl: payload.spriteSheetUrl ?? null,
        previewUrl: payload.previewUrl ?? null,
        frameWidth: payload.frameWidth ?? 32,
        frameHeight: payload.frameHeight ?? 32,
        framesCount: payload.framesCount ?? 1,
        directions: payload.directions ?? 4,
        animations: payload.animations ?? [],
        coinsPrice: payload.coinsPrice ?? null,
        gemsPrice: payload.gemsPrice ?? null,
        shopVisible: payload.shopVisible ?? true,
        enabled: payload.enabled ?? true,
        sortOrder: payload.sortOrder ?? 0,
      },
    });
  }

  async update(id: string, data: SpeciesInput) {
    const exists = await this.prisma.petSpeciesConfig.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Especie no encontrada');
    return this.prisma.petSpeciesConfig.update({
      where: { id },
      data: this.normalize(data),
    });
  }

  async remove(id: string) {
    const exists = await this.prisma.petSpeciesConfig.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Especie no encontrada');
    return this.prisma.petSpeciesConfig.delete({ where: { id } });
  }
}
