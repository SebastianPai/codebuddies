import type Phaser from "phaser";
import {
  activeAnimation,
  animationCell,
  applyRemoteState,
  computeAnimationFrame,
  createRuntimeFromPersisted,
  findAnimation,
  hasTrigger,
  readBehavior,
  resolveAtlasGeometry,
  resolveState,
  tick,
  type AtlasGeometry,
  type WorldTrigger,
  type RemoteStateUpdate,
  type WorldAnimation,
  type WorldBehavior,
  type WorldObjectRuntime,
} from "@codebuddies/world-objects";
import { getSpriteFrameIndex, getFaceCount } from "../utils/spriteFrames";

/**
 * Ejecutor VISUAL de los World Objects animados.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * QUÉ HACE Y QUÉ NO
 *
 * Sólo dibuja. No decide estados, no resuelve transiciones y no habla con el
 * servidor. Toda la lógica de la máquina vive en @codebuddies/world-objects —
 * el mismo módulo que usa la API para resolver un CLICK — así que no hay dos
 * implementaciones que se puedan desincronizar.
 *
 *     SERVIDOR → WebSocket → FurnitureSocketSystem → este animator → Sprite
 *
 * Nunca al revés: el cliente jamás propone un estado.
 *
 * No hay una sola regla específica de TV, bañera o puerta acá dentro. Todo
 * sale del `behavior` del objeto.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * EL FRAME SALE DEL RELOJ, NO DE UN CONTADOR
 *
 *     frame = f(now − at)
 *
 * Es la propiedad que hace que todo lo demás funcione sin casos especiales:
 *
 *   · dos jugadores que reciben el evento con 40 ms de diferencia ven el
 *     MISMO frame, porque los dos cuentan desde el `at` del servidor y no
 *     desde el instante en que les llegó el paquete;
 *   · quien entra a la sala a mitad de una transición reanuda donde va;
 *   · quien entra cuando ya terminó salta al estado final sin reproducir
 *     nada;
 *   · si la textura tarda en cargar, al aparecer se dibuja el frame que toca
 *     AHORA, no el primero.
 *
 * Nada de esto necesita un temporizador por objeto: se recalcula en el
 * `update()` de la escena, que ya existe.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * SIN PHASER EN TIEMPO DE EJECUCIÓN
 *
 * Los tipos de Phaser se importan con `import type` (se borran al compilar) y
 * el cargador de texturas entra por constructor. Así este archivo se puede
 * probar en Node sin navegador ni `jest.mock("phaser")`, igual que NavGrid se
 * prueba con un doble mínimo de IsoGrid.
 */

/** Lo mínimo que el animator necesita de la escena. */
export type AnimatorTextures = {
  exists(key: string): boolean;
  get(key: string): {
    has(name: string): boolean;
    add(
      name: string,
      sourceIndex: number,
      x: number,
      y: number,
      width: number,
      height: number,
    ): unknown;
    readonly width?: number;
    readonly height?: number;
  };
};

/** Carga una textura y devuelve su key. En el juego es `loadTextureOnce`. */
export type TextureLoader = (url: string) => Promise<string>;

/** Lo mínimo que el animator necesita de un sprite. */
export type AnimatableSprite = {
  texture: { key: string };
  setTexture(key: string, frame?: string): unknown;
  setFrame(frame: string): unknown;
};

/** El objeto colocado, tal como lo mantiene RoomItemsManager. */
export type AnimatableObject = {
  roomItemId: string;
  rotation: number;
  state?: any;
  item?: any;
  sprite: AnimatableSprite;
};

type Entry = {
  object: AnimatableObject;
  behavior: WorldBehavior;
  runtime: WorldObjectRuntime;
  /** Textura y frame con los que RoomItemsManager dibujó el objeto. */
  baseTextureKey: string;
  baseFrameName: string;
  /** url del atlas -> key de textura ya cargada. */
  loaded: Map<string, string>;
  /** urls cuya carga está en vuelo, para no pedirlas dos veces. */
  loading: Set<string>;
  /** Último frame aplicado, para no llamar a setFrame de balde. */
  lastFrameKey: string;
};

export default class WorldObjectAnimator {
  private textures: AnimatorTextures;
  private loadTexture: TextureLoader;

  private entries = new Map<string, Entry>();

  /**
   * Sólo los objetos que de verdad necesitan recalcular frame cada tick: los
   * que tienen una animación activa. Un objeto en un estado quieto no está
   * acá y no cuesta absolutamente nada en el bucle — que es lo que permite
   * tener una sala llena de muebles animados sin pagarlos todos.
   */
  private animating = new Set<string>();

  constructor(textures: AnimatorTextures, loadTexture: TextureLoader) {
    this.textures = textures;
    this.loadTexture = loadTexture;
  }

  /**
   * Da de alta un objeto recién colocado o recién cargado con la sala.
   *
   * Devuelve false si el objeto no tiene un `behavior` usable — o sea, si es
   * uno de los de siempre. Esos NO entran al animator: siguen dibujándose
   * exactamente como antes, con su frame estático por dirección.
   */
  register(object: AnimatableObject, now: number): boolean {
    this.unregister(object.roomItemId);

    const behavior = readBehavior(object.item?.worldData?.behavior);
    if (!behavior) return false;

    const sprite = object.sprite;
    const entry: Entry = {
      object,
      behavior,
      // Un solo camino para los tres casos de entrada a la sala: sin
      // transición, transición a medias y transición ya terminada.
      runtime: createRuntimeFromPersisted(behavior, object.state, now),
      baseTextureKey: sprite.texture.key,
      baseFrameName: this.currentFrameName(sprite),
      loaded: new Map(),
      loading: new Set(),
      lastFrameKey: "",
    };

    this.entries.set(object.roomItemId, entry);
    this.render(entry, now);
    this.prefetchDestination(entry);
    return true;
  }

  /** ¿Este objeto lo lleva el animator? */
  has(roomItemId: string): boolean {
    return this.entries.has(roomItemId);
  }

  /**
   * ¿El behavior de este objeto declara alguna transición para ese trigger?
   *
   * Lo consulta RoomItemsManager para decidir si un click sobre el sprite debe
   * pedir una interacción o abrir el menú de siempre. Responde sobre el
   * behavior YA parseado, sin volver a leer el JSON.
   *
   * Ojo con qué pregunta es: "¿este objeto reacciona al click?", NO "¿hay
   * transición desde el estado actual?". Lo segundo lo decide el servidor —
   * que es quien conoce el estado de verdad — y si no la hay responde
   * `changed: false` y no pasa nada.
   */
  respondsToTrigger(roomItemId: string, trigger: WorldTrigger): boolean {
    const entry = this.entries.get(roomItemId);
    return entry ? hasTrigger(entry.behavior, trigger) : false;
  }

  /**
   * Aplica lo que difundió el servidor en `room:item:state`.
   *
   * `update.at` es el instante del SERVIDOR, así que un evento que llega tarde
   * NO reinicia la animación: se reanuda por donde va. Y si ya terminó, se
   * salta directamente al estado final.
   */
  applyRemoteState(roomItemId: string, update: RemoteStateUpdate, now: number): void {
    const entry = this.entries.get(roomItemId);
    if (!entry) return;

    entry.runtime = applyRemoteState(entry.behavior, entry.runtime, update, now);
    this.render(entry, now);
    this.prefetchDestination(entry);
  }

  /**
   * Re-sincroniza desde el `RoomItem.state` crudo (tras mover, rotar o
   * cualquier refresco que no sea una interacción).
   */
  applyState(roomItemId: string, rawState: unknown, now: number): void {
    const entry = this.entries.get(roomItemId);
    if (!entry) return;

    entry.runtime = createRuntimeFromPersisted(entry.behavior, rawState, now);
    this.render(entry, now);
  }

  /**
   * Un tick del bucle de la escena. Sólo recorre los objetos con animación
   * activa.
   */
  update(now: number): void {
    if (this.animating.size === 0) return;

    // Copia de las ids: `render()` puede sacar entradas del set al asentar una
    // transición, y mutar un Set mientras se recorre es pedir problemas.
    for (const roomItemId of [...this.animating]) {
      const entry = this.entries.get(roomItemId);
      if (!entry) {
        this.animating.delete(roomItemId);
        continue;
      }

      // `tick` asienta la transición cuando su animación terminó (aplica el
      // onComplete). Devuelve el MISMO runtime si no hubo cambio.
      entry.runtime = tick(entry.behavior, entry.runtime, now);
      this.render(entry, now);
    }
  }

  /** Baja un objeto (se retiró de la sala, o se destruyó su sprite). */
  unregister(roomItemId: string): void {
    this.entries.delete(roomItemId);
    this.animating.delete(roomItemId);
  }

  destroy(): void {
    this.entries.clear();
    this.animating.clear();
  }

  // ─────────────────────────────── render ───────────────────────────────

  /**
   * Pone en el sprite el frame que corresponde a `now`.
   *
   * Es idempotente y barato: si el frame no cambió no toca el sprite, así que
   * llamarlo cada tick de un loop de 8 fps no hace 60 `setFrame` por segundo.
   */
  private render(entry: Entry, now: number): void {
    const active = activeAnimation(entry.behavior, entry.runtime);

    // Estado quieto: se vuelve al sprite con el que RoomItemsManager dibujó el
    // objeto. No se inventa ninguna animación (PARTE 2/12 del encargo).
    if (!active) {
      this.animating.delete(entry.object.roomItemId);
      this.restoreBase(entry);
      return;
    }

    const animation = active.animation;
    const roomItemId = entry.object.roomItemId;

    /**
     * Decide si el objeto sigue en el bucle.
     *
     * Se llama en TODAS las salidas, incluidas las que no consiguen dibujar.
     * Una transición pendiente tiene que seguir latiendo aunque el atlas falte
     * o esté mal: si no, `tick()` nunca la asienta y el estado lógico del
     * cliente se queda congelado en OFF mientras el servidor —y el resto de
     * los jugadores— ya lo dieron por ON. Poder dibujar y avanzar la máquina
     * son dos cosas distintas.
     */
    const keepTicking = () => {
      if (entry.runtime.playing !== null || animation.framesCount > 1) {
        this.animating.add(roomItemId);
      } else {
        this.animating.delete(roomItemId);
      }
    };

    // Sin atlas propio no hay nada que dibujar con la rejilla nueva: se vuelve
    // al sprite de siempre, como si el estado no tuviera animación.
    if (!animation.spriteSheetUrl) {
      keepTicking();
      this.restoreBase(entry);
      return;
    }

    const textureKey = this.resolveTexture(entry, animation);
    if (!textureKey) {
      // Atlas todavía cargando: se deja lo que hubiera en pantalla y se SIGUE
      // en el bucle para volver a intentarlo. Sin esto, una animación de un
      // solo frame que se registra antes de que llegue su textura no se
      // dibujaría nunca (no habría ningún tick posterior que la recuperara).
      // Cuando llegue se pintará el frame que toque ENTONCES, no el primero,
      // porque el frame sale del reloj.
      this.animating.add(roomItemId);
      return;
    }

    const geometry = this.frameGeometry(entry, animation, textureKey);
    if (!geometry) {
      // El atlas no casa con su metadata: no se puede dibujar (mejor eso que
      // recortar celdas corridas), pero la máquina de estados SÍ tiene que
      // seguir avanzando para no quedarse desincronizada del servidor.
      keepTicking();
      return;
    }

    const { frame } = computeAnimationFrame(animation, now - active.startedAt);
    const cell = animationCell(animation, frame, this.directionIndex(entry, geometry.rows));

    const frameName = `wo-${animation.key}-${cell.row}-${cell.col}`;
    const frameKey = `${textureKey}|${frameName}`;
    if (frameKey === entry.lastFrameKey) return;

    const texture = this.textures.get(textureKey);
    if (!texture.has(frameName)) {
      texture.add(
        frameName,
        0,
        cell.col * geometry.frameWidth,
        cell.row * geometry.frameHeight,
        geometry.frameWidth,
        geometry.frameHeight,
      );
    }

    // setTexture y no sólo setFrame: cada animación tiene su propio atlas.
    if (entry.object.sprite.texture.key !== textureKey) {
      entry.object.sprite.setTexture(textureKey, frameName);
    } else {
      entry.object.sprite.setFrame(frameName);
    }

    entry.lastFrameKey = frameKey;
    keepTicking();
  }

  /**
   * Pide por adelantado el atlas del estado al que lleva la transición en
   * curso.
   *
   * Sin esto se ve un salto justo en el peor momento: al terminar `turn_on`, el
   * atlas de `screen_loop` RECIÉN empezaría a descargarse, así que la TV se
   * quedaría congelada en el último frame de la transición hasta que llegara.
   * Pidiéndolo al arrancar la transición, la textura suele estar lista antes de
   * hacer falta.
   *
   * Sigue siendo carga bajo demanda: sólo se adelanta el atlas del destino
   * concreto, no los ocho del objeto.
   */
  private prefetchDestination(entry: Entry): void {
    const playing = entry.runtime.playing;
    if (playing?.onComplete.action !== "SET_STATE") return;

    const target = resolveState(entry.behavior, playing.onComplete.state);
    const animation = findAnimation(entry.behavior, target.animation);
    if (animation) this.resolveTexture(entry, animation);
  }

  /** Devuelve el sprite a la textura/frame con que nació. */
  private restoreBase(entry: Entry): void {
    if (entry.lastFrameKey === "") return;
    if (!this.textures.exists(entry.baseTextureKey)) return;

    entry.object.sprite.setTexture(entry.baseTextureKey, entry.baseFrameName);
    entry.lastFrameKey = "";
  }

  /**
   * Key de la textura del atlas de esta animación, o null si aún no está.
   *
   * La carga es BAJO DEMANDA: el atlas de `turn_off` no se pide hasta que la
   * TV se apaga por primera vez. Se usa el cargador que ya existe
   * (`loadTextureOnce`), con su deduplicación, sus reintentos y su proxy — acá
   * no se duplica nada de eso.
   */
  private resolveTexture(entry: Entry, animation: WorldAnimation): string | null {
    const url = animation.spriteSheetUrl;
    // Sin atlas propio no hay nada que dibujar con la rejilla nueva; el objeto
    // se queda con su sprite de siempre.
    if (!url) return null;

    const known = entry.loaded.get(url);
    if (known) return known;

    if (!entry.loading.has(url)) {
      entry.loading.add(url);
      void this.loadTexture(url)
        .then((key) => {
          // El objeto pudo retirarse mientras la textura viajaba.
          if (!this.entries.has(entry.object.roomItemId)) return;
          if (key) entry.loaded.set(url, key);
        })
        .catch(() => {
          // Un atlas caído deja al objeto con su sprite estático en vez de
          // romper la sala. Mismo criterio que la carga de muebles.
        })
        .finally(() => entry.loading.delete(url));
    }

    return null;
  }

  /**
   * Tamaño de celda del atlas, DERIVADO de la textura.
   *
   * El generador de Fase 2 produce un atlas por animación: `framesCount`
   * columnas y una fila por dirección. Así que
   *
   *     frameWidth  = ancho  / framesCount
   *     frameHeight = alto   / filas
   *
   * y no hace falta guardar las medidas en el contrato ni asumir que el frame
   * es cuadrado o que todos los objetos miden igual.
   *
   * Si la división no es exacta el atlas no casa con su metadata (item editado
   * a mano, `directions` cambiado después de subir el arte), y se cae a una
   * sola fila en vez de recortar celdas corridas.
   */
  private frameGeometry(
    entry: Entry,
    animation: WorldAnimation,
    textureKey: string,
  ): AtlasGeometry | null {
    const texture = this.textures.get(textureKey);

    // La derivación vive en el paquete compartido, así que el editor y el
    // juego recortan el atlas con la MISMA función. Antes había una copia
    // privada acá; el test de paridad que la vigilaba sigue en pie
    // (apps/web/components/item-editor/behavior-preview.parity.spec.ts) y
    // ahora comprueba que las dos rutas usan una sola implementación.
    return resolveAtlasGeometry(
      animation,
      { width: Number(texture?.width), height: Number(texture?.height) },
      getFaceCount(entry.object.item?.worldData),
    );
  }

  /**
   * Fila del atlas para la orientación actual.
   *
   * Reutiliza `getSpriteFrameIndex()`, que es la MISMA función con la que
   * RoomItemsManager elige la cara del spritesheet de siempre: la rotación
   * lógica 0-3 envuelta al número de caras del item. No se inventa ninguna
   * convención de direcciones nueva ni se toca nada de la geometría
   * isométrica.
   */
  private directionIndex(entry: Entry, rows: number): number {
    if (rows <= 1) return 0;
    const index = getSpriteFrameIndex(entry.object.rotation, entry.object.item?.worldData);
    return Math.min(index, rows - 1);
  }

  /** Nombre del frame actual del sprite, para poder volver a él después. */
  private currentFrameName(sprite: AnimatableSprite): string {
    const frame = (sprite as unknown as { frame?: { name?: string } }).frame;
    return typeof frame?.name === "string" ? frame.name : "__BASE";
  }
}

/** El animator real de la escena trabaja sobre sprites de Phaser. */
export type PhaserAnimatableSprite = Phaser.GameObjects.Sprite & AnimatableSprite;
