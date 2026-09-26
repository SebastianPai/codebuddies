import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { GamificationModule } from '../gamification/gamification.module';
import { AdminCodeStudioController } from './admin-codestudio.controller';
import { CodeStudioController } from './codestudio.controller';
import { CodeStudioEngineService } from './codestudio-engine.service';
import { CodeStudioCatalogService } from './codestudio-catalog.service';
import { CodeStudioRewardsService } from './codestudio-rewards.service';
import { CodeStudioService } from './codestudio.service';

// Sin tick global (cron): la empresa se simula cuando su dueño la está
// mirando (GET /codestudio/companies/:id cada ~10s). Así 1.000 empresas
// abandonadas no cuestan nada y nadie quiebra mientras está desconectado.
@Module({
  imports: [PrismaModule, GamificationModule],
  controllers: [CodeStudioController, AdminCodeStudioController],
  providers: [CodeStudioService, CodeStudioEngineService, CodeStudioCatalogService, CodeStudioRewardsService],
  exports: [CodeStudioService],
})
export class CodeStudioModule {}
