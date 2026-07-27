import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../identity/guards/jwt.guard';
import { PaymentsService } from '../services/payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('certificate-orders/:id')
  @UseGuards(JwtAuthGuard)
  getCertificateOrder(@Param('id') id: string, @Req() req) {
    return this.paymentsService.getUserOrder(id, req.user.userId);
  }
}
