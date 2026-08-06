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

  async translateText(text: string, targetLang: string): Promise<string> {
    if (!text) return '';
    try {
      const result = await this.translator.translateText(
        text,
        null, // deja undefined para autodetectar el idioma origen
        targetLang.toUpperCase() as TargetLanguageCode,
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
