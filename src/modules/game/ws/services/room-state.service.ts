import { Injectable } from '@nestjs/common';
import { ParsedAvatar } from '../dto/avatar.dto';

@Injectable()
export class AvatarParserService {
  parseAvatar(dbAvatar: any): ParsedAvatar {
    const allSlotNames = [
      'BODY',
      'HEAD',
      'HAIR',
      'EYES',
      'SHIRT',
      'LEGS',
      'SHOES',
      'LEFT_ARM',
      'RIGHT_ARM',
      'ACCESSORY_HEAD',
      'ACCESSORY_FACE',
      'ACCESSORY_BACK',
      'ACCESSORY_LEFT',
      'ACCESSORY_RIGHT',
    ] as const;

    const slotMap = new Map<string, any>();

    const rawSlots = Array.isArray(dbAvatar?.slots) ? dbAvatar.slots : [];

    rawSlots.forEach((slotEntry: any) => {
      const normalized = slotEntry?.slot?.toUpperCase?.();

      if (normalized) {
        slotMap.set(normalized, slotEntry);
      }
    });

    return {
      skinColor: Number(dbAvatar?.skinColor) || 0xffffff,

      slots: allSlotNames.map((slotName) => {
        const entry = slotMap.get(slotName) || {
          itemId: null,
          item: null,
          color: null,
        };

        const item = entry.item;

        return {
          slot: slotName,
          itemId: entry.itemId ?? null,
          imageUrl: item?.imageUrl ?? null,
          layer: item?.layer ?? 0,
          color: entry.color ?? null,
          colorable: item?.colorable ?? false,

          sprites: Array.isArray(item?.sprites)
            ? item.sprites.map((s: any) => ({
                imageUrl: s.imageUrl || '',
                frameWidth: Number(s.frameWidth) || 32,
                frameHeight: Number(s.frameHeight) || 32,
                framesCount: Number(s.framesCount) || 16,
                rows: 4,
                animation: {
                  speed: Number(s.animation?.speed) || 6,
                  loop: s.animation?.loop ?? true,
                },
              }))
            : [],
        };
      }),
    };
  }
}
