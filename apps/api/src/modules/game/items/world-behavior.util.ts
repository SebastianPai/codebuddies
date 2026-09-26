// Única puerta de ESCRITURA del `behavior` de un world item.
//
// Toda ruta que persista WorldItemData.behavior pasa por acá — ItemsService
// (alta y edición), WorldItemDataService (/admin/world-items) y
// MarketplaceService (publicar y actualizar un publicado). Mismo criterio que
// `buildWorldEngineData()` y `buildSpriteOffsetData()`: el cálculo/validación
// vive en un solo lugar y los servicios sólo lo invocan, para que no vuelva a
// pasar lo que pasó con engineData, que se desincronizaba según por qué
// endpoint se editara el item.
//
// La validación real la hace @codebuddies/world-objects, el mismo paquete que
// el juego usa para EJECUTAR el behavior. Así es imposible que el servidor
// acepte algo que el motor no sabe correr, o al revés.
//
// ─────────────────────────────────────────────────────────────────────────
// TRES ENTRADAS, TRES SIGNIFICADOS DISTINTOS
//
//   undefined → "no me lo mandaron": NO se toca la columna. Es lo que hace
//               que un PATCH parcial (o un editor que todavía no conoce el
//               campo) no borre el behavior de un objeto ya configurado.
//   null      → "borralo": la columna queda NULL y el objeto vuelve a ser
//               estático.
//   objeto    → se valida en ESTRICTO. Un solo error ⇒ 400 y no se guarda
//               nada; las propiedades desconocidas son error, no se ignoran.

import { BadRequestException } from '@nestjs/common';
import { InteractionType, Prisma } from '@prisma/client';
import { validateBehavior } from '@codebuddies/world-objects';

/**
 * `undefined` = no tocar la columna · `Prisma.JsonNull` = ponerla en NULL ·
 * objeto = el behavior normalizado (nunca el crudo que mandó el cliente).
 */
export type BehaviorWriteValue =
  | Prisma.InputJsonValue
  | typeof Prisma.JsonNull
  | undefined;

/**
 * Normaliza el `behavior` que llega de un DTO/payload a un valor listo para
 * Prisma. Lanza BadRequestException con la lista completa de errores si el
 * dato es inválido.
 *
 * Lo que se guarda es SIEMPRE la salida del validador, no la entrada: los
 * campos opcionales quedan explícitos (`directional`, `spriteSheetUrl`) y
 * cualquier cosa que no esté en el contrato no llega a la base.
 */
export function normalizeBehaviorForWrite(input: unknown): BehaviorWriteValue {
  if (input === undefined) return undefined;
  if (input === null) return Prisma.JsonNull;

  const result = validateBehavior(input);

  if (!result.ok) {
    // `errors` vacío sólo puede pasar con null/undefined, y esos ya salieron
    // arriba — pero si pasara, se trata como "sin behavior" en vez de tirar
    // un 400 sin mensaje.
    if (result.errors.length === 0) return Prisma.JsonNull;

    throw new BadRequestException({
      message: 'Comportamiento del objeto inválido',
      errors: result.errors,
    });
  }

  return result.behavior as unknown as Prisma.InputJsonValue;
}

/**
 * Azúcar para los `data` de Prisma: devuelve `{}` cuando no hay nada que
 * escribir, o `{ behavior: <valor> }` cuando sí.
 *
 * Permite hacer `...buildBehaviorData(dto.behavior)` sin un `if` en cada
 * servicio, que es justo donde se cuelan las omisiones.
 */
export function buildBehaviorData(
  input: unknown,
):
  | { behavior: Prisma.InputJsonValue | typeof Prisma.JsonNull }
  | Record<string, never> {
  const value = normalizeBehaviorForWrite(input);
  if (value === undefined) return {};
  return { behavior: value };
}

// ─────────────────────────────────────────────────────────────────────────
// interactionTypes QUE EL BEHAVIOR EXIGE
//
// `RoomItemsService#interactItem` rechaza CUALQUIER interacción —CLICK
// incluido— a menos que `worldData.isInteractable` sea true Y
// `worldData.interactionTypes` incluya esa interacción (ver el gate al
// principio de ese método, antes de mirar siquiera si hay `behavior`).
// `interactionTypes` es un campo que hoy sólo edita un admin desde
// /admin/world-items/:id (`WorldItemDataService`); el editor de
// comportamiento (ItemsService, usado por /admin/items Y por
// /creator/marketplace) nunca lo toca. El resultado real, encontrado en la
// QA de navegador de la Fase 11: un creador arma un TV con click perfecto,
// lo guarda, y en la sala el objeto no reacciona — nadie marcó la casilla
// que vive en otra pantalla.
//
// La corrección vive acá, no en RoomItemsService (que la Fase 11 no debe
// tocar): si el `behavior` que se está escribiendo declara una transición
// CLICK, se AÑADE 'CLICK' a `interactionTypes` — nunca se quita nada de lo
// que ya hubiera (TOGGLE/OPEN/… siguen intactos), y si el behavior no usa
// CLICK no se toca la columna.

/** ¿Esta escritura de behavior declara alguna transición CLICK? */
function requiresClickInteraction(value: BehaviorWriteValue): boolean {
  if (!value || value === Prisma.JsonNull) return false;

  const behavior = value as unknown as {
    transitions?: Array<{ trigger?: unknown }>;
  };

  return (
    Array.isArray(behavior.transitions) &&
    behavior.transitions.some((transition) => transition?.trigger === 'CLICK')
  );
}

/**
 * Azúcar para los `data` de Prisma, en el mismo espíritu que
 * `buildBehaviorData`: `{}` si no hay nada que añadir, o el par de columnas
 * que `interactItem()` exige ANTES de mirar `behavior` — `isInteractable` y
 * `interactionTypes` con CLICK sumado a lo que ya hubiera.
 *
 * Sólo ENCIENDE cosas, nunca las apaga: un `isInteractable` u otro
 * `interactionTypes` que el admin haya puesto a mano no se tocan si el
 * behavior no tiene click, y si lo tiene, sólo se AÑADE lo que falte.
 *
 * `normalizedBehavior` es la MISMA salida que ya produjo
 * `normalizeBehaviorForWrite` / `buildBehaviorData` para esta escritura — no
 * vuelve a validar nada.
 */
export function buildInteractionTypesData(
  normalizedBehavior: BehaviorWriteValue,
  existing: {
    isInteractable?: boolean | null;
    interactionTypes?: InteractionType[] | null;
  },
):
  | { interactionTypes: InteractionType[]; isInteractable?: true }
  | Record<string, never> {
  if (!requiresClickInteraction(normalizedBehavior)) return {};

  const current = existing.interactionTypes ?? [];
  const interactionTypes = current.includes(InteractionType.CLICK)
    ? current
    : [...current, InteractionType.CLICK];

  if (existing.isInteractable) {
    return current.includes(InteractionType.CLICK) ? {} : { interactionTypes };
  }

  return { interactionTypes, isInteractable: true };
}
