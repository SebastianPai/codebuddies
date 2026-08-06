import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Roles } from '../identity/decorators/roles.decorator';
import { JwtAuthGuard } from '../identity/guards/jwt.guard';
import { RolesGuard } from '../identity/guards/roles.guard';
import { UpsertAchievementDto } from './dto/upsert-achievement.dto';
import { UpsertCatalogDto } from './dto/upsert-catalog.dto';
import { UpsertMissionDto } from './dto/upsert-mission.dto';
import { UpsertMissionCategoryDto } from './dto/upsert-mission-category.dto';
import { UpsertRewardBundleDto } from './dto/upsert-reward-bundle.dto';
import { GamificationService } from './gamification.service';

@Controller('admin/gamification')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class GamificationAdminController {
  constructor(private readonly gamificationService: GamificationService) {}

  @Get('dashboard')
  getDashboard() {
    return this.gamificationService.getAdminDashboard();
  }

  @Get('categories')
  listCategories() {
    return this.gamificationService.listCategories();
  }

  @Post('categories')
  createCategory(@Body() dto: UpsertMissionCategoryDto) {
    return this.gamificationService.createCategory(dto);
  }

  @Patch('categories/:id')
  updateCategory(@Param('id') id: string, @Body() dto: UpsertMissionCategoryDto) {
    return this.gamificationService.updateCategory(id, dto);
  }

  @Delete('categories/:id')
  deleteCategory(@Param('id') id: string) {
    return this.gamificationService.deleteCategory(id);
  }

  @Get('missions')
  listMissions() {
    return this.gamificationService.listMissions();
  }

  @Get('missions/:id')
  getMission(@Param('id') id: string) {
    return this.gamificationService.getMission(id);
  }

  @Post('missions')
  createMission(@Body() dto: UpsertMissionDto) {
    return this.gamificationService.createMission(dto);
  }

  @Patch('missions/:id')
  updateMission(@Param('id') id: string, @Body() dto: UpsertMissionDto) {
    return this.gamificationService.updateMission(id, dto);
  }

  @Delete('missions/:id')
  deleteMission(@Param('id') id: string) {
    return this.gamificationService.deleteMission(id);
  }

  @Get('achievements')
  listAchievements() {
    return this.gamificationService.listAchievements();
  }

  @Get('achievements/:id')
  getAchievement(@Param('id') id: string) {
    return this.gamificationService.getAchievement(id);
  }

  @Post('achievements')
  createAchievement(@Body() dto: UpsertAchievementDto) {
    return this.gamificationService.createAchievement(dto);
  }

  @Patch('achievements/:id')
  updateAchievement(@Param('id') id: string, @Body() dto: UpsertAchievementDto) {
    return this.gamificationService.updateAchievement(id, dto);
  }

  @Delete('achievements/:id')
  deleteAchievement(@Param('id') id: string) {
    return this.gamificationService.deleteAchievement(id);
  }

  @Get('reward-bundles')
  listRewardBundles() {
    return this.gamificationService.listRewardBundles();
  }

  @Get('reward-history')
  listRewardHistory() {
    return this.gamificationService.listAdminRewardHistory();
  }

  @Post('reward-bundles')
  createRewardBundle(@Body() dto: UpsertRewardBundleDto) {
    return this.gamificationService.createRewardBundle(dto);
  }

  @Patch('reward-bundles/:id')
  updateRewardBundle(@Param('id') id: string, @Body() dto: UpsertRewardBundleDto) {
    return this.gamificationService.updateRewardBundle(id, dto);
  }

  @Delete('reward-bundles/:id')
  deleteRewardBundle(@Param('id') id: string) {
    return this.gamificationService.deleteRewardBundle(id);
  }

  @Get(':kind')
  listCatalog(@Param('kind') kind: string) {
    return this.gamificationService.listCatalog(kind);
  }

  @Post(':kind')
  createCatalog(@Param('kind') kind: string, @Body() dto: UpsertCatalogDto) {
    return this.gamificationService.createCatalog(kind, dto);
  }

  @Patch(':kind/:id')
  updateCatalog(@Param('kind') kind: string, @Param('id') id: string, @Body() dto: UpsertCatalogDto) {
    return this.gamificationService.updateCatalog(kind, id, dto);
  }

  @Delete(':kind/:id')
  deleteCatalog(@Param('kind') kind: string, @Param('id') id: string) {
    return this.gamificationService.deleteCatalog(kind, id);
  }
}
