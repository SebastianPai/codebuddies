import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AdminModule } from '../admin/admin.module';
import { PricingAdminController } from './pricing-admin.controller';
import { PricingController } from './pricing.controller';
import { PricingService } from './pricing.service';

@Module({
  imports: [PrismaModule, AdminModule],
  controllers: [PricingController, PricingAdminController],
  providers: [PricingService],
  exports: [PricingService],
})
export class PricingModule {}
