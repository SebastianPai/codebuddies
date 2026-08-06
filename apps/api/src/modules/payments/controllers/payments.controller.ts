import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../identity/guards/jwt.guard';
import { PaymentsService } from '../services/payments.service';
import { PurchaseCertificateDto } from '../dto/purchase-certificate.dto';
import type { AuthenticatedRequest } from '../../../common/types/authenticated-request.type';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('certificate-orders/:id')
  @UseGuards(JwtAuthGuard)
  getCertificateOrder(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.paymentsService.getUserOrder(id, req.user.userId);
  }

  @Post('certificate-orders')
  @UseGuards(JwtAuthGuard)
  purchaseCertificate(
    @Req() req: AuthenticatedRequest,
    @Body() dto: PurchaseCertificateDto,
  ) {
    return this.paymentsService.purchaseCertificate(req.user.userId, dto);
  }
}
