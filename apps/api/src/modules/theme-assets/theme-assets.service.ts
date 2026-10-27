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
//
// Los ICON_* son "iconos por significado", no por pantalla: la misma key se
// consume tanto en apps/web como en apps/game (componente AppIcon de cada
// app), así que cambiar la imagen de ICON_PROFILE la cambia en el navbar de
// la web y en el menú del juego a la vez. El label dice dónde aparece cada
// uno para que el admin sepa qué está tocando.
const SLOT_REGISTRY: { key: string; label: string; category: string }[] = [
  { key: 'LOGO', label: 'Logo principal', category: 'Marca' },
  { key: 'ROOM_DOOR', label: 'Puerta de Salas', category: 'Juego' },

  // Navegación compartida web + juego
  { key: 'ICON_HOME', label: 'Inicio (web + juego)', category: 'Iconos · Navegación' },
  { key: 'ICON_PROFILE', label: 'Perfil (web + juego)', category: 'Iconos · Navegación' },
  { key: 'ICON_FRIENDS', label: 'Amigos (web + juego)', category: 'Iconos · Navegación' },
  { key: 'ICON_MESSAGES', label: 'Mensajes (web + juego)', category: 'Iconos · Navegación' },
  { key: 'ICON_NOTIFICATIONS', label: 'Notificaciones (web + juego)', category: 'Iconos · Navegación' },
  { key: 'ICON_SETTINGS', label: 'Configuración (web + juego)', category: 'Iconos · Navegación' },
  { key: 'ICON_LOGOUT', label: 'Salir / Cerrar sesión (web + juego)', category: 'Iconos · Navegación' },
  { key: 'ICON_COURSES', label: 'Cursos (web)', category: 'Iconos · Navegación' },
  { key: 'ICON_RANKINGS', label: 'Rankings (web)', category: 'Iconos · Navegación' },
  { key: 'ICON_PLAY', label: 'Jugar / Entrar al juego (web)', category: 'Iconos · Navegación' },

  // Gamificación / recompensas
  { key: 'ICON_DAILY_QUEST', label: 'Misión diaria (web)', category: 'Iconos · Recompensas' },
  { key: 'ICON_MISSIONS', label: 'Misiones (web)', category: 'Iconos · Recompensas' },
  { key: 'ICON_REWARDS', label: 'Centro de recompensas (web)', category: 'Iconos · Recompensas' },
  { key: 'ICON_REWARD_POPUP', label: 'Aviso de recompensa ganada (web)', category: 'Iconos · Recompensas' },
  { key: 'ICON_ACHIEVEMENTS', label: 'Logros / Nivel (web)', category: 'Iconos · Recompensas' },
  { key: 'ICON_BADGES', label: 'Insignias / Certificados (web)', category: 'Iconos · Recompensas' },
  { key: 'ICON_BATTLE_PASS', label: 'Pase de batalla (web)', category: 'Iconos · Recompensas' },
  { key: 'ICON_XP', label: 'XP (web)', category: 'Iconos · Recompensas' },
  { key: 'ICON_STREAK', label: 'Racha (web)', category: 'Iconos · Recompensas' },

  // Menú lateral del juego
  { key: 'ICON_PC', label: 'PC (juego)', category: 'Iconos · Juego' },
  { key: 'ICON_WARDROBE', label: 'Vestuario (juego)', category: 'Iconos · Juego' },
  { key: 'ICON_TOURNAMENTS', label: 'Torneos (juego)', category: 'Iconos · Juego' },
  { key: 'ICON_SHOP', label: 'Tienda (juego)', category: 'Iconos · Juego' },
  { key: 'ICON_PET', label: 'Mascota (juego)', category: 'Iconos · Juego' },
  { key: 'ICON_BUILD', label: 'Construir (juego)', category: 'Iconos · Juego' },
  { key: 'ICON_MARKETPLACE', label: 'Marketplace (juego)', category: 'Iconos · Juego' },
  { key: 'ICON_CHAT_THEME', label: 'Tema del chat (juego)', category: 'Iconos · Juego' },
  { key: 'ICON_SEND', label: 'Enviar mensaje (juego)', category: 'Iconos · Juego' },

  // Reacciones rápidas del chat del juego — se ven en el botón y también
  // arriba de la cabeza del jugador cuando alguien la manda.
  { key: 'REACTION_WAVE', label: 'Reacción: saludar 👋', category: 'Reacciones del chat' },
  { key: 'REACTION_LAUGH', label: 'Reacción: reír 😂', category: 'Reacciones del chat' },
  { key: 'REACTION_FIRE', label: 'Reacción: fuego 🔥', category: 'Reacciones del chat' },
  { key: 'REACTION_BYE', label: 'Reacción: paz ✌️', category: 'Reacciones del chat' },
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

    const slots = await this.prisma.themeAssetSlot.findMany({
      orderBy: { key: 'asc' },
      include: { variants: { orderBy: { order: 'asc' } } },
    });

    // Mismo orden que SLOT_REGISTRY (agrupa las categorías como están
    // pensadas); slots viejos que ya no están en el registro van al final.
    const position = (key: string) => {
      const index = SLOT_REGISTRY.findIndex((slot) => slot.key === key);
      return index === -1 ? Number.MAX_SAFE_INTEGER : index;
    };
    return slots.sort((a, b) => position(a.key) - position(b.key));
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
