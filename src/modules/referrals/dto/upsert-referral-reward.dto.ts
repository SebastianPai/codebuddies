import { ReferralRewardScope, ReferralRewardType } from '@prisma/client';

export class UpsertReferralRewardDto {
  name!: string;
  description?: string | null;
  scope?: ReferralRewardScope;
  rewardType!: ReferralRewardType;
  threshold?: number | null;
  rankFrom?: number | null;
  rankTo?: number | null;
  amount?: number | null;
  itemId?: string | null;
  payload?: Record<string, unknown> | null;
  active?: boolean;
  sortOrder?: number;
  seasonId?: string | null;
}
