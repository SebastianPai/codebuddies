import { fork, type ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  PYTHON_HARNESS,
  PYTHON_SUSPICIOUS,
  PYTHON_TIMEOUT_MS,
  parsePythonChecks,
  pythonTimeoutRun,
  type PythonRun,
} from '@codebuddies/world-objects';

// Corre programas de Python de alumnos en un proceso aislado (ver
// python-child.ts por las capas de seguridad). Un solo proceso "caliente" que
// atiende de a un programa por vez; si un programa tarda más que el tiempo
// máximo, se mata el proceso y el siguiente arranca uno nuevo. Código que
// intenta tocar el interior de Python corre en un proceso descartable.

const LOAD_TIMEOUT_MS = 30_000;
const IDLE_MS = 10 * 60_000; // sin uso, se cierra (libera ~140 MB)
const MAX_RUNS = 100; // se recicla cada tanto

type Worker = { child: ChildProcess; ready: Promise<void>; runs: number };

function childScript() {
  // En producción (dist/) existe el .js compilado; en tests con ts-jest, el .ts
  // corre con el require de ts-node si está, si no se usa el de dist.
  const js = path.join(__dirname, 'python-child.js');
  if (fs.existsSync(js)) return js;
  const dist = path.resolve(__dirname, '..', '..', '..', 'dist', 'src', 'modules', 'exercise', 'python-child.js');
  if (fs.existsSync(dist)) return dist;
  const dist2 = path.resolve(__dirname, '..', '..', '..', 'dist', 'modules', 'exercise', 'python-child.js');
  return dist2;
}

function permissionArgs(script: string, pyodideDir: string): string[] {
  const flags = process.allowedNodeEnvironmentFlags;
  const flag = flags.has('--permission') ? '--permission' : flags.has('--experimental-permission') ? '--experimental-permission' : null;
  if (!flag) return [];
  // Solo lectura de Pyodide (y su carpeta node_modules, por sus dependencias) y de este script.
  return [flag, `--allow-fs-read=${path.dirname(pyodideDir)}${path.sep}*`, `--allow-fs-read=${script}`];
}

function spawnWorker(): Worker {
  const script = childScript();
  const pyodideDir = fs.realpathSync(path.dirname(require.resolve('pyodide/package.json')));
  const pyodideMain = path.join(pyodideDir, 'pyodide.js');
  const args = permissionArgs(script, pyodideDir);
  const child = fork(script, [pyodideDir + path.sep, pyodideMain], {
    env: {}, // sin variables de entorno: ninguna clave de la API llega acá
    execArgv: ['--max-old-space-size=160', ...args],
    stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
    serialization: 'json',
  });
  const ready = new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Python tardó demasiado en arrancar')), LOAD_TIMEOUT_MS);
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
      reject(new Error(`Python se cerró al arrancar (${code})`));
    });
  });
  child.send({ init: PYTHON_HARNESS });
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

async function runIn(w: Worker, codigo: string, pruebas: string, entradas: string[]): Promise<PythonRun> {
  await w.ready;
  w.runs++;
  const id = randomUUID();
  return new Promise<PythonRun>((resolve) => {
    let done = false;
    const finish = (r: PythonRun) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      w.child.off('message', onMsg);
      w.child.off('exit', onExit);
      resolve(r);
    };
    const timer = setTimeout(() => {
      kill(w); // un while infinito: se corta todo el proceso
      finish(pythonTimeoutRun());
    }, PYTHON_TIMEOUT_MS);
    const onMsg = (m: any) => {
      if (m?.id !== id) return;
      if (m.sucio) {
        if (process.env.PYTHON_DEBUG) console.warn("[python] restaurar falló:", m.sucio);
        w.runs = MAX_RUNS; // el próximo programa usa un proceso nuevo
      }
      try {
        const r = JSON.parse(String(m.out));
        finish({
          ok: Boolean(r.ok),
          salida: String(r.salida ?? '').slice(0, 25_000),
          tipo: r.tipo ? String(r.tipo) : undefined,
          mensaje: r.mensaje ? String(r.mensaje) : undefined,
          linea: typeof r.linea === 'number' ? r.linea : null,
          paso: typeof r.paso === 'boolean' ? r.paso : undefined,
          motivo: r.motivo ? String(r.motivo) : undefined,
        });
      } catch {
        finish({ ok: false, salida: '', tipo: 'Error', mensaje: 'No se pudo leer el resultado' });
      }
    };
    const onExit = () => finish(pythonTimeoutRun());
    w.child.on('message', onMsg);
    w.child.once('exit', onExit);
    w.child.send({ id, codigo, pruebas, entradas });
  });
}

/** Corre un programa de Python con sus pruebas. Nunca lanza: los errores vuelven en el resultado. */
export function runPython(studentCode: string, expectedCode: string): Promise<PythonRun> {
  const { entradas, pruebas } = parsePythonChecks(expectedCode);
  const codigo = String(studentCode ?? '').slice(0, 20_000);
  const job = async (): Promise<PythonRun> => {
    try {
      if (PYTHON_SUSPICIOUS.test(codigo)) {
        // Nunca dos procesos de Python a la vez (cada uno usa ~120 MB y el
        // dyno tiene 512 MB): se cierra el habitual antes del descartable.
        kill(warm);
        warm = null;
        const once = spawnWorker();
        try {
          return await runIn(once, codigo, pruebas, entradas);
        } finally {
          kill(once);
        }
      }
      const w = getWarm();
      touchIdle();
      return await runIn(w, codigo, pruebas, entradas);
    } catch (e) {
      kill(warm);
      warm = null;
      return { ok: false, salida: '', tipo: 'Error', mensaje: `Python no está disponible ahora (${(e as Error).message}). Intenta de nuevo.` };
    }
  };
  const next = queue.then(job, job);
  queue = next.catch(() => undefined);
  return next;
}

/** Para los tests: cierra el proceso de Python. */
export function stopPython() {
  kill(warm);
  warm = null;
  if (idleTimer) clearTimeout(idleTimer);
}
