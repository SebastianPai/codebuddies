import { Module } from '@nestjs/common';
import { AvatarService } from './avatar.service';
import { AvatarController } from './avatar.controller';
import { PrismaModule } from '../../../prisma/prisma.module';
import { PremiumAccessModule } from '../../premium-access/premium-access.module';

@Module({
  imports: [PrismaModule, PremiumAccessModule],
  providers: [AvatarService],
  controllers: [AvatarController],
})
export class AvatarModule {}
