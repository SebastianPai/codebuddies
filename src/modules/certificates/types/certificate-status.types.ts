import { CertificateAccessType } from '@prisma/client';

export interface CertificateStatusResponse {
  completed: boolean;
  eligible: boolean;
  hasCertificate: boolean;
  accessType: CertificateAccessType | null;
  certificateId: string | null;
}

export interface CertificateEligibilityResult extends CertificateStatusResponse {
  academyId: string | null;
}
