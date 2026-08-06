export class UpdateReferralSettingsDto {
  enabled?: boolean;
  baseUrl?: string;
  shareMessage?: string | null;
  codePrefix?: string | null;
  codeLength?: number;
  requiredLevel?: number;
  minAccountAgeDays?: number;
  requireVerifiedEmail?: boolean;
  requireCompletedCourse?: boolean;
  requiredCourseId?: string | null;
  maxReferralsPerDay?: number;
  rankingEnabled?: boolean;
  fraudAutoRevoke?: boolean;
  allowManualSeasonManagement?: boolean;
}
