import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ContentDiscussionController } from './content-discussion.controller';
import { ContentReportsAdminController } from './content-reports-admin.controller';
import { ContentDiscussionService } from './content-discussion.service';

@Module({
  imports: [PrismaModule],
  controllers: [ContentDiscussionController, ContentReportsAdminController],
  providers: [ContentDiscussionService],
})
export class ContentDiscussionModule {}
