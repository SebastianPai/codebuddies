export class UpsertReferralSeasonDto {
  name!: string;
  periodKey!: string;
  startsAt!: string;
  endsAt!: string;
  metadata?: Record<string, unknown> | null;
}
