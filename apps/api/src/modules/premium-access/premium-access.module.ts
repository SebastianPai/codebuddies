import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { PremiumAccessService } from './premium-access.service';

@Module({
  imports: [PrismaModule],
  providers: [PremiumAccessService],
  exports: [PremiumAccessService],
})
export class PremiumAccessModule {}
