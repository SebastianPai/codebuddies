import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminAuditService } from '../admin/services/admin-audit.service';
import { UpsertPricingPlanDto } from './dto/upsert-pricing-plan.dto';

@Injectable()
export class PricingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adminAuditService: AdminAuditService,
  ) {}

  listActivePlans() {
    return this.prisma.pricingPlan.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  listAllPlans() {
    return this.prisma.pricingPlan.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async getPlan(id: string) {
    const plan = await this.prisma.pricingPlan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException('Plan no encontrado');
    return plan;
  }

  createPlan(dto: UpsertPricingPlanDto) {
    return this.prisma.pricingPlan.create({
      data: {
        key: dto.key,
        priceUsd: dto.priceUsd,
        billingInterval: dto.billingInterval ?? 'NONE',
        featured: dto.featured ?? false,
        active: dto.active ?? true,
        sortOrder: dto.sortOrder ?? 0,
        ctaHref: dto.ctaHref,
        icon: dto.icon ?? 'Sparkles',
        name: dto.name as unknown as Prisma.InputJsonValue,
        ctaLabel: dto.ctaLabel as unknown as Prisma.InputJsonValue,
        features: dto.features as unknown as Prisma.InputJsonValue,
      },
    });
  }

  async updatePlan(id: string, dto: UpsertPricingPlanDto) {
    await this.getPlan(id);
    return this.prisma.pricingPlan.update({
      where: { id },
      data: {
        key: dto.key,
        priceUsd: dto.priceUsd,
        billingInterval: dto.billingInterval ?? 'NONE',
        featured: dto.featured ?? false,
        active: dto.active ?? true,
        sortOrder: dto.sortOrder ?? 0,
        ctaHref: dto.ctaHref,
        icon: dto.icon ?? 'Sparkles',
        name: dto.name as unknown as Prisma.InputJsonValue,
        ctaLabel: dto.ctaLabel as unknown as Prisma.InputJsonValue,
        features: dto.features as unknown as Prisma.InputJsonValue,
      },
    });
  }

  async deletePlan(id: string, adminId?: string) {
    const plan = await this.getPlan(id);
    await this.prisma.pricingPlan.delete({ where: { id } });
    if (adminId) {
      await this.adminAuditService.logStandalone({
        adminId,
        action: 'DELETE_PRICING_PLAN',
        targetType: 'PricingPlan',
        targetId: id,
        metadata: { key: plan.key, priceUsd: plan.priceUsd.toString() },
      });
    }
    return { success: true };
  }
}
