import { Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../identity/guards/jwt.guard';
import { CertificatesService } from '../services/certificates.service';

@Controller('certificates')
export class CertificatesController {
  constructor(private readonly certificatesService: CertificatesService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  listMine(@Req() req) {
    return this.certificatesService.listForUser(req.user.userId);
  }

  @Get('course/:courseId/status')
  @UseGuards(JwtAuthGuard)
  getCourseStatus(@Param('courseId') courseId: string, @Req() req) {
    return this.certificatesService.getCourseStatus(req.user.userId, courseId);
  }

  @Post('course/:courseId/issue')
  @UseGuards(JwtAuthGuard)
  issueCertificate(@Param('courseId') courseId: string, @Req() req) {
    return this.certificatesService.issueCertificate(req.user.userId, courseId);
  }

  @Get('verify/:verificationCode')
  verifyPublicCertificate(@Param('verificationCode') verificationCode: string) {
    return this.certificatesService.verifyPublicCertificate(verificationCode);
  }
}
