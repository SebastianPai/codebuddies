import { Controller, Get, UseGuards } from '@nestjs/common';
import { Roles } from '../../identity/decorators/roles.decorator';
import { JwtAuthGuard } from '../../identity/guards/jwt.guard';
import { RolesGuard } from '../../identity/guards/roles.guard';
import { CertificateStatsService } from '../services/certificate-stats.service';

@Controller('admin/certificates')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class CertificatesAdminController {
  constructor(
    private readonly certificateStatsService: CertificateStatsService,
  ) {}

  @Get('stats')
  getStats() {
    return this.certificateStatsService.getAdminStats();
  }
}
