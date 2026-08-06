import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AdminCodeStudioController } from './admin-codestudio.controller';
import { CodeStudioController } from './codestudio.controller';
import { CodeStudioEngineService } from './codestudio-engine.service';
import { CodeStudioService } from './codestudio.service';
import { CodeStudioTickService } from './codestudio-tick.service';

@Module({
  imports: [PrismaModule],
  controllers: [CodeStudioController, AdminCodeStudioController],
  providers: [CodeStudioService, CodeStudioEngineService, CodeStudioTickService],
  exports: [CodeStudioService],
})
export class CodeStudioModule {}
