"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MousePointerClick, Pause, Play, RotateCcw } from "lucide-react";
import type { WorldBehavior } from "@codebuddies/world-objects";

import {
  advancePreview,
  canPreview,
  createPreviewState,
  describePreview,
  previewFromState,
  PREVIEW_SPEEDS,
  resetPreview,
  setPreviewDirection,
  setPreviewPlaying,
  setPreviewSpeed,
  triggerPreview,
  type PreviewState,
} from "./behavior-preview-state";

/**
 * Preview del comportamiento dentro del editor.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * TODA LA LÓGICA ESTÁ FUERA
 *
 * Este archivo sólo dibuja y recoge clicks. Qué estado hay, qué animación
 * corre y qué frame toca lo decide `behavior-preview-state.ts`, que a su vez
 * delega en @codebuddies/world-objects — el mismo módulo que ejecuta
 * WorldObjectAnimator en la sala. Hay un test que corre las dos
 * implementaciones en paralelo y compara la celda resultante
 * (behavior-preview.parity.spec.ts).
 *
 * Nada de acá toca el exterior: sin WebSocket, sin API, sin base de datos y
 * sin modificar el objeto que se está editando.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * POR QUÉ SE MIDE EL PNG
 *
 * El atlas declara sus columnas y filas a través de su TAMAÑO
 * (`ancho / framesCount`, `alto / filas`), que es exactamente la derivación
 * que hace el juego. Medirlo sirve además para dos cosas más: conservar la
 * proporción real —un sprite de 17×93 no se deforma— y poder distinguir
 * "todavía cargando" de "no se pudo cargar".
 */

type AssetStatus =
  | { state: "loading" }
  | { state: "ready"; width: number; height: number }
  | { state: "error" };

type Props = {
  behavior: WorldBehavior;
  /** Caras del objeto (1 / 2 / 4), para las animaciones direccionales. */
  directions: number;
  /**
   * "Previsualizar este estado" pedido desde la tarjeta de un estado. El
   * `nonce` permite repetir la misma petición: sin él, pedir dos veces el
   * mismo estado no cambiaría nada y la simulación no volvería a arrancar.
   */
  previewRequest?: { stateKey: string; nonce: number } | null;
  labels: {
    title: string;
    state: string;
    animation: string;
    frame: string;
    none: string;
    transition: string;
    test: string;
    play: string;
    pause: string;
    reset: string;
    speed: string;
    direction: string;
    invalid: string;
    noTransition: string;
    loading: string;
    assetError: string;
    retry: string;
    /** Qué significa el botón de probar. */
    testHint: string;
    /** Cabecera del resultado del último click. */
    lastClick: string;
    /** El objeto estaba ocupado en una transición. */
    busy: string;
    /** La animación activa todavía no tiene frames subidos. */
    noSheetYet: string;
  };
};

/**
 * Lado mayor del recuadro. El menor sale de la proporción real del frame.
 *
 * Es el elemento más importante de esta pantalla —probar el objeto es de lo que
 * va todo el editor— así que ocupa más que el resto de la columna.
 */
const BOX = 176;

/** Orden de caras del proyecto: N, E, S, O (ver getSpriteOffset). */
const DIRECTION_LABELS = ["N", "E", "S", "O"];

export default function BehaviorPreview({
  behavior,
  directions,
  previewRequest,
  labels,
}: Props) {
  const valid = useMemo(() => canPreview(behavior), [behavior]);

  const [state, setState] = useState<PreviewState>(() => createPreviewState(behavior));
  const [assets, setAssets] = useState<Record<string, AssetStatus>>({});
  const [reloadToken, setReloadToken] = useState(0);

  // Si cambia la configuración mientras se edita, la simulación vuelve a
  // empezar: seguir corriendo con la máquina vieja confundiría.
  useEffect(() => {
    setState((current) => resetPreview(behavior, current));
  }, [behavior]);

  // Arranque puntual en un estado concreto. No altera el draft: sólo mueve
  // esta simulación.
  const requestNonce = previewRequest?.nonce;
  const requestedState = previewRequest?.stateKey;
  useEffect(() => {
    if (requestNonce === undefined || requestedState === undefined) return;
    setState((current) => previewFromState(behavior, current, requestedState));
  }, [behavior, requestNonce, requestedState]);

  /**
   * Bucle de la simulación.
   *
   * Un solo `requestAnimationFrame` para toda la preview. El delta REAL entre
   * cuadros entra en `advancePreview`, que lo multiplica por la velocidad y
   * sólo lo suma si está reproduciendo — por eso pausar y acelerar no
   * necesitan tocar nada del `WorldBehavior`. El componente sigue siendo puro:
   * durante el render no se lee ningún reloj.
   */
  const frameRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);

  useEffect(() => {
    if (!valid) return undefined;

    const step = (timestamp: number) => {
      const previous = lastTsRef.current;
      lastTsRef.current = timestamp;

      if (previous !== null) {
        const delta = timestamp - previous;
        setState((current) => advancePreview(behavior, current, delta));
      }

      frameRef.current = requestAnimationFrame(step);
    };

    frameRef.current = requestAnimationFrame(step);

    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      lastTsRef.current = null;
    };
  }, [behavior, valid]);

  // Qué animación toca AHORA, sin mirar todavía el atlas: hace falta para
  // saber qué imagen medir.
  const sheetUrl = useMemo(
    () => (valid ? describePreview(behavior, state, null, directions).spriteSheetUrl : null),
    [behavior, state, directions, valid],
  );
  const asset = sheetUrl ? assets[sheetUrl] : undefined;

  useEffect(() => {
    if (!sheetUrl) return undefined;

    let cancelled = false;
    setAssets((current) =>
      current[sheetUrl]?.state === "ready"
        ? current
        : { ...current, [sheetUrl]: { state: "loading" } },
    );

    const image = new Image();
    image.onload = () => {
      if (cancelled) return;
      setAssets((current) => ({
        ...current,
        [sheetUrl]: {
          state: "ready",
          width: image.naturalWidth,
          height: image.naturalHeight,
        },
      }));
    };
    image.onerror = () => {
      if (cancelled) return;
      setAssets((current) => ({ ...current, [sheetUrl]: { state: "error" } }));
    };
    image.src = sheetUrl;

    return () => {
      cancelled = true;
    };
  }, [sheetUrl, reloadToken]);

  if (!valid) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-800 bg-black/40 p-4 text-center text-xs text-zinc-500">
        {labels.invalid}
      </div>
    );
  }

  const size =
    asset?.state === "ready" ? { width: asset.width, height: asset.height } : null;
  const view = describePreview(behavior, state, size, directions);

  // Proporción real del frame: un sprite alto y estrecho se ve alto y estrecho.
  const geometry = view.geometry;
  const ratio = geometry ? geometry.frameWidth / geometry.frameHeight : 1;
  const boxWidth = ratio >= 1 ? BOX : Math.max(16, Math.round(BOX * ratio));
  const boxHeight = ratio >= 1 ? Math.max(16, Math.round(BOX / ratio)) : BOX;

  const cellStyle: React.CSSProperties =
    view.cell && geometry && sheetUrl
      ? {
          backgroundImage: `url(${sheetUrl})`,
          backgroundSize: `${geometry.cols * 100}% ${geometry.rows * 100}%`,
          backgroundPosition: `${
            geometry.cols > 1 ? (view.cell.col / (geometry.cols - 1)) * 100 : 0
          }% ${geometry.rows > 1 ? (view.cell.row / (geometry.rows - 1)) * 100 : 0}%`,
          backgroundRepeat: "no-repeat",
          imageRendering: "pixelated",
        }
      : {};

  const activeDirection = Math.min(state.direction, view.directionCount - 1);

  return (
    <div className="space-y-3 rounded-2xl border border-zinc-800 bg-black/40 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">
        {labels.title}
      </p>

      {/* Tablero de ajedrez detrás: distingue el sprite transparente del fondo
          sin tocar el asset ni añadirle bordes. */}
      <div className="flex justify-center">
        <div
          className="rounded-xl border border-zinc-800 bg-[repeating-conic-gradient(#27272a_0%_25%,#131316_0%_50%)] bg-[length:12px_12px]"
          style={{ width: boxWidth, height: boxHeight, ...cellStyle }}
          aria-hidden
        />
      </div>

      {/* Estado del asset. La simulación sigue corriendo igual: poder dibujar y
          poder avanzar el estado lógico son cosas distintas. */}
      {!sheetUrl && view.animationKey && (
        <p className="text-center text-xs text-zinc-500">{labels.noSheetYet}</p>
      )}
      {sheetUrl && asset?.state === "loading" && (
        <p className="text-center text-xs text-zinc-500">{labels.loading}</p>
      )}
      {sheetUrl && asset?.state === "error" && (
        <p className="text-center text-xs text-red-300">
          {labels.assetError}{" "}
          <button
            type="button"
            onClick={() => setReloadToken((token) => token + 1)}
            className="underline hover:text-red-200"
          >
            {labels.retry}
          </button>
        </p>
      )}

      <div className="flex flex-wrap justify-center gap-2">
        <ControlButton
          icon={<MousePointerClick size={12} />}
          label={labels.test}
          highlighted
          onClick={() => setState((current) => triggerPreview(behavior, current))}
        />
        <ControlButton
          icon={state.playing ? <Pause size={12} /> : <Play size={12} />}
          label={state.playing ? labels.pause : labels.play}
          onClick={() =>
            setState((current) => setPreviewPlaying(current, !current.playing))
          }
        />
        <ControlButton
          icon={<RotateCcw size={12} />}
          label={labels.reset}
          onClick={() => setState((current) => resetPreview(behavior, current))}
        />
      </div>

      {/* Velocidad: sólo afecta al reloj de simulación, nunca al fps guardado. */}
      <div className="flex items-center justify-center gap-2 text-xs">
        <span className="text-zinc-600">{labels.speed}</span>
        {PREVIEW_SPEEDS.map((speed) => (
          <button
            key={speed}
            type="button"
            aria-pressed={state.speed === speed}
            onClick={() => setState((current) => setPreviewSpeed(current, speed))}
            className={`rounded px-2 py-0.5 font-bold transition ${
              state.speed === speed
                ? "bg-yellow-400/20 text-yellow-300"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {speed}x
          </button>
        ))}
      </div>

      {/* Dirección: sólo si la animación tiene de verdad más de una fila. */}
      {view.directionCount > 1 && (
        <div className="flex items-center justify-center gap-2 text-xs">
          <span className="text-zinc-600">{labels.direction}</span>
          {Array.from({ length: view.directionCount }, (_unused, index) => (
            <button
              key={index}
              type="button"
              aria-pressed={activeDirection === index}
              onClick={() => setState((current) => setPreviewDirection(current, index))}
              className={`rounded px-2 py-0.5 font-bold transition ${
                activeDirection === index
                  ? "bg-yellow-400/20 text-yellow-300"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {DIRECTION_LABELS[index] ?? index + 1}
            </button>
          ))}
        </div>
      )}

      <dl aria-live="polite" className="space-y-1 border-t border-zinc-800 pt-3 text-xs">
        <Row label={labels.state}>
          <span className="font-black text-yellow-400">{view.stateKey}</span>
          {view.inTransition && (
            <span className="ml-2 text-zinc-600">({labels.transition})</span>
          )}
        </Row>
        <Row label={labels.animation}>
          <span className="text-zinc-300">{view.animationKey ?? labels.none}</span>
        </Row>
        {view.framesCount > 1 && (
          <Row label={labels.frame}>
            <span className="text-zinc-400">
              {view.frame + 1} / {view.framesCount}
            </span>
          </Row>
        )}
      </dl>

      {/* Qué pasó con el último click, en palabras. Antes un click que
          funcionaba no decía nada (sólo cambiaba el sprite) y uno que no
          funcionaba decía "nada", sin distinguir "no reacciona" de "esperá,
          está en medio de una transición". */}
      {state.lastClick && (
        <p
          role="status"
          className={`rounded-lg border px-3 py-2 text-center text-xs ${
            state.lastClick.ignored
              ? "border-amber-900/60 bg-amber-950/20 text-amber-200"
              : state.lastClick.busy
                ? "border-zinc-800 bg-black/40 text-zinc-400"
                : "border-yellow-400/30 bg-yellow-400/5 text-yellow-200"
          }`}
        >
          {state.lastClick.ignored
            ? labels.noTransition
            : state.lastClick.busy
              ? labels.busy
              : `${labels.lastClick}: ${state.lastClick.from} → ${
                  state.lastClick.via ? `${state.lastClick.via} → ` : ""
                }${state.lastClick.to}`}
        </p>
      )}

      <p className="text-center text-[11px] text-zinc-600">{labels.testHint}</p>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-zinc-600">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}

function ControlButton({
  icon,
  label,
  highlighted,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  highlighted?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
        highlighted
          ? "border-yellow-400/40 text-yellow-300 hover:bg-yellow-400/10"
          : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
      }`}
    >
      {icon} {label}
    </button>
  );
}
