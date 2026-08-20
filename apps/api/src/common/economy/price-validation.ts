import { BadRequestException } from '@nestjs/common';
import { RARITY_DEFINITIONS } from './rarity.constants';

const RARITY_BY_ID = new Map(RARITY_DEFINITIONS.map((def) => [def.id, def]));

// Única puerta de validación de coinsPrice contra el rango de su rareza.
// Se llama al crear/editar un item (ItemsService), nunca contra los 18
// items existentes de forma retroactiva -- esta fase no tocó ni un precio
// existente, solo empieza a exigir el rango para lo que se cree/edite de
// acá en más.
//
// Excepciones explícitas (no errores de validación):
//   - coinsPrice 0/null/undefined = "no vendible" -- siempre permitido.
//     Cubre items internos/default, objetos de Battle Pass mientras sean
//     exclusivos, y objetos de evento que no se venden por coins.
export function assertValidShopPrice(rarity: number, coinsPrice: number | null | undefined): void {
  if (coinsPrice === null || coinsPrice === undefined || coinsPrice === 0) {
    return;
  }

  if (coinsPrice < 0) {
    throw new BadRequestException('coinsPrice no puede ser negativo');
  }

  const def = RARITY_BY_ID.get(rarity);
  if (!def) {
    throw new BadRequestException(
      `Rareza ${rarity} desconocida -- no se puede validar el precio contra su rango`,
    );
  }

  if (coinsPrice < def.minCoins || coinsPrice > def.maxCoins) {
    throw new BadRequestException(
      `Para rareza "${def.key}" el precio debe estar entre ${def.minCoins} y ${def.maxCoins} coins (recibido: ${coinsPrice})`,
    );
  }
}
