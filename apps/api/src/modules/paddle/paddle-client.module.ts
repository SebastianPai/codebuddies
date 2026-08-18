import { Module } from '@nestjs/common';
import { PaddleClientService } from './paddle-client.service';
import { PaddleSdkService } from './paddle-sdk.service';

@Module({
  providers: [PaddleClientService, PaddleSdkService],
  exports: [PaddleClientService, PaddleSdkService],
})
export class PaddleClientModule {}
