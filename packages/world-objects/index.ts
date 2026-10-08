/**
 * @codebuddies/world-objects
 *
 * Contrato declarativo + máquina de estados de los World Objects
 * interactivos del Marketplace. TS puro: ni Phaser, ni React, ni Prisma, ni
 * una sola dependencia — para que lo puedan importar los tres apps.
 *
 *   apps/api   → valida lo que el creador manda y resuelve la transición que
 *                persiste y difunde a la sala.
 *   apps/game  → ejecuta el runtime y recorta el frame del atlas.
 *   apps/web   → el configurador y el preview, con la MISMA lógica que el
 *                juego (por eso "preview == game" sale gratis).
 *
 * Mismo patrón que `@codebuddies/visual-effects`: paquete de workspace en TS
 * crudo, sin build. Existe precisamente para no repetir el caso de
 * `footprintRotation.ts`, duplicado a mano en cliente y servidor "porque hoy
 * no comparten paquete".
 *
 * REGLA DE ORO: `behavior = null` ⇒ objeto de siempre, comportamiento actual
 * intacto. Nada de acá inventa un behavior por defecto.
 */

export { WORLD_OBJECT_LIMITS, type WorldObjectLimits } from './limits';

export {
  // enums
  WORLD_TRIGGERS,
  WORLD_ACTIONS,
  WORLD_COMPLETION_ACTIONS,
  IMPLEMENTED_TRIGGERS,
  // tipos
  type WorldTrigger,
  type WorldAction,
  type WorldCompletionAction,
  type WorldAnimation,
  type WorldObjectState,
  type WorldCompletion,
  type WorldTransition,
  type WorldBehavior,
  type ValidationResult,
  // puertas de entrada
  validateBehavior,
  readBehavior,
} from './behavior';

export {
  type AnimationFrame,
  clampFps,
  animationDurationMs,
  computeAnimationFrame,
  animationCell,
  animationRowSpan,
  resolveAtlasGeometry,
  type AtlasGeometry,
} from './frames';

export {
  BEHAVIOR_STATE_KEY,
  type PersistedBehaviorState,
  readPersistedState,
  writePersistedState,
  isTransitionInFlight,
  effectiveStateKey,
  buildPersistedState,
  toRemoteUpdate,
  createRuntimeFromPersisted,
} from './persistence';

export {
  EXAMPLE_BEHAVIORS,
  CHAIR_BEHAVIOR,
  PALM_BEHAVIOR,
  TV_BEHAVIOR,
  BATHTUB_BEHAVIOR,
  DOOR_BEHAVIOR,
  FOUNTAIN_BEHAVIOR,
} from './examples';

export {
  type WorldObjectRuntime,
  type RemoteStateUpdate,
  type TriggerResolution,
  type TriggerOutcome,
  type ActiveAnimation,
  type WorldObjectKindLabel,
  resolveState,
  findAnimation,
  findTransition,
  hasTrigger,
  describeBehaviorKind,
  resolveTrigger,
  createRuntime,
  createRuntimeFromRaw,
  isBusy,
  applyTrigger,
  tick,
  applyRemoteState,
  activeAnimation,
} from './machine';

export {
  type ItemUpgradeDefinition,
  upgradeableStates,
  lockedStatesFor,
  applyLockedStates,
} from './upgrades';
