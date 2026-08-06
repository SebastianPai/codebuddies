import { Body, Controller, Get, Param, Patch, Query, Req, UseGuards } from '@nestjs/common';
import { Roles } from '../../identity/decorators/roles.decorator';
import { JwtAuthGuard } from '../../identity/guards/jwt.guard';
import { RolesGuard } from '../../identity/guards/roles.guard';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';
import type { AuthenticatedRequest } from '../../../common/types/authenticated-request.type';
import { CertificateStatsService } from '../services/certificate-stats.service';
import { CertificatesService } from '../services/certificates.service';
import { RevokeCertificateDto } from '../dto/revoke-certificate.dto';

@Controller('admin/certificates')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class CertificatesAdminController {
  constructor(
    private readonly certificateStatsService: CertificateStatsService,
    private readonly certificatesService: CertificatesService,
  ) {}

  @Get('stats')
  getStats() {
    return this.certificateStatsService.getAdminStats();
  }

  @Get()
  list(@Query() pagination: PaginationQueryDto) {
    return this.certificatesService.listAllForAdmin(
      pagination.page,
      pagination.limit,
    );
  }

  @Patch(':id/revoke')
  revoke(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() dto: RevokeCertificateDto) {
    return this.certificatesService.revokeCertificate(id, dto.reason, req.user.userId);
  }

  @Patch(':id/restore')
  restore(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.certificatesService.restoreCertificate(id, req.user.userId);
  }
}
