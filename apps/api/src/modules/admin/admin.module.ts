import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AdminController } from './controllers/admin.controller';
import { AdminDashboardService } from './services/admin-dashboard.service';
import { AdminUsersService } from './services/admin-users.service';
import { AdminAuditService } from './services/admin-audit.service';
import { AdminAnalyticsService } from './services/admin-analytics.service';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [AdminController],
  providers: [
    AdminDashboardService,
    AdminUsersService,
    AdminAuditService,
    AdminAnalyticsService,
  ],
  exports: [AdminAuditService],
})
export class AdminModule {}
