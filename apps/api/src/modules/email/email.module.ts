import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { MailerModule } from '../mailer/mailer.module';
import { PromoCodesModule } from '../promo-codes/promo-codes.module';
import { EmailController } from './email.controller';
import { EmailUnsubscribeController } from './email-unsubscribe.controller';
import { EmailService } from './email.service';
import { EmailJobsService } from './email-jobs.service';

@Module({
  imports: [PrismaModule, MailerModule, PromoCodesModule],
  controllers: [EmailUnsubscribeController, EmailController],
  providers: [EmailService, EmailJobsService],
  exports: [EmailService],
})
export class EmailModule {}
