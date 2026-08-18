// Catálogo de paquetes de monedas comprables con dinero real. Precio y
// cantidad de coins se definen server-side (igual que
// DEFAULT_CERTIFICATE_PRICE_USD en payments.service.ts) -- nunca se acepta
// el monto a cobrar desde el cliente, solo la key del paquete elegido.
export interface CoinPackage {
  key: string;
  coins: number;
  priceUsd: number;
}

export const COIN_PACKAGES: CoinPackage[] = [
  { key: 'coins_500', coins: 500, priceUsd: 4.99 },
  { key: 'coins_1200', coins: 1200, priceUsd: 9.99 },
  { key: 'coins_3000', coins: 3000, priceUsd: 19.99 },
  { key: 'coins_7000', coins: 7000, priceUsd: 39.99 },
];

export function findCoinPackage(key: string): CoinPackage | undefined {
  return COIN_PACKAGES.find((pkg) => pkg.key === key);
}
