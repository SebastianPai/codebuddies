import { Module } from '@nestjs/common';
import { PaddleClientService } from './paddle-client.service';

@Module({
  providers: [PaddleClientService],
  exports: [PaddleClientService],
})
export class PaddleClientModule {}
