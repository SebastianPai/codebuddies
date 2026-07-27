import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../../identity/decorators/roles.decorator';
import { JwtAuthGuard } from '../../identity/guards/jwt.guard';
import { RolesGuard } from '../../identity/guards/roles.guard';
import { AdminUserActionDto } from '../dto/admin-user-action.dto';
import { CertificateAccessActionDto } from '../dto/certificate-access-action.dto';
import { AdminDashboardService } from '../services/admin-dashboard.service';
import { AdminUsersService } from '../services/admin-users.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(
    private readonly dashboardService: AdminDashboardService,
    private readonly usersService: AdminUsersService,
  ) {}

  @Get('dashboard')
  getDashboard() {
    return this.dashboardService.getDashboard();
  }

  @Get('users')
  listUsers(@Query('q') query?: string) {
    return this.usersService.listUsers(query ?? '');
  }

  @Patch('users/:userId')
  updateUser(@Param('userId') userId: string, @Body() dto: AdminUserActionDto) {
    return this.usersService.updateUser(userId, dto);
  }

  @Get('certificate-access')
  listCertificateAccesses() {
    return this.usersService.listCertificateAccesses();
  }

  @Post('certificate-access')
  updateCertificateAccess(@Body() dto: CertificateAccessActionDto) {
    return this.usersService.updateCertificateAccess(dto);
  }
}
