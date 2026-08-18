import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../../identity/decorators/roles.decorator';
import { JwtAuthGuard } from '../../identity/guards/jwt.guard';
import { RolesGuard } from '../../identity/guards/roles.guard';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';
import { ListUsersQueryDto } from '../dto/list-users.dto';
import { AdminUserActionDto } from '../dto/admin-user-action.dto';
import { CertificateAccessActionDto } from '../dto/certificate-access-action.dto';
import { AdminDashboardService } from '../services/admin-dashboard.service';
import { AdminUsersService } from '../services/admin-users.service';
import { AdminAuditService } from '../services/admin-audit.service';
import { AdminAnalyticsService } from '../services/admin-analytics.service';
import type { AuthenticatedRequest } from '../../../common/types/authenticated-request.type';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(
    private readonly dashboardService: AdminDashboardService,
    private readonly usersService: AdminUsersService,
    private readonly auditService: AdminAuditService,
    private readonly analyticsService: AdminAnalyticsService,
  ) {}

  @Get('dashboard')
  getDashboard() {
    return this.dashboardService.getDashboard();
  }

  @Get('analytics/student-experience')
  getStudentExperience() {
    return this.analyticsService.getStudentExperience();
  }

  @Get('users')
  listUsers(@Query() query: ListUsersQueryDto) {
    return this.usersService.listUsers(query.q ?? '', query.page, query.limit, {
      role: query.role,
      premiumOnly: query.premiumOnly,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
  }

  @Get('users/:userId')
  getUserDetail(@Param('userId') userId: string) {
    return this.usersService.getUserDetail(userId);
  }

  @Patch('users/:userId')
  updateUser(
    @Req() req: AuthenticatedRequest,
    @Param('userId') userId: string,
    @Body() dto: AdminUserActionDto,
  ) {
    return this.usersService.updateUser(req.user.userId, userId, dto);
  }

  @Get('certificate-access')
  listCertificateAccesses(@Query() pagination: PaginationQueryDto) {
    return this.usersService.listCertificateAccesses(pagination.page, pagination.limit);
  }

  @Post('certificate-access')
  updateCertificateAccess(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CertificateAccessActionDto,
  ) {
    return this.usersService.updateCertificateAccess(req.user.userId, dto);
  }

  @Get('audit-log')
  listAuditLog(@Query() pagination: PaginationQueryDto) {
    return this.auditService.listRecent(pagination.page, pagination.limit);
  }
}
