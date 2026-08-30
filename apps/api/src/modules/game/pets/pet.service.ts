import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Pet } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  DEFAULT_PET_SPECIES,
  PET_CURE_HEALTH,
  PetAction,
  normalizePetSpecies,
} from './pet.constants';
import {
  PetCooldownError,
  actionCooldownRemaining,
  applyAction,
  applyDecay,
  deriveMood,
} from './pet.logic';

// MVP: una mascota por usuario. El sprite/look lo resuelve el cliente a
// partir de `species`. El decaimiento de stats se calcula perezosamente en
// cada lectura (persistDecay) — no hay job de fondo.
@Injectable()
export class PetService {
  constructor(private prisma: PrismaService) {}

  private serialize(pet: Pet) {
    const { userId: _userId, ...safe } = pet;
    return {
      ...safe,
      mood: deriveMood(pet),
      cooldowns: {
        feed: actionCooldownRemaining(pet, 'feed'),
        water: actionCooldownRemaining(pet, 'water'),
        play: actionCooldownRemaining(pet, 'play'),
      },
    };
  }

  /** Aplica el decaimiento acumulado y lo persiste si hubo cambio. */
  private async persistDecay(pet: Pet): Promise<Pet> {
    const decayed = applyDecay(pet);
    if (decayed === pet) return pet;
    return this.prisma.pet.update({
      where: { id: pet.id },
      data: {
        hunger: decayed.hunger,
        thirst: decayed.thirst,
        happiness: decayed.happiness,
        energy: decayed.energy,
        health: decayed.health,
        sick: decayed.sick,
        lastTickAt: decayed.lastTickAt,
      },
    });
  }

  private async loadOwnedPet(userId: string): Promise<Pet> {
    const pet = await this.prisma.pet.findFirst({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
    if (!pet) throw new NotFoundException('No tenés una mascota');
    return pet;
  }

  async getMyPet(userId: string) {
    const pet = await this.prisma.pet.findFirst({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
    if (!pet) return null;
    return this.serialize(await this.persistDecay(pet));
  }

  async adopt(
    userId: string,
    input: { species?: string; name?: string; itemId?: string },
  ) {
    const existing = await this.prisma.pet.findFirst({ where: { userId } });
    if (existing) {
      throw new BadRequestException('Ya tenés una mascota');
    }

    let itemId: string | null = null;
    if (input.itemId) {
      // El item debe existir y estar en el inventario del usuario.
      const owned = await this.prisma.userItem.findUnique({
        where: { userId_itemId: { userId, itemId: input.itemId } },
      });
      if (!owned) {
        throw new BadRequestException('No tenés ese item en el inventario');
      }
      itemId = input.itemId;
    }

    const pet = await this.prisma.pet.create({
      data: {
        userId,
        itemId,
        species: normalizePetSpecies(input.species ?? DEFAULT_PET_SPECIES),
        name: (input.name ?? '').trim().slice(0, 24),
      },
    });
    return this.serialize(pet);
  }

  async rename(userId: string, name: string) {
    const pet = await this.loadOwnedPet(userId);
    const updated = await this.prisma.pet.update({
      where: { id: pet.id },
      data: { name: (name ?? '').trim().slice(0, 24) },
    });
    return this.serialize(await this.persistDecay(updated));
  }

  async doAction(userId: string, action: PetAction) {
    const pet = await this.persistDecay(await this.loadOwnedPet(userId));

    let next;
    try {
      next = applyAction(pet, action);
    } catch (err) {
      if (err instanceof PetCooldownError) {
        throw new BadRequestException(
          `Esperá ${Math.ceil(err.remainingMs / 1000)}s antes de repetir`,
        );
      }
      throw err;
    }

    const updated = await this.prisma.pet.update({
      where: { id: pet.id },
      data: {
        hunger: next.hunger,
        thirst: next.thirst,
        happiness: next.happiness,
        energy: next.energy,
        lastFedAt: next.lastFedAt as Date,
        lastWateredAt: next.lastWateredAt as Date,
        lastPlayedAt: next.lastPlayedAt as Date,
      },
    });
    return this.serialize(updated);
  }

  async cure(userId: string) {
    const pet = await this.persistDecay(await this.loadOwnedPet(userId));
    if (!pet.sick) {
      throw new BadRequestException('Tu mascota no está enferma');
    }
    const updated = await this.prisma.pet.update({
      where: { id: pet.id },
      data: { sick: false, health: PET_CURE_HEALTH },
    });
    return this.serialize(updated);
  }

  /** Sacar/guardar la mascota de una sala. `roomId = null` = guardarla. */
  async setActiveRoom(userId: string, roomId: string | null) {
    const pet = await this.loadOwnedPet(userId);
    const updated = await this.prisma.pet.update({
      where: { id: pet.id },
      data: { activeRoomId: roomId },
    });
    return this.serialize(await this.persistDecay(updated));
  }

  async release(userId: string) {
    const pet = await this.loadOwnedPet(userId);
    await this.prisma.pet.delete({ where: { id: pet.id } });
    return { released: true };
  }
}
