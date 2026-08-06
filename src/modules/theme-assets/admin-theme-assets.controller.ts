import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ThemeAssetAnimationDirection, ThemeAssetIconMode } from '@prisma/client';
import { JwtAuthGuard } from '../identity/guards/jwt.guard';
import { RolesGuard } from '../identity/guards/roles.guard';
import { Roles } from '../identity/decorators/roles.decorator';
import { ThemeAssetsService } from './theme-assets.service';

type VariantBody = {
  name?: string;
  imageUrl?: string;
  mode?: ThemeAssetIconMode;
  frameCount?: number;
  direction?: ThemeAssetAnimationDirection;
  frameRate?: number;
};

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/theme-assets')
export class AdminThemeAssetsController {
  constructor(private readonly themeAssetsService: ThemeAssetsService) {}

  @Get()
  listSlots() {
    return this.themeAssetsService.adminListSlots();
  }

  @Post(':slotKey/variants')
  createVariant(@Param('slotKey') slotKey: string, @Body() body: VariantBody) {
    return this.themeAssetsService.adminCreateVariant(slotKey, body);
  }

  @Patch('variants/:id')
  updateVariant(@Param('id') id: string, @Body() body: VariantBody) {
    return this.themeAssetsService.adminUpdateVariant(id, body);
  }

  @Delete('variants/:id')
  deleteVariant(@Param('id') id: string) {
    return this.themeAssetsService.adminDeleteVariant(id);
  }

  @Patch(':slotKey/active')
  setActive(@Param('slotKey') slotKey: string, @Body() body: { variantId: string | null }) {
    return this.themeAssetsService.adminSetActive(slotKey, body.variantId ?? null);
  }
}
