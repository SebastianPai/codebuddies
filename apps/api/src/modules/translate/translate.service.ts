// apps/api/src/modules/translate/translate.service.ts
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Translator, TargetLanguageCode } from 'deepl-node';

@Injectable()
export class TranslateService {
  private readonly logger = new Logger(TranslateService.name);
  private translator: Translator;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('DEEPL_API_KEY');
    if (!apiKey) {
      throw new InternalServerErrorException(
        'DEEPL_API_KEY no definida en .env',
      );
    }
    this.translator = new Translator(apiKey);
  }

  // DeepL exige variante regional para el inglés como idioma destino (solo
  // acepta EN-US / EN-GB, nunca el "EN" a secas) -- pero Language.code en la
  // base es 'en' sin región (ver prisma/seed.ts), que es el valor que en la
  // práctica siempre llega acá desde el admin. Mapeo puntual en vez de forzar
  // una convención de código distinta a la de la base para todos los demás
  // idiomas (de sí funciona igual, DeepL acepta case-insensitive).
  private toDeeplTargetLang(targetLang: string): TargetLanguageCode {
    const normalized = targetLang.toUpperCase();
    if (normalized === 'EN') return 'en-US';
    return normalized as TargetLanguageCode;
  }

  async translateText(text: string, targetLang: string): Promise<string> {
    if (!text) return '';
    try {
      const result = await this.translator.translateText(
        text,
        null, // deja undefined para autodetectar el idioma origen
        this.toDeeplTargetLang(targetLang),
      );
      return result.text;
    } catch (err) {
      this.logger.error(
        'Error traduciendo el texto',
        err instanceof Error ? err.stack : err,
      );
      throw new InternalServerErrorException('Error traduciendo el texto');
    }
  }
}
