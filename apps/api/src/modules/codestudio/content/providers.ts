// Proveedores de hosting: el mismo tipo de servidor se puede contratar a
// distintas empresas, como en la vida real. El barato sale a mitad de precio
// pero es más lento y se cae más; el premium cuesta casi el doble pero es
// rápido y casi nunca falla. Se guarda en CodeStudioInfrastructure.metadata.

import { L, Localized } from './i18n/localized';

export type ProviderKey = 'budget' | 'standard' | 'premium';

export type Provider = {
  key: ProviderKey;
  name: string;
  /** Multiplica el costo de instalar/mejorar. */
  install: number;
  /** Multiplica la mensualidad. */
  monthly: number;
  /** Multiplica la capacidad (usuarios que aguanta). */
  capacity: number;
  /** Suma a la latencia (ms). */
  latency: number;
  /** Suma a la estabilidad (%). */
  stability: number;
  pitch: Localized;
};

export const PROVIDERS: Record<ProviderKey, Provider> = {
  budget: {
    key: 'budget',
    name: 'PixelHost',
    install: 0.6,
    monthly: 0.55,
    capacity: 0.85,
    latency: 45,
    stability: -3.5,
    pitch: L(
      'Mitad de precio. Servidores compartidos: más lento y se cae más seguido. Ideal para empezar.',
      'Half price. Shared servers: slower and goes down more often. Good to start.',
      'Halber Preis. Geteilte Server: langsamer und fällt öfter aus. Gut zum Starten.',
    ),
  },
  standard: {
    key: 'standard',
    name: 'NubeMedia',
    install: 1,
    monthly: 1,
    capacity: 1,
    latency: 0,
    stability: 0,
    pitch: L('El equilibrio: precio justo y funciona bien.', 'The balance: fair price and works well.', 'Die Mitte: fairer Preis und läuft gut.'),
  },
  premium: {
    key: 'premium',
    name: 'OrbitCloud',
    install: 1.5,
    monthly: 1.7,
    capacity: 1.2,
    latency: -30,
    stability: 1.5,
    pitch: L(
      'Caro, pero rápido, aguanta más y casi nunca se cae. Para cuando cada minuto caído cuesta usuarios.',
      'Expensive, but fast, holds more and almost never goes down. For when every minute down costs users.',
      'Teuer, aber schnell, hält mehr aus und fällt fast nie aus. Wenn jede Minute Ausfall Nutzer kostet.',
    ),
  },
};

export const PROVIDER_KEYS = Object.keys(PROVIDERS) as ProviderKey[];

/** Proveedor guardado; sin dato (servidores de antes) es el estándar. */
export function providerOf(metadata: unknown): Provider {
  const key = (metadata && typeof metadata === 'object' ? (metadata as { provider?: string }).provider : undefined) as ProviderKey | undefined;
  return PROVIDERS[key && PROVIDERS[key] ? key : 'standard'];
}
