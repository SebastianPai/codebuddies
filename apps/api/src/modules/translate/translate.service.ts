// apps/api/src/modules/translate/translate.service.ts
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Translator,
  TargetLanguageCode,
  type TextResult,
} from 'deepl-node';

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

  async translateText(
    text: string | string[],
    targetLang: string,
  ): Promise<string | string[]> {
    const target = this.toDeeplTargetLang(targetLang);

    if (Array.isArray(text)) {
      const items = text.map((value) => (typeof value === 'string' ? value : ''));
      if (items.length === 0) return [];
      if (items.length > 200) {
        throw new BadRequestException('Demasiados textos en una sola request');
      }
      const totalLength = items.reduce((sum, value) => sum + value.length, 0);
      if (totalLength > 50_000) {
        throw new BadRequestException('El texto total supera el límite');
      }
      // DeepL no traduce strings vacíos; se saltean y se re-insertan después
      // para conservar el índice de cada item.
      const nonEmpty = items.filter((value) => value.trim());
      if (nonEmpty.length === 0) return items;
      try {
        const results = (await this.translator.translateText(
          nonEmpty,
          null,
          target,
        )) as TextResult[];
        let cursor = 0;
        return items.map((value) =>
          value.trim() ? results[cursor++]?.text ?? value : value,
        );
      } catch (err) {
        this.logger.error(
          'Error traduciendo el lote de textos',
          err instanceof Error ? err.stack : err,
        );
        throw new InternalServerErrorException('Error traduciendo el texto');
      }
    }

    if (!text) return '';
    if (text.length > 50_000) {
      throw new BadRequestException('El texto supera el límite');
    }
    try {
      const result = await this.translator.translateText(text, null, target);
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
