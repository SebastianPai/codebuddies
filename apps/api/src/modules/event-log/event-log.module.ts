import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { EventLogController } from './event-log.controller';
import { SocketEventLogInterceptor } from './event-log.interceptors';
import { EventLogService } from './event-log.service';

// Global: el interceptor de sockets lo usa el GameGateway sin que GameModule
// tenga que importar nada.
@Global()
@Module({
  imports: [PrismaModule],
  controllers: [EventLogController],
  providers: [EventLogService, SocketEventLogInterceptor],
  exports: [EventLogService, SocketEventLogInterceptor],
})
export class EventLogModule {}
