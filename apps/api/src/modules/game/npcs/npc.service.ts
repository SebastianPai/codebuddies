import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  normalizeAnimations,
  normalizeDirections,
} from '../pets/companion-animations';

type NpcInput = {
  key?: string;
  kind?: string;
  name?: string;
  spriteSheetUrl?: string | null;
  previewUrl?: string | null;
  avatarConfig?: unknown;
  frameWidth?: number;
  frameHeight?: number;
  framesCount?: number;
  directions?: number;
  animations?: unknown;
  greetingLines?: unknown;
  idleLines?: unknown;
  enabled?: boolean;
  sortOrder?: number;
};

const posInt = (n: unknown, fallback: number) => {
  const v = Math.trunc(Number(n));
  return Number.isFinite(v) && v > 0 ? v : fallback;
};
const toLines = (v: unknown): string[] =>
  Array.isArray(v)
    ? v.map((x) => String(x).trim()).filter(Boolean).slice(0, 30)
    : [];

@Injectable()
export class NpcService {
  constructor(private prisma: PrismaService) {}

  listEnabled(kind?: string) {
    return this.prisma.npcConfig.findMany({
      where: { enabled: true, ...(kind ? { kind } : {}) },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  listAll(kind?: string) {
    return this.prisma.npcConfig.findMany({
      where: kind ? { kind } : {},
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  private normalize(data: NpcInput) {
    return {
      ...(data.key !== undefined && {
        key: String(data.key).trim().toLowerCase().slice(0, 32),
      }),
      ...(data.kind !== undefined && {
        kind: String(data.kind || 'BUTLER').trim().toUpperCase().slice(0, 24),
      }),
      ...(data.name !== undefined && { name: String(data.name).trim().slice(0, 64) }),
      ...(data.spriteSheetUrl !== undefined && {
        spriteSheetUrl: data.spriteSheetUrl || null,
      }),
      ...(data.previewUrl !== undefined && { previewUrl: data.previewUrl || null }),
      ...(data.avatarConfig !== undefined && {
        avatarConfig: (data.avatarConfig ?? null) as any,
      }),
      ...(data.frameWidth !== undefined && {
        frameWidth: posInt(data.frameWidth, 64),
      }),
      ...(data.frameHeight !== undefined && {
        frameHeight: posInt(data.frameHeight, 96),
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
      ...(data.greetingLines !== undefined && {
        greetingLines: toLines(data.greetingLines),
      }),
      ...(data.idleLines !== undefined && { idleLines: toLines(data.idleLines) }),
      ...(data.enabled !== undefined && { enabled: Boolean(data.enabled) }),
      ...(data.sortOrder !== undefined && {
        sortOrder: Math.trunc(Number(data.sortOrder)) || 0,
      }),
    };
  }

  create(data: NpcInput) {
    const p = this.normalize(data);
    return this.prisma.npcConfig.create({
      data: {
        key: p.key ?? `npc-${Date.now()}`,
        kind: p.kind ?? 'BUTLER',
        name: p.name ?? 'Sin nombre',
        spriteSheetUrl: p.spriteSheetUrl ?? null,
        previewUrl: p.previewUrl ?? null,
        avatarConfig: p.avatarConfig ?? null,
        frameWidth: p.frameWidth ?? 32,
        frameHeight: p.frameHeight ?? 48,
        framesCount: p.framesCount ?? 1,
        directions: p.directions ?? 4,
        animations: p.animations ?? [],
        greetingLines: p.greetingLines ?? [],
        idleLines: p.idleLines ?? [],
        enabled: p.enabled ?? true,
        sortOrder: p.sortOrder ?? 0,
      },
    });
  }

  async update(id: string, data: NpcInput) {
    const exists = await this.prisma.npcConfig.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('NPC no encontrado');
    return this.prisma.npcConfig.update({ where: { id }, data: this.normalize(data) });
  }

  async remove(id: string) {
    const exists = await this.prisma.npcConfig.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('NPC no encontrado');
    return this.prisma.npcConfig.delete({ where: { id } });
  }
}
