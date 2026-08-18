import { Module } from '@nestjs/common';
import { IdentityService } from './identity.service';
import { IdentityController } from './identity.controller';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../../prisma/prisma.module';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './guards/jwt.guard';
import { RolesGuard } from './guards/roles.guard';
import { GamificationModule } from '../gamification/gamification.module';
import { EmailModule } from '../email/email.module';
import { PremiumAccessModule } from '../premium-access/premium-access.module';
import { JWT_SECRET } from '../../config/env';

@Module({
  imports: [
    PrismaModule,
    GamificationModule,
    EmailModule,
    PremiumAccessModule,
    JwtModule.register({
      secret: JWT_SECRET,
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [IdentityController],
  providers: [IdentityService, JwtStrategy, JwtAuthGuard, RolesGuard],
  exports: [JwtModule, JwtStrategy, JwtAuthGuard, RolesGuard],
})
export class IdentityModule {}
