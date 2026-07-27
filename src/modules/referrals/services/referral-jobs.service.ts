import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ReferralRankingService } from './referral-ranking.service';
import { ReferralValidationService } from './referral-validation.service';

@Injectable()
export class ReferralJobsService {
  private readonly logger = new Logger(ReferralJobsService.name);

  constructor(
    private readonly validationService: ReferralValidationService,
    private readonly rankingService: ReferralRankingService,
  ) {}

  @Cron('0 */6 * * *')
  async reevaluatePendingReferrals() {
    const processed = await this.validationService.evaluatePendingReferrals();
    this.logger.log(`Reevaluated ${processed} pending referrals`);
  }

  @Cron('10 0 1 * *')
  async rolloverMonthlySeason() {
    const finalized = await this.rankingService.finalizeExpiredSeasons();
    this.logger.log(`Finalized ${finalized} expired referral seasons`);
  }
}
