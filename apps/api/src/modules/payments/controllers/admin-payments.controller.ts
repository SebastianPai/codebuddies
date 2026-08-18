import { Controller, Get, NotFoundException, Param, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../../identity/decorators/roles.decorator';
import { JwtAuthGuard } from '../../identity/guards/jwt.guard';
import { RolesGuard } from '../../identity/guards/roles.guard';
import { CertificateOrdersRepository } from '../repositories/certificate-orders.repository';
import { ListCertificateOrdersDto } from '../dto/list-certificate-orders.dto';

// "Pagos" en el admin = CertificateOrder hoy, que es el único Payment/Order
// real que existe (ver auditoría de schema) -- CoinPurchase vive en su
// propio módulo/controller (AdminCoinsController) porque es un producto
// distinto, no porque se haya duplicado el concepto de "pago".
@Controller('admin/payments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminPaymentsController {
  constructor(
    private readonly certificateOrdersRepository: CertificateOrdersRepository,
  ) {}

  @Get('certificate-orders')
  listCertificateOrders(@Query() query: ListCertificateOrdersDto) {
    return this.certificateOrdersRepository.listForAdmin(query.page, query.limit, {
      status: query.status,
      userId: query.userId,
    });
  }

  @Get('certificate-orders/:id')
  async getCertificateOrder(@Param('id') id: string) {
    const order = await this.certificateOrdersRepository.findById(id);
    if (!order) throw new NotFoundException('Certificate order not found');
    return order;
  }
}
