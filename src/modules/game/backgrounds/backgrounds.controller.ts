import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../identity/guards/jwt.guard';
import { RolesGuard } from '../../identity/guards/roles.guard';
import { Roles } from '../../identity/decorators/roles.decorator';
import { CurrentUser } from '../../identity/decorators/current-user.decorator';
import type { AuthUser } from '../../identity/decorators/current-user.decorator';
import { BackgroundAccessType } from '@prisma/client';
import { BackgroundsService } from './backgrounds.service';
import { UpsertBackgroundDto } from './dto/upsert-background.dto';
import { UpsertBackgroundCategoryDto } from './dto/upsert-background-category.dto';

@Controller()
@UseGuards(JwtAuthGuard)
export class BackgroundsController {
  constructor(private readonly backgroundsService: BackgroundsService) {}

  @Get('backgrounds')
  listForUser(@CurrentUser() user: AuthUser, @Query() query: { categoryId?: string; shop?: string }) {
    return this.backgroundsService.listAvailableForUser(user.userId, query);
  }

  @Post('backgrounds/:id/buy')
  buy(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.backgroundsService.buyBackground(user.userId, id);
  }

  @Get('background-categories')
  categories() {
    return this.backgroundsService.listCategories();
  }

  @Get('admin/backgrounds')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  adminList(@Query() query: { search?: string; categoryId?: string; accessType?: BackgroundAccessType; active?: string }) {
    return this.backgroundsService.listAdmin(query);
  }

  @Post('admin/backgrounds')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  create(@Body() dto: UpsertBackgroundDto) {
    return this.backgroundsService.create(dto);
  }

  @Patch('admin/backgrounds/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() dto: UpsertBackgroundDto) {
    return this.backgroundsService.update(id, dto);
  }

  @Delete('admin/backgrounds/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  delete(@Param('id') id: string) {
    return this.backgroundsService.delete(id);
  }

  @Get('admin/background-categories')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  adminCategories() {
    return this.backgroundsService.listCategories(true);
  }

  @Post('admin/background-categories')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  createCategory(@Body() dto: UpsertBackgroundCategoryDto) {
    return this.backgroundsService.createCategory(dto);
  }

  @Patch('admin/background-categories/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  updateCategory(@Param('id') id: string, @Body() dto: UpsertBackgroundCategoryDto) {
    return this.backgroundsService.updateCategory(id, dto);
  }

  @Delete('admin/background-categories/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  deleteCategory(@Param('id') id: string) {
    return this.backgroundsService.deleteCategory(id);
  }
}
