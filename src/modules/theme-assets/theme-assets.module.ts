import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ThemeAssetsController } from './theme-assets.controller';
import { AdminThemeAssetsController } from './admin-theme-assets.controller';
import { ThemeAssetsService } from './theme-assets.service';

@Module({
  imports: [PrismaModule],
  controllers: [ThemeAssetsController, AdminThemeAssetsController],
  providers: [ThemeAssetsService],
  exports: [ThemeAssetsService],
})
export class ThemeAssetsModule {}
