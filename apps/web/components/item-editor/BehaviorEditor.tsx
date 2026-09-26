"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  Check,
  CircleDot,
  MousePointerClick,
  Plus,
  Trash2,
} from "lucide-react";
import {
  BATHTUB_BEHAVIOR,
  DOOR_BEHAVIOR,
  TV_BEHAVIOR,
  type WorldBehavior,
} from "@codebuddies/world-objects";

import {
  addAnimation,
  addState,
  addTransition,
  availableCompletions,
  BEHAVIOR_LIMITS as LIMITS,
  createEmptyDraft,
  createStarterDraft,
  draftFromTemplate,
  draftKind,
  draftToBehavior,
  hasTransitionFor,
  removeAnimation,
  removeState,
  removeTransition,
  updateAnimation,
  updateState,
  updateTransition,
  type BehaviorDraft,
  type DraftCompletionAction,
} from "./behavior-draft";
import {
  describeAnimationDeletion,
  describeClickOutcome,
  describeDisableImpact,
  describeStateCard,
  describeStateDeletion,
  errorsForRow,
  nextStep,
  readiness,
  summarizeBehavior,
  type ClickOutcome,
  type DeletionImpact,
  type Notice,
} from "./behavior-guidance";
import BehaviorPreview from "./BehaviorPreview";
import FrameSetUpload from "./FrameSetUpload";
import AtlasSheetPreview from "./AtlasSheetPreview";

/**
 * Sección "Comportamiento" del editor de items.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ES UN FORMULARIO, NO UN SEGUNDO MODELO
 *
 * Todo lo que decide algo vive fuera de React y con tests:
 * `behavior-draft.ts` (el modelo de edición), `behavior-guidance.ts` (qué se le
 * explica al creador) y `validateBehavior()` del paquete compartido (la
 * validación de verdad, la misma que aplica la API). Este archivo sólo dibuja y
 * llama a esas funciones: no tiene ni una regla propia, y por eso no puede
 * desincronizarse del contrato que ejecutan la API y el juego.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * VOCABULARIO
 *
 * El creador lee "Al hacer click", "Al terminar", "Ir a estado". Los nombres
 * del contrato (PLAY_ANIMATION, onComplete, WorldTransition) no aparecen en
 * pantalla: son el formato de salida, no la interfaz.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * DOS PREGUNTAS DISTINTAS
 *
 *   ¿es válido?  → lo responde el validador compartido. Si no, no se guarda.
 *   ¿está listo? → lo responde `readiness()`. Un objeto puede ser válido y
 *                  todavía no verse en la sala (una animación sin frames
 *                  subidos, por ejemplo). Eso se avisa, pero NO bloquea el
 *                  guardado: guardar a medias tiene que poder hacerse.
 */

type TFn = (key: string, params?: Record<string, string | number>) => string;

type Props = {
  draft: BehaviorDraft;
  onChange: (draft: BehaviorDraft) => void;
  /** Prefijo de almacenamiento de los atlas. */
  assetFolderId: string;
  /** Caras del objeto (1 / 2 / 4), para las animaciones direccionales. */
  directions: number;
  readOnly?: boolean;
  t: TFn;
};

const fieldClass =
  "w-full rounded-xl border border-zinc-800 bg-black/70 px-3 py-2 text-sm text-white outline-none transition focus:border-yellow-400";

const KIND_STYLES: Record<string, string> = {
  STATIC: "border-zinc-700 text-zinc-400",
  ANIMATED: "border-sky-500/40 text-sky-300",
  INTERACTIVE: "border-yellow-400/40 text-yellow-300",
};

const TEMPLATES: Array<{ labelKey: string; behavior: WorldBehavior }> = [
  { labelKey: "items.behaviorTemplateTv", behavior: TV_BEHAVIOR },
  { labelKey: "items.behaviorTemplateDoor", behavior: DOOR_BEHAVIOR },
  { labelKey: "items.behaviorTemplateBathtub", behavior: BATHTUB_BEHAVIOR },
];

/**
 * Confirmación pendiente.
 *
 * Los cuatro botones destructivos del editor (borrar estado, borrar animación,
 * volver a estático, aplicar plantilla) se llevan por delante cosas que están
 * en OTRA parte de la pantalla, así que preguntan antes y muestran qué se
 * pierde. El cálculo de "qué se pierde" no se deduce acá: lo hace
 * `behavior-guidance.ts` ejecutando el mutador real.
 */
type Pending =
  | { kind: "state"; id: string }
  | { kind: "animation"; id: string }
  | { kind: "disable" }
  | { kind: "template"; index: number }
  | null;

export default function BehaviorEditor({
  draft,
  onChange,
  assetFolderId,
  directions,
  readOnly,
  t,
}: Props) {
  /**
   * Petición de "previsualizar este estado" desde la tarjeta de un estado.
   *
   * Lleva un contador porque pedir DOS veces el mismo estado debe volver a
   * arrancar la simulación; sólo con la clave, React no vería ningún cambio.
   * Es temporal y local: no toca `initialState` ni nada del draft.
   */
  const [previewRequest, setPreviewRequest] = useState<{
    stateKey: string;
    nonce: number;
  } | null>(null);

  const [pending, setPending] = useState<Pending>(null);

  const setPreviewState = (stateKey: string) =>
    setPreviewRequest((current) => ({
      stateKey,
      nonce: (current?.nonce ?? 0) + 1,
    }));

  const status = readiness(draft);
  const step = nextStep(draft);
  const kind = draftKind(draft);
  const stateKeys = draft.states.map((state) => state.key);

  /** Avisos que no cuelgan de ninguna fila (se muestran en la cabecera). */
  const globalNotices = status.notices.filter((notice) => notice.row === null);

  const noticesFor = (rowKind: "state" | "animation", id: string): Notice[] =>
    status.notices.filter(
      (notice) => notice.row?.kind === rowKind && notice.row.id === id,
    );

  const commit = (next: BehaviorDraft) => {
    setPending(null);
    onChange(next);
  };

  return (
    <section className="rounded-3xl border border-zinc-800 bg-black/40 p-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-black text-white">{t("items.behaviorTitle")}</h3>
          <p className="mt-1 text-sm text-zinc-500">{t("items.behaviorDescription")}</p>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-xs font-black tracking-wide ${KIND_STYLES[kind]}`}
        >
          {t(`items.behaviorKind${kind}`)}
        </span>
      </header>

      {/* ── interruptor estático / con comportamiento ── */}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={readOnly}
          aria-pressed={!draft.enabled}
          onClick={() => {
            // Apagar borra estados, animaciones y transiciones de una vez: si
            // hay algo configurado, se pregunta antes.
            if (describeDisableImpact(draft).harmless) commit(createEmptyDraft());
            else setPending({ kind: "disable" });
          }}
          className={`rounded-xl border px-4 py-2 text-sm font-bold transition ${
            !draft.enabled
              ? "border-yellow-400 bg-yellow-400/10 text-yellow-300"
              : "border-zinc-800 text-zinc-400 hover:border-zinc-600"
          }`}
        >
          {t("items.behaviorStaticOption")}
        </button>
        <button
          type="button"
          disabled={readOnly}
          aria-pressed={draft.enabled}
          onClick={() => onChange(draft.enabled ? draft : createStarterDraft())}
          className={`rounded-xl border px-4 py-2 text-sm font-bold transition ${
            draft.enabled
              ? "border-yellow-400 bg-yellow-400/10 text-yellow-300"
              : "border-zinc-800 text-zinc-400 hover:border-zinc-600"
          }`}
        >
          {t("items.behaviorEnabledOption")}
        </button>
      </div>

      {pending?.kind === "disable" && (
        <ConfirmPanel
          title={t("items.behaviorDisableConfirm")}
          lines={[
            t("items.behaviorDisableBody", {
              states: describeDisableImpact(draft).states,
              animations: describeDisableImpact(draft).animations,
              transitions: describeDisableImpact(draft).transitions,
            }),
          ]}
          confirmLabel={t("items.behaviorDisableConfirmButton")}
          cancelLabel={t("items.behaviorCancel")}
          onConfirm={() => commit(createEmptyDraft())}
          onCancel={() => setPending(null)}
        />
      )}

      {!draft.enabled ? (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-zinc-600">{t("items.behaviorStaticHint")}</p>
          <p className="text-xs text-zinc-600">{t("items.behaviorStaticWhen")}</p>
        </div>
      ) : (
        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          {/* ══════════════ columna de edición ══════════════ */}
          <div className="min-w-0 space-y-6">
            {/* ── semáforo + próximo paso ── */}
            <StatusPanel
              level={status.level}
              step={step}
              checklist={status.checklist}
              generalErrors={status.grouped.general}
              notices={globalNotices}
              t={t}
            />

            {/* ── plantillas ── */}
            {!readOnly && (
              <div className="space-y-2">
                <p className="text-xs text-zinc-500">{t("items.behaviorTemplates")}</p>
                <div className="flex flex-wrap gap-2 text-xs">
                  {TEMPLATES.map((template, index) => {
                    const summary = summarizeBehavior(template.behavior);
                    return (
                      <button
                        key={template.labelKey}
                        type="button"
                        onClick={() => {
                          // Reemplaza TODO. Sólo se pregunta si hay algo que perder.
                          if (describeDisableImpact(draft).harmless) {
                            commit(draftFromTemplate(template.behavior));
                          } else {
                            setPending({ kind: "template", index });
                          }
                        }}
                        className="rounded-lg border border-zinc-700 px-3 py-1.5 text-left font-bold text-zinc-300 transition hover:border-yellow-400 hover:text-yellow-300"
                      >
                        {t(template.labelKey)}
                        <span className="mt-0.5 block text-[11px] font-normal text-zinc-600">
                          {t("items.behaviorTemplateSummary", {
                            states: summary.states,
                            animations: summary.animations,
                            transitions: summary.transitions,
                          })}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-zinc-600">
                  {t("items.behaviorTemplatesHint")}
                </p>

                {pending?.kind === "template" && (
                  <ConfirmPanel
                    title={t("items.behaviorTemplateConfirm", {
                      name: t(TEMPLATES[pending.index].labelKey),
                    })}
                    lines={[t("items.behaviorTemplateConfirmBody")]}
                    confirmLabel={t("items.behaviorTemplateConfirmButton")}
                    cancelLabel={t("items.behaviorCancel")}
                    onConfirm={() =>
                      commit(draftFromTemplate(TEMPLATES[pending.index].behavior))
                    }
                    onCancel={() => setPending(null)}
                  />
                )}
              </div>
            )}

            {/* ══════════════ ESTADOS ══════════════ */}
            <div className="space-y-3">
              <SectionHeader
                title={t("items.behaviorStates")}
                hint={t("items.behaviorStatesHint")}
                count={`${draft.states.length}/${LIMITS.maxStates}`}
              />

              {draft.states.length === 0 && (
                <EmptyHint text={t("items.behaviorNoStatesEmpty")} />
              )}

              <div className="grid gap-3 md:grid-cols-2">
                {draft.states.map((state) => {
                  const info = describeStateCard(draft, state);
                  const errors = errorsForRow(
                    draft,
                    status.grouped,
                    "state",
                    state.id,
                  );
                  const notices = noticesFor("state", state.id);
                  const confirming =
                    pending?.kind === "state" && pending.id === state.id;

                  return (
                    <article
                      key={state.id}
                      className={`space-y-3 rounded-2xl border bg-black/50 p-4 ${
                        errors.length > 0
                          ? "border-red-900"
                          : notices.length > 0
                            ? "border-amber-900/60"
                            : "border-zinc-800"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <label className="min-w-0 flex-1">
                          <span className="sr-only">
                            {t("items.behaviorStateNameLabel")}
                          </span>
                          <input
                            value={state.key}
                            disabled={readOnly}
                            onChange={(event) =>
                              onChange(
                                updateState(draft, state.id, {
                                  key: event.target.value,
                                }),
                              )
                            }
                            className={`${fieldClass} font-black uppercase`}
                            placeholder={t("items.behaviorStateNamePlaceholder")}
                          />
                        </label>
                        {!readOnly && (
                          <IconButton
                            label={t("items.behaviorRemoveState", {
                              key: state.key,
                            })}
                            onClick={() => {
                              const impact = describeStateDeletion(draft, state.id);
                              if (impact?.harmless) commit(removeState(draft, state.id));
                              else setPending({ kind: "state", id: state.id });
                            }}
                          />
                        )}
                      </div>

                      {info.isInitial && (
                        <p className="flex items-center gap-1 text-xs font-bold text-yellow-400/80">
                          <CircleDot size={12} /> {t("items.behaviorIsInitial")}
                        </p>
                      )}

                      <label className="block">
                        <span className="mb-1 block text-xs text-zinc-500">
                          {t("items.behaviorStateAnimation")}
                        </span>
                        <select
                          value={state.animation ?? ""}
                          disabled={readOnly}
                          onChange={(event) =>
                            onChange(
                              updateState(draft, state.id, {
                                animation: event.target.value || null,
                              }),
                            )
                          }
                          className={fieldClass}
                        >
                          <option value="">{t("items.behaviorNoAnimation")}</option>
                          {draft.animations.map((animation) => (
                            <option key={animation.id} value={animation.key}>
                              {animation.key}
                            </option>
                          ))}
                        </select>
                      </label>

                      {/* Lo que pasa al hacer click, EN la tarjeta del estado:
                          antes había que bajar a la sección de transiciones y
                          cruzar las dos listas a mano. */}
                      <div className="rounded-xl border border-zinc-800/80 bg-black/40 px-3 py-2">
                        <p className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-zinc-600">
                          <MousePointerClick size={11} /> {t("items.behaviorOnClick")}
                        </p>
                        <p className="mt-1 text-xs text-zinc-300">
                          {describeOutcome(info.onClick, t)}
                        </p>
                      </div>

                      {info.reachableFrom.length > 0 && (
                        <p className="text-[11px] text-zinc-600">
                          {t("items.behaviorReachableFrom", {
                            states: info.reachableFrom.join(", "),
                          })}
                        </p>
                      )}

                      {notices.map((notice) => (
                        <NoticeLine
                          key={notice.code}
                          text={t(`items.behaviorNotice${notice.code}`)}
                        />
                      ))}

                      {errors.map((error) => (
                        <p key={error} className="text-xs text-red-300">
                          {error}
                        </p>
                      ))}

                      <button
                        type="button"
                        onClick={() => setPreviewState(state.key)}
                        className="text-xs font-bold text-zinc-500 underline-offset-2 hover:text-yellow-300 hover:underline"
                      >
                        {t("items.behaviorPreviewThisState")}
                      </button>

                      {confirming && (
                        <ConfirmPanel
                          title={t("items.behaviorDeleteStateConfirm", {
                            key: state.key,
                          })}
                          lines={impactLines(describeStateDeletion(draft, state.id), t)}
                          confirmLabel={t("items.behaviorDeleteConfirmButton")}
                          cancelLabel={t("items.behaviorCancel")}
                          onConfirm={() => commit(removeState(draft, state.id))}
                          onCancel={() => setPending(null)}
                        />
                      )}
                    </article>
                  );
                })}
              </div>

              {!readOnly && draft.states.length < LIMITS.maxStates && (
                <AddButton
                  label={t("items.behaviorAddState")}
                  onClick={() => onChange(addState(draft))}
                />
              )}
            </div>

            {/* ══════════════ ANIMACIONES ══════════════ */}
            <div className="space-y-3">
              <SectionHeader
                title={t("items.behaviorAnimations")}
                hint={t("items.behaviorAnimationsHint")}
                count={`${draft.animations.length}/${LIMITS.maxAnimations}`}
              />

              {draft.animations.length === 0 && (
                <EmptyHint text={t("items.behaviorNoAnimationsEmpty")} />
              )}

              <div className="space-y-3">
                {draft.animations.map((animation) => {
                  const errors = errorsForRow(
                    draft,
                    status.grouped,
                    "animation",
                    animation.id,
                  );
                  const notices = noticesFor("animation", animation.id);
                  const confirming =
                    pending?.kind === "animation" && pending.id === animation.id;

                  const usedBy = [
                    ...draft.states
                      .filter((state) => state.animation === animation.key)
                      .map((state) => state.key),
                    ...draft.transitions
                      .filter((transition) => transition.animation === animation.key)
                      .map((transition) =>
                        t("items.behaviorUsedByClick", { state: transition.fromState }),
                      ),
                  ];

                  return (
                    <article
                      key={animation.id}
                      className={`grid gap-4 rounded-2xl border bg-black/50 p-4 lg:grid-cols-[minmax(0,1fr)_200px] ${
                        errors.length > 0
                          ? "border-red-900"
                          : notices.some((notice) => notice.code !== "ANIMATION_UNUSED")
                            ? "border-amber-900/60"
                            : "border-zinc-800"
                      }`}
                    >
                      <div className="min-w-0 space-y-3">
                        <div className="flex items-start gap-2">
                          <label className="min-w-0 flex-1">
                            <span className="sr-only">
                              {t("items.behaviorAnimationNameLabel")}
                            </span>
                            <input
                              value={animation.key}
                              disabled={readOnly}
                              onChange={(event) =>
                                onChange(
                                  updateAnimation(draft, animation.id, {
                                    key: event.target.value,
                                  }),
                                )
                              }
                              className={`${fieldClass} font-bold`}
                              placeholder={t("items.behaviorAnimationNamePlaceholder")}
                            />
                          </label>
                          {!readOnly && (
                            <IconButton
                              label={t("items.behaviorRemoveAnimation", {
                                key: animation.key,
                              })}
                              onClick={() => {
                                const impact = describeAnimationDeletion(
                                  draft,
                                  animation.id,
                                );
                                if (impact?.harmless) {
                                  commit(removeAnimation(draft, animation.id));
                                } else {
                                  setPending({ kind: "animation", id: animation.id });
                                }
                              }}
                            />
                          )}
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3">
                          <label className="block">
                            <span className="mb-1 block text-xs text-zinc-500">
                              {t("items.behaviorFps")}
                            </span>
                            <input
                              type="number"
                              min={LIMITS.minFps}
                              max={LIMITS.maxFps}
                              value={animation.fps}
                              disabled={readOnly}
                              onChange={(event) =>
                                onChange(
                                  updateAnimation(draft, animation.id, {
                                    fps: Number(event.target.value),
                                  }),
                                )
                              }
                              className={fieldClass}
                            />
                          </label>

                          <Toggle
                            label={t("items.behaviorLoop")}
                            hint={t("items.behaviorLoopHint")}
                            checked={animation.loop}
                            disabled={readOnly}
                            onChange={(loop) =>
                              onChange(updateAnimation(draft, animation.id, { loop }))
                            }
                          />

                          {/* Un objeto de una sola cara no tiene nada que girar.
                              Antes el checkbox aparecía deshabilitado sin decir
                              por qué. */}
                          <Toggle
                            label={t("items.behaviorDirectional")}
                            hint={
                              directions <= 1
                                ? t("items.behaviorDirectionalLocked")
                                : t("items.behaviorDirectionalHint")
                            }
                            checked={animation.directional}
                            disabled={readOnly || directions <= 1}
                            onChange={(directional) =>
                              onChange(
                                updateAnimation(draft, animation.id, { directional }),
                              )
                            }
                          />
                        </div>

                        <p className="text-xs text-zinc-600">
                          {animation.spriteSheetUrl
                            ? t("items.behaviorFramesSummary", {
                                frames: animation.framesCount,
                                fps: animation.fps,
                              })
                            : t("items.behaviorFramesPending")}
                        </p>

                        <p className="text-[11px] text-zinc-600">
                          {usedBy.length > 0
                            ? t("items.behaviorAnimationUsedBy", {
                                items: usedBy.join(", "),
                              })
                            : t("items.behaviorAnimationUsedByNobody")}
                        </p>

                        {notices.map((notice) => (
                          <NoticeLine
                            key={notice.code}
                            text={t(`items.behaviorNotice${notice.code}`)}
                          />
                        ))}

                        {errors.map((error) => (
                          <p key={error} className="text-xs text-red-300">
                            {error}
                          </p>
                        ))}

                        {!readOnly && (
                          <FrameSetUpload
                            itemId={assetFolderId}
                            animationKey={animation.key || "animacion"}
                            directions={animation.directional ? directions : 1}
                            hasSheet={Boolean(animation.spriteSheetUrl)}
                            onUploaded={(metadata) =>
                              onChange(
                                updateAnimation(draft, animation.id, {
                                  spriteSheetUrl: metadata.url,
                                  framesCount: metadata.framesCount,
                                  directional: metadata.directional,
                                  row: 0,
                                  startCol: 0,
                                }),
                              )
                            }
                            labels={{
                              drop: t("items.behaviorFramesDrop"),
                              hint: t("items.behaviorFramesHint"),
                              uploading: t("items.behaviorFramesUploading"),
                              framesSelected: t("items.behaviorFramesSelected"),
                              upload: t("items.behaviorFramesUpload"),
                              clear: t("items.behaviorFramesClear"),
                              expected: t("items.behaviorFramesExpected"),
                              missing: t("items.behaviorFramesMissing"),
                              tooMany: t("items.behaviorFramesTooMany", {
                                max: LIMITS.maxFramesPerAnimation,
                              }),
                              done: t("items.behaviorFramesDone"),
                              replace: t("items.behaviorFramesReplace"),
                              order: t("items.behaviorFramesOrder"),
                            }}
                          />
                        )}

                        {confirming && (
                          <ConfirmPanel
                            title={t("items.behaviorDeleteAnimationConfirm", {
                              key: animation.key,
                            })}
                            lines={impactLines(
                              describeAnimationDeletion(draft, animation.id),
                              t,
                            )}
                            confirmLabel={t("items.behaviorDeleteConfirmButton")}
                            cancelLabel={t("items.behaviorCancel")}
                            onConfirm={() => commit(removeAnimation(draft, animation.id))}
                            onCancel={() => setPending(null)}
                          />
                        )}
                      </div>

                      {/* La hoja de la animación con las proporciones REALES del
                          PNG (se mide y se deriva la celda con la misma función
                          que usan la prueba y el juego). */}
                      <AtlasSheetPreview
                        url={animation.spriteSheetUrl}
                        framesCount={animation.framesCount}
                        directional={animation.directional}
                        directions={directions}
                        fps={animation.fps}
                        labels={{
                          empty: t("items.behaviorNoSheet"),
                          loading: t("items.behaviorPreviewLoading"),
                          error: t("items.behaviorPreviewAssetError"),
                        }}
                      />
                    </article>
                  );
                })}
              </div>

              {!readOnly && draft.animations.length < LIMITS.maxAnimations && (
                <AddButton
                  label={t("items.behaviorAddAnimation")}
                  onClick={() => onChange(addAnimation(draft))}
                />
              )}
            </div>

            {/* ══════════════ TRANSICIONES ══════════════ */}
            <div className="space-y-3">
              <SectionHeader
                title={t("items.behaviorTransitions")}
                hint={t("items.behaviorTransitionsHint")}
                count={`${draft.transitions.length}/${LIMITS.maxTransitions}`}
              />

              {draft.transitions.length === 0 && (
                <EmptyHint text={t("items.behaviorNoTransitionsEmpty")} />
              )}

              <div className="grid gap-3 lg:grid-cols-2">
                {draft.transitions.map((transition) => {
                  const completions = availableCompletions(draft, transition.animation);
                  const duplicated = hasTransitionFor(
                    draft,
                    transition.fromState,
                    transition.id,
                  );
                  const errors = errorsForRow(
                    draft,
                    status.grouped,
                    "transition",
                    transition.id,
                  );

                  return (
                    <article
                      key={transition.id}
                      className={`space-y-3 rounded-2xl border bg-black/50 p-4 ${
                        duplicated || errors.length > 0
                          ? "border-red-900"
                          : "border-zinc-800"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span className="flex items-center gap-1 rounded-full border border-yellow-400/30 px-3 py-0.5 text-xs font-black text-yellow-300">
                            <MousePointerClick size={11} />
                            {t("items.behaviorOnClick")}
                          </span>
                          {/* La frase completa, arriba: el creador la lee antes
                              de mirar los selectores. */}
                          <p className="mt-2 text-xs text-zinc-400">
                            {transition.fromState
                              ? t("items.behaviorTransitionSentence", {
                                  from: transition.fromState,
                                  outcome: describeOutcome(
                                    describeClickOutcome(transition),
                                    t,
                                  ),
                                })
                              : t("items.behaviorTransitionNoFrom")}
                          </p>
                        </div>
                        {!readOnly && (
                          <IconButton
                            label={t("items.behaviorRemoveTransition", {
                              state: transition.fromState,
                            })}
                            onClick={() =>
                              onChange(removeTransition(draft, transition.id))
                            }
                          />
                        )}
                      </div>

                      <Select
                        label={t("items.behaviorFromState")}
                        value={transition.fromState}
                        disabled={readOnly}
                        options={stateKeys.map((key) => ({ value: key, label: key }))}
                        onChange={(fromState) =>
                          onChange(updateTransition(draft, transition.id, { fromState }))
                        }
                      />

                      {duplicated && (
                        <p className="text-xs text-red-300">
                          {t("items.behaviorDuplicatedTransition")}
                        </p>
                      )}

                      <Arrow />

                      <Select
                        label={t("items.behaviorAction")}
                        value={transition.action}
                        disabled={readOnly}
                        options={[
                          {
                            value: "PLAY_ANIMATION",
                            label: t("items.behaviorActionPlay"),
                          },
                          { value: "SET_STATE", label: t("items.behaviorActionSetState") },
                        ]}
                        onChange={(action) =>
                          onChange(
                            updateTransition(draft, transition.id, {
                              action: action as "PLAY_ANIMATION" | "SET_STATE",
                            }),
                          )
                        }
                      />

                      {transition.action === "PLAY_ANIMATION" ? (
                        <>
                          <Select
                            label={t("items.behaviorAnimation")}
                            value={transition.animation ?? ""}
                            disabled={readOnly}
                            options={draft.animations.map((animation) => ({
                              value: animation.key,
                              label: animation.key,
                            }))}
                            onChange={(animation) =>
                              onChange(
                                updateTransition(draft, transition.id, { animation }),
                              )
                            }
                          />

                          <Arrow />

                          <Select
                            label={t("items.behaviorOnComplete")}
                            value={transition.onComplete}
                            disabled={readOnly}
                            options={completions.map((completion) => ({
                              value: completion,
                              label: t(`items.behaviorComplete${completion}`),
                            }))}
                            onChange={(onComplete) =>
                              onChange(
                                updateTransition(draft, transition.id, {
                                  onComplete: onComplete as DraftCompletionAction,
                                }),
                              )
                            }
                          />

                          {/* Una animación en bucle no termina nunca, así que "ir a
                              estado" ni siquiera aparece como opción. */}
                          {transition.onComplete === "SET_STATE" && (
                            <Select
                              label={t("items.behaviorTargetState")}
                              value={transition.targetState ?? ""}
                              disabled={readOnly}
                              options={stateKeys.map((key) => ({
                                value: key,
                                label: key,
                              }))}
                              onChange={(targetState) =>
                                onChange(
                                  updateTransition(draft, transition.id, { targetState }),
                                )
                              }
                            />
                          )}
                        </>
                      ) : (
                        <Select
                          label={t("items.behaviorTargetState")}
                          value={transition.targetState ?? ""}
                          disabled={readOnly}
                          options={stateKeys.map((key) => ({ value: key, label: key }))}
                          onChange={(targetState) =>
                            onChange(
                              updateTransition(draft, transition.id, { targetState }),
                            )
                          }
                        />
                      )}

                      {errors.map((error) => (
                        <p key={error} className="text-xs text-red-300">
                          {error}
                        </p>
                      ))}
                    </article>
                  );
                })}
              </div>

              {!readOnly && draft.transitions.length < LIMITS.maxTransitions && (
                <AddButton
                  label={t("items.behaviorAddTransition")}
                  onClick={() => onChange(addTransition(draft))}
                />
              )}
            </div>
          </div>

          {/* ══════════════ columna de prueba ══════════════
              Pegada arriba: probar el objeto es el centro de esta pantalla, y
              antes quedaba al final del formulario, fuera de la vista mientras
              se editaban los estados. */}
          <div className="xl:sticky xl:top-4 xl:self-start">
            <BehaviorPreview
              behavior={draftToBehavior(draft)}
              directions={directions}
              previewRequest={previewRequest}
              labels={{
                title: t("items.behaviorPreview"),
                state: t("items.behaviorPreviewState"),
                animation: t("items.behaviorPreviewAnimation"),
                frame: t("items.behaviorPreviewFrame"),
                none: t("items.behaviorNoAnimation"),
                transition: t("items.behaviorPreviewInTransition"),
                test: t("items.behaviorPreviewTest"),
                testHint: t("items.behaviorPreviewTestHint"),
                play: t("items.behaviorPreviewPlay"),
                pause: t("items.behaviorPreviewPause"),
                reset: t("items.behaviorPreviewReset"),
                speed: t("items.behaviorPreviewSpeed"),
                direction: t("items.behaviorPreviewDirection"),
                invalid: t("items.behaviorPreviewUnavailable"),
                noTransition: t("items.behaviorPreviewNoTransition"),
                loading: t("items.behaviorPreviewLoading"),
                assetError: t("items.behaviorPreviewAssetError"),
                retry: t("items.behaviorPreviewRetry"),
                lastClick: t("items.behaviorPreviewLastClick"),
                busy: t("items.behaviorPreviewBusy"),
                noSheetYet: t("items.behaviorPreviewNoSheetYet"),
              }}
            />
          </div>
        </div>
      )}
    </section>
  );
}

// ───────────────────────── traducción de lo derivado ─────────────────────────

/**
 * La frase de "qué pasa al hacer click".
 *
 * El QUÉ lo decide `describeClickOutcome()` (con tests); acá sólo se elige la
 * clave de i18n y se le pasan los parámetros.
 */
function describeOutcome(outcome: ClickOutcome | null, t: TFn): string {
  if (!outcome) return t("items.behaviorClickNone");

  switch (outcome.kind) {
    case "GO_TO":
      return t("items.behaviorClickGoTo", { state: outcome.state });
    case "PLAY_THEN_GO":
      return t("items.behaviorClickPlayThenGo", {
        animation: outcome.animation,
        state: outcome.state,
      });
    case "PLAY_THEN_BACK":
      return t("items.behaviorClickPlayThenBack", { animation: outcome.animation });
    case "PLAY_FOREVER":
      return t("items.behaviorClickPlayForever", { animation: outcome.animation });
    default:
      return t("items.behaviorClickIncomplete");
  }
}

/** Las consecuencias de un borrado, ya traducidas. */
function impactLines(impact: DeletionImpact | null, t: TFn): string[] {
  if (!impact) return [];

  const lines: string[] = [];

  if (impact.removedTransitions > 0) {
    lines.push(
      t("items.behaviorDeleteAlsoTransitions", { count: impact.removedTransitions }),
    );
  }
  if (impact.statesLosingAnimation.length > 0) {
    lines.push(
      t("items.behaviorDeleteAlsoStates", {
        states: impact.statesLosingAnimation.join(", "),
      }),
    );
  }
  if (impact.newInitialState) {
    lines.push(t("items.behaviorDeleteNewInitial", { state: impact.newInitialState }));
  }
  if (impact.leavesNoStates) {
    lines.push(t("items.behaviorDeleteNoStates"));
  }

  return lines;
}

// ───────────────────────────── piezas de UI ─────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  STATIC: "border-zinc-800 bg-black/40 text-zinc-400",
  INVALID: "border-red-900 bg-red-950/30 text-red-200",
  INCOMPLETE: "border-amber-900/60 bg-amber-950/20 text-amber-200",
  READY: "border-emerald-900/50 bg-emerald-950/20 text-emerald-200",
};

/**
 * El semáforo del comportamiento.
 *
 * Distingue las dos preguntas a propósito: los errores del validador impiden
 * guardar, los avisos sólo dicen que en la sala todavía no se vería bien.
 */
function StatusPanel({
  level,
  step,
  checklist,
  generalErrors,
  notices,
  t,
}: {
  level: string;
  step: string;
  checklist: ReturnType<typeof readiness>["checklist"];
  generalErrors: string[];
  notices: Notice[];
  t: TFn;
}) {
  return (
    <div className={`space-y-3 rounded-2xl border p-4 ${STATUS_STYLES[level]}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-black">{t(`items.behaviorStatus${level}`)}</p>
        <p className="text-xs opacity-80">
          {t("items.behaviorNextStep")}: {t(`items.behaviorStep${step}`)}
        </p>
      </div>

      <p className="text-xs opacity-80">{t(`items.behaviorStatusBody${level}`)}</p>

      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {checklist.map((item) => (
          <li key={item.code} className="flex items-center gap-1">
            {item.done ? (
              <Check size={12} className="text-emerald-400" />
            ) : (
              <CircleDot size={12} className="text-zinc-500" />
            )}
            <span className={item.done ? "opacity-90" : "opacity-60"}>
              {t(`items.behaviorCheck${item.code}`)}
            </span>
            {item.optional && (
              <span className="text-[10px] opacity-50">
                ({t("items.behaviorCheckOptional")})
              </span>
            )}
          </li>
        ))}
      </ul>

      {generalErrors.length > 0 && (
        <ul className="space-y-1 border-t border-white/10 pt-2 text-xs">
          {generalErrors.map((error) => (
            <li key={error}>· {error}</li>
          ))}
        </ul>
      )}

      {notices.map((notice) => (
        <NoticeLine key={notice.code} text={t(`items.behaviorNotice${notice.code}`)} />
      ))}
    </div>
  );
}

function NoticeLine({ text }: { text: string }) {
  return (
    <p className="flex items-start gap-1 text-xs text-amber-300/90">
      <AlertTriangle size={12} className="mt-0.5 shrink-0" />
      <span>{text}</span>
    </p>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <p className="rounded-2xl border border-dashed border-zinc-800 bg-black/30 p-4 text-xs text-zinc-500">
      {text}
    </p>
  );
}

/**
 * Confirmación en la propia tarjeta, con las consecuencias enumeradas.
 *
 * No es un `window.confirm`: hace falta mostrar VARIAS líneas de consecuencias
 * calculadas, y un diálogo del navegador no las formatea ni se puede traducir.
 */
function ConfirmPanel({
  title,
  lines,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: {
  title: string;
  lines: string[];
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      role="alertdialog"
      aria-label={title}
      className="mt-3 space-y-2 rounded-xl border border-red-900/70 bg-red-950/30 p-3"
    >
      <p className="text-xs font-bold text-red-100">{title}</p>
      {lines.length > 0 && (
        <ul className="space-y-0.5 text-[11px] text-red-200/90">
          {lines.map((line) => (
            <li key={line}>· {line}</li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onConfirm}
          className="rounded border border-red-500/60 px-3 py-1 text-xs font-bold text-red-200 transition hover:bg-red-500/10"
        >
          {confirmLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded border border-zinc-700 px-3 py-1 text-xs font-bold text-zinc-300 transition hover:border-zinc-500"
        >
          {cancelLabel}
        </button>
      </div>
    </div>
  );
}

function SectionHeader({
  title,
  hint,
  count,
}: {
  title: string;
  hint: string;
  count: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-zinc-800 pb-2">
      <div>
        <h4 className="text-sm font-black uppercase tracking-wide text-zinc-300">
          {title}
        </h4>
        <p className="text-xs text-zinc-600">{hint}</p>
      </div>
      <span className="text-xs text-zinc-600">{count}</span>
    </div>
  );
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 rounded-xl border border-dashed border-zinc-700 px-4 py-2 text-sm font-bold text-zinc-400 transition hover:border-yellow-400 hover:text-yellow-300"
    >
      <Plus size={14} /> {label}
    </button>
  );
}

function IconButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="shrink-0 rounded-lg border border-zinc-800 p-2 text-red-400 transition hover:border-red-500"
    >
      <Trash2 size={14} />
    </button>
  );
}

function Arrow() {
  return (
    <div className="flex justify-center text-zinc-700" aria-hidden>
      <ArrowDown size={14} />
    </div>
  );
}

function Select({
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-zinc-500">{label}</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className={fieldClass}
      >
        <option value="">—</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Toggle({
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className={`flex flex-col gap-1 ${disabled ? "" : "cursor-pointer"}`}>
      <span className="text-xs text-zinc-500">{label}</span>
      <span className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
          className="mt-0.5 h-4 w-4 accent-yellow-400"
        />
        {hint && <span className="text-[11px] leading-tight text-zinc-600">{hint}</span>}
      </span>
    </label>
  );
}
