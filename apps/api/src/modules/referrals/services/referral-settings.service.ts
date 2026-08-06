import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  buildReferralLink,
  getOrCreateReferralProgramConfig,
} from '../referral.helpers';
import { UpdateReferralSettingsDto } from '../dto/update-referral-settings.dto';

@Injectable()
export class ReferralSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  getSettings() {
    return getOrCreateReferralProgramConfig(this.prisma);
  }

  async updateSettings(dto: UpdateReferralSettingsDto) {
    const current = await getOrCreateReferralProgramConfig(this.prisma);

    const next = await this.prisma.referralProgramConfig.update({
      where: { id: current.id },
      data: dto,
    });

    if (
      dto.baseUrl !== undefined ||
      dto.codePrefix !== undefined ||
      dto.codeLength !== undefined
    ) {
      const profiles = await this.prisma.referralProfile.findMany({
        select: {
          id: true,
          referralCode: true,
        },
      });

      await Promise.all(
        profiles.map((profile) =>
          this.prisma.referralProfile.update({
            where: { id: profile.id },
            data: {
              referralLink: buildReferralLink(next.baseUrl, profile.referralCode),
            },
          }),
        ),
      );
    }

    return next;
  }
}
