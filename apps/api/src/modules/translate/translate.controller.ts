import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { TranslateService } from './translate.service';
import { TranslateTextDto } from './dto/translate-text.dto';
import { Roles } from '../identity/decorators/roles.decorator';
import { JwtAuthGuard } from '../identity/guards/jwt.guard';
import { RolesGuard } from '../identity/guards/roles.guard';

// QW9: antes sin guard, sin validación de largo, sin límite propio — un
// endpoint público reenviando texto arbitrario a una cuota paga de DeepL.
// Solo lo usa el editor de contenido admin (translations-form.tsx), así
// que restringirlo a ADMIN no rompe ningún flujo real.
@Controller('translate')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class TranslateController {
  constructor(private readonly translateService: TranslateService) {}

  @Post()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async translate(@Body() dto: TranslateTextDto) {
    const translated = await this.translateService.translateText(
      dto.text,
      dto.targetLang,
    );
    return { translated };
  }
}
