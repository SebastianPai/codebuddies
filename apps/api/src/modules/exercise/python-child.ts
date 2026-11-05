// Proceso hijo que corre Python (Pyodide) para corregir ejercicios.
//
// SEGURIDAD — lo lanza python-runner.ts así:
//   - sin variables de entorno (acá no hay ninguna clave de la API),
//   - con el modelo de permisos de Node: solo puede LEER los archivos de
//     Pyodide y este archivo; no puede escribir, crear procesos ni workers,
//     ni leer /proc del proceso padre,
//   - se comunica SOLO por el canal IPC (process.send), nunca por stdout, así
//     el programa del alumno no puede escribir un resultado falso,
//   - el padre lo mata si tarda más que el tiempo máximo.
// Además, del lado de Python se bloquean los módulos que dan acceso a
// JavaScript (js, pyodide, ...) y después de cada programa se restauran los
// builtins y los módulos, para que un alumno no afecte la corrección de otro.

type Job = { id: string; codigo: string; pruebas: string; entradas: string[] };

const GUARD = String.raw`
import sys, builtins

_CB_BLOQUEADOS = ("js", "pyodide", "pyodide_js", "_pyodide", "_pyodide_core", "micropip", "pyodide_http", "ctypes", "_ctypes")

class _CbBloqueo:
    def find_spec(self, nombre, path=None, target=None):
        raiz = nombre.split(".")[0]
        if raiz in _CB_BLOQUEADOS:
            raise ImportError("El módulo " + nombre + " no está disponible en este curso.")
        return None
    def find_module(self, nombre, path=None):
        return None

sys.meta_path.insert(0, _CbBloqueo())
for _n in list(sys.modules):
    if _n.split(".")[0] in _CB_BLOQUEADOS:
        del sys.modules[_n]

# Foto del estado limpio: se restaura después de cada programa.
_CB_BUILTINS = dict(builtins.__dict__)
_CB_MODULOS = {n: (m, dict(getattr(m, "__dict__", {}))) for n, m in list(sys.modules.items()) if m is not None and n != "__main__"}

def __cb_restaurar():
    builtins.__dict__.clear()
    builtins.__dict__.update(_CB_BUILTINS)
    for n in list(sys.modules):
        if n not in _CB_MODULOS and n != "__main__":
            del sys.modules[n]
    for n, (m, d) in _CB_MODULOS.items():
        sys.modules[n] = m
        md = getattr(m, "__dict__", None)
        if md is not None and md is not builtins.__dict__:
            try:
                for k in [k for k in md if k not in d]:
                    del md[k]
                md.update(d)
            except Exception:
                pass
    sys.stdout = sys.__stdout__
    sys.stderr = sys.__stderr__
`;

// El padre manda primero { init: arnés } (así este proceso no necesita leer
// nada más que Pyodide) y después los programas.
function waitInit(): Promise<string> {
  return new Promise((resolve) => {
    const on = (m: any) => {
      if (typeof m?.init === 'string') {
        process.off('message', on);
        resolve(m.init);
      }
    };
    process.on('message', on);
  });
}

async function main() {
  const harness = await waitInit();
  // Emscripten pide process.binding('constants') al arrancar, y con el modelo
  // de permisos process.binding está prohibido: se le da solo las constantes.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const nodeFs = require('fs');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const nodeOs = require('os');
  (process as any).binding = (name: string) => {
    if (name === 'constants') return { fs: nodeFs.constants, os: nodeOs.constants };
    throw new Error('process.binding bloqueado');
  };
  const indexURL = process.argv[2];
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { loadPyodide } = require(process.argv[3]);
  const py = await loadPyodide({ indexURL, stdout: () => {}, stderr: () => {} });
  py.setStdin({ stdin: () => null });
  // El arnés guarda sus propias referencias (json.dumps, io.StringIO, ...)
  // ANTES de que corra código de alumnos.
  py.runPython(harness);
  py.runPython(GUARD);
  const correr = py.globals.get('__cb_correr');
  const restaurar = py.globals.get('__cb_restaurar');

  // Ya cargado, Pyodide no necesita red ni nada de Node: se quita lo que
  // podría usar un programa que lograra salir de Python.
  const g = globalThis as any;
  for (const k of ['fetch', 'WebSocket', 'XMLHttpRequest', 'EventSource']) {
    try { delete g[k]; } catch { g[k] = undefined; }
  }
  const p = process as any;
  const send = process.send!.bind(process);
  for (const k of ['_linkedBinding', 'dlopen', 'env']) {
    try { p[k] = undefined; } catch { /* nada */ }
  }

  process.on('message', (job: Job) => {
    let out: string;
    try {
      out = String(correr(String(job.codigo), String(job.pruebas), py.toPy((job.entradas || []).map(String))));
    } catch (e) {
      out = JSON.stringify({ ok: false, salida: '', tipo: 'Error', mensaje: String((e as Error)?.message || e).slice(0, 300) });
    }
    let sucio: string | null = null;
    try {
      restaurar();
    } catch (e) {
      sucio = String((e as Error)?.message || e).slice(-300);
    }
    send({ id: job.id, out, sucio });
    // Si no se pudo dejar limpio, este proceso no atiende a nadie más.
    if (sucio) setTimeout(() => process.exit(0), 10);
  });
  send({ ready: true });
}

main().catch((e) => {
  process.send?.({ fatal: String((e as Error)?.message || e).slice(0, 300) });
  process.exit(1);
});
