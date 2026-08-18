// Catalogo central de Paddle para /pricing -- todos los product_id/price_id
// viven acá, nunca hardcodeados en un componente. Son ids client-safe (no
// secretos, ver PADDLE_API_KEY que SOLO existe en apps/api) pero igual se
// leen de env vars NEXT_PUBLIC_* para no atar el bundle a un catálogo fijo
// entre sandbox y producción.

export interface SubscriptionPlan {
  name: 'CodeBuddies Pro';
  description: string;
  monthlyPriceId: string;
  yearlyPriceId: string;
}

export interface CoinPack {
  key: string;
  name: string;
  coins: number;
  bonusCoins?: number;
  priceId: string;
  popular?: boolean;
}

export interface StoreProduct {
  name: string;
  type: 'subscription' | 'one-time';
  priceId: string;
}

function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    // Fail loud, nunca default silencioso -- si falta un price id, mejor
    // romper acá con un mensaje claro que dejar que Paddle.js falle más
    // abajo con un error críptico.
    throw new Error(
      `${name} no está configurada. Revisá apps/web/.env.example (sección Paddle).`,
    );
  }
  return value;
}

export function getPaddleClientToken(): string {
  return requireEnv(
    'NEXT_PUBLIC_PADDLE_CLIENT_TOKEN',
    process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN,
  );
}

export function getPaddleEnvironment(): 'sandbox' | 'production' {
  const value = requireEnv(
    'NEXT_PUBLIC_PADDLE_ENVIRONMENT',
    process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT,
  );
  if (value !== 'sandbox' && value !== 'production') {
    throw new Error(
      `NEXT_PUBLIC_PADDLE_ENVIRONMENT="${value}" inválido -- debe ser "sandbox" o "production".`,
    );
  }
  return value;
}

export function getSubscriptionPlan(): SubscriptionPlan {
  return {
    name: 'CodeBuddies Pro',
    description: 'Acceso ilimitado a cursos, ejercicios y beneficios premium.',
    monthlyPriceId: requireEnv(
      'NEXT_PUBLIC_PADDLE_PRO_MONTHLY_PRICE_ID',
      process.env.NEXT_PUBLIC_PADDLE_PRO_MONTHLY_PRICE_ID,
    ),
    yearlyPriceId: requireEnv(
      'NEXT_PUBLIC_PADDLE_PRO_YEARLY_PRICE_ID',
      process.env.NEXT_PUBLIC_PADDLE_PRO_YEARLY_PRICE_ID,
    ),
  };
}

export function getCertificateProduct(): StoreProduct {
  return {
    name: 'Official CodeBuddies Certificate',
    type: 'one-time',
    priceId: requireEnv(
      'NEXT_PUBLIC_PADDLE_CERTIFICATE_PRICE_ID',
      process.env.NEXT_PUBLIC_PADDLE_CERTIFICATE_PRICE_ID,
    ),
  };
}

export function getCoinPacks(): CoinPack[] {
  return [
    {
      key: 'coins_500',
      name: 'Small',
      coins: 500,
      priceId: requireEnv(
        'NEXT_PUBLIC_PADDLE_COIN_PRICE_ID_500',
        process.env.NEXT_PUBLIC_PADDLE_COIN_PRICE_ID_500,
      ),
    },
    {
      key: 'coins_1100',
      name: 'Popular',
      coins: 1100,
      bonusCoins: 100,
      popular: true,
      priceId: requireEnv(
        'NEXT_PUBLIC_PADDLE_COIN_PRICE_ID_1100',
        process.env.NEXT_PUBLIC_PADDLE_COIN_PRICE_ID_1100,
      ),
    },
    {
      key: 'coins_3400',
      name: 'Large',
      coins: 3400,
      bonusCoins: 400,
      priceId: requireEnv(
        'NEXT_PUBLIC_PADDLE_COIN_PRICE_ID_3400',
        process.env.NEXT_PUBLIC_PADDLE_COIN_PRICE_ID_3400,
      ),
    },
    {
      key: 'coins_6000',
      name: 'Ultimate',
      coins: 6000,
      bonusCoins: 1000,
      priceId: requireEnv(
        'NEXT_PUBLIC_PADDLE_COIN_PRICE_ID_6000',
        process.env.NEXT_PUBLIC_PADDLE_COIN_PRICE_ID_6000,
      ),
    },
  ];
}
