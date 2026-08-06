import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express'; // sólo se usa como tipo; 'express' no es una dependencia instalada
import type { Socket } from 'socket.io';

// Único punto de normalización de errores HTTP: antes cada excepción no
// capturada explícitamente devolvía el payload por defecto de Nest, que
// varía según el tipo de excepción (o un 500 crudo con stack trace).
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse = isHttpException ? exception.getResponse() : null;
    const message = isHttpException
      ? typeof exceptionResponse === 'string'
        ? exceptionResponse
        : ((exceptionResponse as { message?: string | string[] })?.message ??
          exception.message)
      : 'Internal server error';

    if (!isHttpException) {
      this.logger.error(
        exception instanceof Error ? exception.stack : exception,
      );
    }

    // El gateway de WebSockets también pasa por este filtro global. Antes
    // asumía siempre contexto HTTP (host.switchToHttp().getResponse()), así
    // que cualquier excepción no capturada dentro de un handler de socket
    // (por ejemplo, ahora, un ValidationPipe rechazando un payload) rompía
    // intentando construir una respuesta Express inexistente en vez de
    // avisarle al cliente con un evento limpio.
    if (host.getType() === 'ws') {
      const client = host.switchToWs().getClient<Socket>();
      client.emit('exception', { statusCode: status, message });
      return;
    }

    const response = host.switchToHttp().getResponse<Response>();
    response.status(status).json({
      statusCode: status,
      message,
    });
  }
}
