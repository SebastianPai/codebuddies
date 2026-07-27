import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { BadgesController } from './badges.controller';
import { AdminBadgesController } from './admin-badges.controller';
import { BadgesService } from './badges.service';

@Module({
  imports: [PrismaModule],
  controllers: [BadgesController, AdminBadgesController],
  providers: [BadgesService],
  exports: [BadgesService],
})
export class BadgesModule {}
