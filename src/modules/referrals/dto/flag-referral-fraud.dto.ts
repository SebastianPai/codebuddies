export class FlagReferralFraudDto {
  reasonCode!: string;
  notes?: string | null;
  riskScore?: number | null;
  actionTaken?: string | null;
  evidence?: Record<string, unknown> | null;
}
