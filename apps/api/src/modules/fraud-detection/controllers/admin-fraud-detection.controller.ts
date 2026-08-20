import { Controller, Get, UseGuards } from '@nestjs/common';
import { Roles } from '../../identity/decorators/roles.decorator';
import { JwtAuthGuard } from '../../identity/guards/jwt.guard';
import { RolesGuard } from '../../identity/guards/roles.guard';
import { FraudDetectionService } from '../fraud-detection.service';

@Controller('admin/fraud-alerts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminFraudDetectionController {
  constructor(private readonly fraudDetectionService: FraudDetectionService) {}

  @Get()
  getAlerts() {
    return this.fraudDetectionService.getAlerts();
  }
}
