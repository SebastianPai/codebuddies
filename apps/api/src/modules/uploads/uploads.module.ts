import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { AssetProxyController } from './asset-proxy.controller';
import { UploadsService } from './uploads.service';

@Module({
  controllers: [UploadsController, AssetProxyController],
  providers: [UploadsService],
  exports: [UploadsService],
})
export class UploadsModule {}
