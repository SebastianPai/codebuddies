import { BattlePassSeasonStatus } from '@prisma/client';

export class UpsertBattlePassSeasonDto {
  name?: string;
  description?: string | null;
  seasonNumber?: number;
  status?: BattlePassSeasonStatus;
  startsAt?: string;
  endsAt?: string;
  totalLevels?: number;
  xpPerLevel?: number;
}
