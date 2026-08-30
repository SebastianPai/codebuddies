import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

type SpeciesInput = {
  key?: string;
  name?: string;
  spriteSheetUrl?: string | null;
  previewUrl?: string | null;
  frameWidth?: number;
  frameHeight?: number;
  framesCount?: number;
  directions?: number;
  enabled?: boolean;
  sortOrder?: number;
};

const clampFaces = (n: unknown) => {
  const v = Math.trunc(Number(n));
  return v === 2 || v === 4 ? v : 1;
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
        directions: clampFaces(data.directions),
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
        frameWidth: payload.frameWidth ?? 64,
        frameHeight: payload.frameHeight ?? 64,
        framesCount: payload.framesCount ?? 1,
        directions: payload.directions ?? 1,
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
