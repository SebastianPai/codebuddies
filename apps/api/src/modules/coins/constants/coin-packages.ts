// Catálogo de paquetes de monedas comprables con dinero real. Precio y
// cantidad de coins se definen server-side (igual que
// DEFAULT_CERTIFICATE_PRICE_USD en payments.service.ts) -- nunca se acepta
// el monto a cobrar desde el cliente, solo la key del paquete elegido.
export interface CoinPackage {
  key: string;
  coins: number;
  priceUsd: number;
  // Cada paquete es su propio product+price real en Paddle (no un product
  // genérico con precio ad-hoc) -- ver PaddlePaymentProvider.
  paddlePriceEnvVar: string;
}

export const COIN_PACKAGES: CoinPackage[] = [
  { key: 'coins_500', coins: 500, priceUsd: 2.99, paddlePriceEnvVar: 'PADDLE_COIN_PRICE_ID_500' },
  { key: 'coins_1100', coins: 1100, priceUsd: 5.49, paddlePriceEnvVar: 'PADDLE_COIN_PRICE_ID_1100' },
  { key: 'coins_3400', coins: 3400, priceUsd: 13.99, paddlePriceEnvVar: 'PADDLE_COIN_PRICE_ID_3400' },
  { key: 'coins_6000', coins: 6000, priceUsd: 19.99, paddlePriceEnvVar: 'PADDLE_COIN_PRICE_ID_6000' },
];

export function findCoinPackage(key: string): CoinPackage | undefined {
  return COIN_PACKAGES.find((pkg) => pkg.key === key);
}
