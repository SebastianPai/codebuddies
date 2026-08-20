import { BattlePassTrack, GamificationRewardType } from '@prisma/client';

export class UpsertBattlePassTierDto {
  level?: number;
  track?: BattlePassTrack;
  rewardType?: GamificationRewardType;
  amount?: number | null;
  itemId?: string | null;
  label?: string;
  sortOrder?: number;
}
