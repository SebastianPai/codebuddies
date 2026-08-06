// apps/api/src/modules/translate/translate.module.ts
import { Module } from '@nestjs/common';
import { TranslateService } from './translate.service';
import { TranslateController } from './translate.controller';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule], // para poder inyectar ConfigService
  providers: [TranslateService],
  controllers: [TranslateController],
})
export class TranslateModule {}
