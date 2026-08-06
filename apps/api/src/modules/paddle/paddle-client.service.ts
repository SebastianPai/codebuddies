import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';

// Referencia de la API: https://developer.paddle.com/api-reference/overview
// (Paddle Billing, no la API "Classic"). Se implementa con fetch directo en
// vez de sumar el SDK oficial (@paddle/paddle-node-sdk) para no agregar una
// dependencia nueva al proyecto sin poder probarla contra Paddle real
// todavía — es un cliente REST fino, fácil de migrar al SDK después si hace
// falta.

export interface PaddlePriceRef {
  price_id: string;
  quantity: number;
}

export interface PaddleAdHocPriceItem {
  quantity: number;
  price: {
    description: string;
    product_id: string;
    unit_price: { amount: string; currency_code: string };
  };
}

export interface CreateTransactionInput {
  items: Array<PaddlePriceRef | PaddleAdHocPriceItem>;
  customerEmail?: string;
  customData?: Record<string, string>;
}

export interface PaddleTransaction {
  id: string;
  status: string;
  checkout?: { url?: string | null };
}

@Injectable()
export class PaddleClientService {
  private readonly logger = new Logger(PaddleClientService.name);

  private get apiKey(): string | undefined {
    return process.env.PADDLE_API_KEY;
  }

  private get baseUrl(): string {
    const env = process.env.PADDLE_ENVIRONMENT ?? 'sandbox';
    return env === 'production'
      ? 'https://api.paddle.com'
      : 'https://sandbox-api.paddle.com';
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  private async request<T>(
    method: 'GET' | 'POST',
    path: string,
    body?: unknown,
  ): Promise<T> {
    if (!this.apiKey) {
      // No debería llegar hasta acá si el módulo eligió el provider mock
      // por falta de credenciales (ver PADDLE_API_KEY en paddle.module.ts),
      // pero se deja explícito por si algo invoca este cliente directo.
      throw new InternalServerErrorException(
        'PADDLE_API_KEY no está configurada',
      );
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const payload = await res.json().catch(() => null);

    if (!res.ok) {
      this.logger.error(
        `Paddle API error ${res.status} en ${method} ${path}: ${JSON.stringify(payload)}`,
      );
      throw new InternalServerErrorException(
        'Error comunicándose con el proveedor de pagos',
      );
    }

    return (payload as { data: T }).data;
  }

  // Crea una "transaction": el objeto que Paddle usa tanto para cobros
  // únicos (certificados) como para arrancar una suscripción (premium,
  // cuando el price referenciado es recurrente). `checkout.url` en la
  // respuesta es el link de checkout hosteado por Paddle al que redirigir
  // al usuario.
  createTransaction(input: CreateTransactionInput): Promise<PaddleTransaction> {
    return this.request<PaddleTransaction>('POST', '/transactions', {
      items: input.items,
      customer_email: input.customerEmail,
      custom_data: input.customData,
    });
  }
}
