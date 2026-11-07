import { fork, type ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { JS_CHECK_HARDEN, JS_CHECK_HELPERS, JS_CHECK_LOCK, JS_CHECK_PRELUDE } from '@codebuddies/world-objects';
import { DOM_BUNDLE } from './dom-bundle';
import type { JsInit, JsJob, JsReply } from './js-child';

// Corre el JavaScript de los alumnos en un proceso aislado (ver js-child.ts
// por las capas de seguridad). Igual que Python: un proceso "caliente" que
// atiende de a un trabajo por vez, se recicla cada tanto y se mata si un
// programa se cuelga (un while infinito dentro de una función async no lo
// corta el timeout de node:vm, lo corta este proceso).

const LOAD_TIMEOUT_MS = 10_000;
const KILL_AFTER_MS = 6_000;
const IDLE_MS = 10 * 60_000;
const MAX_RUNS = 300;
const MAX_CODE = 30_000;

type Worker = { child: ChildProcess; ready: Promise<void>; runs: number };

function childScript() {
  const js = path.join(__dirname, 'js-child.js');
  if (fs.existsSync(js)) return js;
  const dist = path.resolve(__dirname, '..', '..', '..', 'dist', 'src', 'modules', 'exercise', 'js-child.js');
  if (fs.existsSync(dist)) return dist;
  return path.resolve(__dirname, '..', '..', '..', 'dist', 'modules', 'exercise', 'js-child.js');
}

function permissionArgs(script: string): string[] {
  const flags = process.allowedNodeEnvironmentFlags;
  const flag = flags.has('--permission') ? '--permission' : flags.has('--experimental-permission') ? '--experimental-permission' : null;
  if (!flag) return [];
  // Solo puede leer su propio archivo: nada de escribir, ni procesos, ni workers.
  return [flag, `--allow-fs-read=${script}`];
}

function spawnWorker(): Worker {
  const script = childScript();
  const child = fork(script, [], {
    env: {}, // ninguna clave de la API llega acá
    execArgv: ['--max-old-space-size=96', '--disallow-code-generation-from-strings', ...permissionArgs(script)],
    stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
    serialization: 'json',
  });
  const ready = new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('El corrector tardó demasiado en arrancar')), LOAD_TIMEOUT_MS);
    const onMsg = (m: any) => {
      if (m?.ready) {
        clearTimeout(timer);
        child.off('message', onMsg);
        resolve();
      } else if (m?.fatal) {
        clearTimeout(timer);
        reject(new Error(m.fatal));
      }
    };
    child.on('message', onMsg);
    child.once('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`El corrector se cerró al arrancar (${code})`));
    });
  });
  const init: JsInit = { dom: DOM_BUNDLE, prelude: JS_CHECK_PRELUDE, harden: JS_CHECK_HARDEN, lock: JS_CHECK_LOCK, helpers: JS_CHECK_HELPERS };
  child.send(init);
  ready.catch(() => undefined);
  return { child, ready, runs: 0 };
}

let warm: Worker | null = null;
let idleTimer: NodeJS.Timeout | null = null;
let queue: Promise<unknown> = Promise.resolve();

function kill(w: Worker | null) {
  if (!w) return;
  try {
    w.child.kill('SIGKILL');
  } catch {
    /* ya estaba cerrado */
  }
}

function getWarm(): Worker {
  if (!warm || warm.child.exitCode !== null || warm.child.killed || warm.runs >= MAX_RUNS) {
    kill(warm);
    warm = spawnWorker();
    const mine = warm;
    mine.child.once('exit', () => {
      if (warm === mine) warm = null;
    });
  }
  return warm;
}

function touchIdle() {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    kill(warm);
    warm = null;
  }, IDLE_MS);
  idleTimer.unref?.();
}

export const JS_TIMEOUT_MESSAGE = 'Script execution timed out after 2000ms';

async function runIn(w: Worker, job: JsJob): Promise<JsReply> {
  await w.ready;
  w.runs++;
  return new Promise<JsReply>((resolve) => {
    let done = false;
    const finish = (r: JsReply) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      w.child.off('message', onMsg);
      w.child.off('exit', onExit);
      resolve(r);
    };
    const timer = setTimeout(() => {
      kill(w);
      finish({ id: job.id, ok: false, error: JS_TIMEOUT_MESSAGE, logs: [] });
    }, KILL_AFTER_MS);
    const onMsg = (m: any) => {
      if (m?.id !== job.id) return;
      finish({
        id: job.id,
        ok: Boolean(m.ok),
        ...(m.error ? { error: String(m.error).slice(0, 600) } : {}),
        logs: Array.isArray(m.logs) ? m.logs.slice(0, 500).map((l: unknown) => String(l).slice(0, 2000)) : [],
        ...(typeof m.value === 'boolean' ? { value: m.value } : {}),
      });
    };
    // Si el proceso muere (sin memoria, etc.) el alumno ve un error normal.
    const onExit = () => finish({ id: job.id, ok: false, error: 'Tu programa usó demasiada memoria o se colgó', logs: [] });
    w.child.on('message', onMsg);
    w.child.once('exit', onExit);
    w.child.send(job);
  });
}

const clip = (s: string | undefined) => (typeof s === 'string' ? s.slice(0, MAX_CODE) : s);

/** Corre un trabajo de JavaScript en el proceso aislado. Nunca lanza. */
export function runJsJob(input: Omit<JsJob, 'id'>): Promise<JsReply> {
  const job: JsJob = {
    ...input,
    id: randomUUID(),
    student: clip(input.student),
    dom: input.dom === undefined || input.dom === null ? input.dom : clip(input.dom),
  };
  const task = async (): Promise<JsReply> => {
    try {
      const w = getWarm();
      touchIdle();
      return await runIn(w, job);
    } catch (e) {
      kill(warm);
      warm = null;
      return { id: job.id, ok: false, error: `El corrector no está disponible ahora (${(e as Error).message}). Intenta de nuevo.`, logs: [] };
    }
  };
  const next = queue.then(task, task);
  queue = next.catch(() => undefined);
  return next;
}

/** Para los tests y scripts: cierra el proceso. */
export function stopJs() {
  kill(warm);
  warm = null;
  if (idleTimer) clearTimeout(idleTimer);
}
