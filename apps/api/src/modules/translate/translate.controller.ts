import { Controller, Post, Body } from '@nestjs/common';
import { TranslateService } from './translate.service';

@Controller('translate')
export class TranslateController {
  constructor(private readonly translateService: TranslateService) {}

  @Post()
  async translate(@Body() body: { text: string; targetLang: string }) {
    const { text, targetLang } = body;
    const translated = await this.translateService.translateText(
      text,
      targetLang,
    );
    return { translated };
  }
}
