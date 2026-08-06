import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Roles } from '../identity/decorators/roles.decorator';
import { JwtAuthGuard } from '../identity/guards/jwt.guard';
import { RolesGuard } from '../identity/guards/roles.guard';
import type { AuthenticatedRequest } from '../../common/types/authenticated-request.type';
import { UpsertPricingPlanDto } from './dto/upsert-pricing-plan.dto';
import { PricingService } from './pricing.service';

@Controller('admin/pricing')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class PricingAdminController {
  constructor(private readonly pricingService: PricingService) {}

  @Get('plans')
  listPlans() {
    return this.pricingService.listAllPlans();
  }

  @Get('plans/:id')
  getPlan(@Param('id') id: string) {
    return this.pricingService.getPlan(id);
  }

  @Post('plans')
  createPlan(@Body() dto: UpsertPricingPlanDto) {
    return this.pricingService.createPlan(dto);
  }

  @Patch('plans/:id')
  updatePlan(@Param('id') id: string, @Body() dto: UpsertPricingPlanDto) {
    return this.pricingService.updatePlan(id, dto);
  }

  @Delete('plans/:id')
  deletePlan(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.pricingService.deletePlan(id, req.user.userId);
  }
}
