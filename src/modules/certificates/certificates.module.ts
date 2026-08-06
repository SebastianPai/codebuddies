import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AdminModule } from '../admin/admin.module';
import { CertificatesAdminController } from './controllers/certificates-admin.controller';
import { CertificatesController } from './controllers/certificates.controller';
import { CertificateAccessRepository } from './repositories/certificate-access.repository';
import { CertificatesRepository } from './repositories/certificates.repository';
import { CertificateEligibilityService } from './services/certificate-eligibility.service';
import { CertificateStatsService } from './services/certificate-stats.service';
import { CertificatesService } from './services/certificates.service';

@Module({
  imports: [PrismaModule, NotificationsModule, AdminModule],
  controllers: [CertificatesController, CertificatesAdminController],
  providers: [
    CertificatesService,
    CertificateEligibilityService,
    CertificateStatsService,
    CertificatesRepository,
    CertificateAccessRepository,
  ],
  exports: [
    CertificatesService,
    CertificateEligibilityService,
    CertificatesRepository,
    CertificateAccessRepository,
  ],
})
export class CertificatesModule {}
