import { Controller, Get } from '@nestjs/common';
import { ThemeAssetsService } from './theme-assets.service';

@Controller('theme-assets')
export class ThemeAssetsController {
  constructor(private readonly themeAssetsService: ThemeAssetsService) {}

  @Get('resolved')
  getResolved() {
    return this.themeAssetsService.getResolved();
  }
}
