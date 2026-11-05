// Python de verdad para el curso "Python con Buddy". Corre con Pyodide (CPython
// compilado a WebAssembly) en el navegador (vista previa) y en la API
// (corrección). Los dos usan EXACTAMENTE este arnés, así el resultado que ve el
// alumno es el mismo que decide el servidor.
//
// Formato de un ejercicio (codes[0].expectedCode, lenguaje "python"):
//   # entradas: ["Ana", "12"]        <- opcional: lo que "escribe" el usuario en input()
//   assert "Hola" in salida, "Tu programa tiene que saludar"
// Las pruebas son Python normal con assert. Tienen a mano:
//   salida  -> todo lo que el programa mostró (texto)
//   lineas  -> esa salida, una línea por elemento (sin espacios al final)
//   codigo  -> el código del alumno (texto)
//   ...y todas las variables y funciones que creó el alumno.

export const PYTHON_LANGUAGE = "python";
export const PYODIDE_VERSION = "0.27.7";
export const PYODIDE_CDN = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;
// Tiempo máximo de un programa (un while que nunca termina se corta acá).
export const PYTHON_TIMEOUT_MS = 4000;

export type PythonRun = {
  ok: boolean;
  salida: string;
  tipo?: string; // NameError, SyntaxError...
  mensaje?: string; // el mensaje original de Python
  linea?: number | null;
  paso?: boolean; // si hubo pruebas: si pasaron
  motivo?: string; // por qué no pasaron
};

/** Separa los datos de input() (primera línea "# entradas: [...]") de las pruebas. */
export function parsePythonChecks(expected: string): { entradas: string[]; pruebas: string } {
  const text = expected || "";
  const m = text.match(/^\s*#\s*entradas\s*:\s*(\[.*\])\s*$/m);
  let entradas: string[] = [];
  if (m) {
    try {
      const parsed = JSON.parse(m[1]);
      if (Array.isArray(parsed)) entradas = parsed.map((v) => String(v));
    } catch {
      entradas = [];
    }
  }
  return { entradas, pruebas: text };
}

// El arnés en Python. Define __cb_correr(codigo, pruebas, entradas) -> JSON.
export const PYTHON_HARNESS = String.raw`
import sys, io, json, traceback, builtins

# Referencias propias, tomadas antes de que corra cualquier programa.
_cb_dumps = json.dumps
_cb_extract = traceback.extract_tb
_cb_compile = compile
_cb_exec = exec
_cb_B = dict(builtins.__dict__)
_CB_MAX = 20000

def _cb_limpiar_builtins():
    builtins.__dict__.clear()
    builtins.__dict__.update(_cb_B)

class _CbSalida:
    def __init__(self):
        self.partes = []
        self.n = 0
    def write(self, s):
        s = _cb_B["str"](s)
        if self.n < _CB_MAX:
            self.partes.append(s[: _CB_MAX - self.n])
        self.n += _cb_B["len"](s)
        return _cb_B["len"](s)
    def flush(self):
        pass
    def getvalue(self):
        return "".join(self.partes)

def __cb_correr(codigo, pruebas, entradas):
    salida = _CbSalida()
    cola = _cb_B["list"](entradas)

    def _input(mensaje=""):
        salida.write(_cb_B["str"](mensaje))
        if not cola:
            raise _cb_B["EOFError"]("__cb_sin_datos")
        dato = _cb_B["str"](cola.pop(0))
        # Como en una terminal: lo que escribe el usuario se ve en pantalla.
        salida.write(dato + "\n")
        return dato

    propios = _cb_B["dict"](_cb_B)
    propios["input"] = _input
    g = {"__name__": "__main__", "__builtins__": propios}
    viejo = sys.__stdout__
    sys.stdout = salida
    error = None
    try:
        _cb_exec(_cb_compile(codigo, "alumno.py", "exec"), g)
    except _cb_B["BaseException"] as e:
        error = e
    finally:
        sys.stdout = viejo
        _cb_limpiar_builtins()
    res = {"ok": True}
    if error is not None:
        tipo = _cb_B["type"](error).__name__
        if _cb_B["isinstance"](error, _cb_B["SyntaxError"]):
            res = {"ok": False, "tipo": tipo, "mensaje": _cb_B["str"](error.msg), "linea": error.lineno}
        else:
            linea = None
            for cuadro in _cb_extract(error.__traceback__):
                if cuadro.filename == "alumno.py":
                    linea = cuadro.lineno
            res = {"ok": False, "tipo": tipo, "mensaje": _cb_B["str"](error)[:300], "linea": linea}
    texto = salida.getvalue()
    if salida.n > _CB_MAX:
        texto += "\n[... la salida es muy larga, se cortó acá]"
    res["salida"] = texto
    if pruebas.strip():
        if not res["ok"]:
            res["paso"] = False
        else:
            h = _cb_B["dict"](g)
            h["__builtins__"] = _cb_B["dict"](_cb_B)
            h["salida"] = texto
            h["lineas"] = [l.rstrip() for l in texto.splitlines()]
            h["codigo"] = codigo
            sys.stdout = _CbSalida()
            fallo = None
            try:
                _cb_exec(_cb_compile(pruebas, "pruebas.py", "exec"), h)
            except _cb_B["BaseException"] as e:
                fallo = e
            finally:
                sys.stdout = viejo
                _cb_limpiar_builtins()
            if fallo is None:
                res["paso"] = True
            elif _cb_B["isinstance"](fallo, _cb_B["AssertionError"]):
                res["paso"] = False
                res["motivo"] = _cb_B["str"](fallo) or "Todavía no es lo que pide el ejercicio."
            else:
                res["paso"] = False
                res["motivo"] = "__cb_error_prueba:" + _cb_B["type"](fallo).__name__ + ": " + _cb_B["str"](fallo)[:200]
    return _cb_dumps(res)
`;

// Errores de Python explicados en palabras simples. "$1" es lo que capturó el patrón.
export const PYTHON_FRIENDLY_ERRORS: Array<{ tipo?: string; pattern: string; message: string }> = [
  { pattern: "__cb_sin_datos", message: "El programa pidió un dato con input(), pero ya no quedan datos para escribir." },
  { pattern: "__cb_tiempo", message: "Tu programa no termina nunca. ¿Hay un while cuya condición nunca se vuelve falsa?" },
  { pattern: "was never closed", message: "Abriste un paréntesis (o corchete) y no lo cerraste." },
  { pattern: "unterminated string literal|EOL while scanning string literal", message: "Falta cerrar las comillas del texto: si abres con \" tienes que cerrar con \"." },
  { pattern: "unterminated triple-quoted string", message: "Abriste un texto con tres comillas y no lo cerraste." },
  { pattern: "unmatched '(\\)|\\]|\\})'", message: "Sobra un «$1»: cerraste algo que nunca abriste." },
  { pattern: "closing parenthesis '(.)' does not match opening parenthesis '(.)'", message: "Cerraste con «$1» pero habías abierto con «$2»." },
  { pattern: "expected ':'", message: "Falta el signo de dos puntos (:) al final de la línea." },
  { pattern: "expected an indented block", message: "Después de los dos puntos (:) las líneas de adentro van con sangría: 4 espacios al principio." },
  { pattern: "unexpected indent", message: "Esta línea tiene espacios de más al principio. Solo llevan sangría las líneas que están dentro de un if, for, while o def." },
  { pattern: "unindent does not match any outer indentation level", message: "La sangría de esta línea no coincide con las de arriba. Usa siempre 4 espacios." },
  { pattern: "Did you mean '==' or ':=' instead of '='", message: "Para comparar se usa == (dos iguales). Un solo = es para guardar en una variable." },
  { pattern: "cannot assign to expression here|cannot assign to literal", message: "A la izquierda del = va el nombre de una variable, por ejemplo: edad = 12." },
  { pattern: "Perhaps you forgot a comma", message: "Parece que falta una coma entre dos cosas." },
  { pattern: "invalid character '(.)'", message: "Hay un carácter raro: «$1». Usa comillas normales (\") y escribe el código en el editor, no lo copies de un documento." },
  { pattern: "Missing parentheses in call to 'print'", message: "print necesita paréntesis: print(\"Hola\")." },
  { pattern: "invalid syntax", message: "Python no entiende esta línea. Revisa las comillas, los paréntesis y los dos puntos (:)." },
  { pattern: "name '(Print|PRINT|Input|INPUT|If|For|While|Def|True_|False_)' is not defined", message: "En Python «$1» se escribe en minúscula." },
  { pattern: "name '(true|false)' is not defined", message: "En Python se escribe True o False, con la primera letra en mayúscula." },
  { pattern: "name '(.+?)' is not defined", message: "Python no conoce «$1». ¿Está bien escrito? Si es un texto, va entre comillas. Si es una variable, primero hay que crearla." },
  { pattern: "can only concatenate str \\(not \"(int|float)\"\\) to str", message: "No se puede juntar texto con un número usando +. Convierte el número con str(...) o sepáralos con una coma en print." },
  { pattern: "unsupported operand type\\(s\\) for \\+: '(int|float)' and 'str'", message: "Estás sumando un número con un texto. Si el texto viene de input(), conviértelo con int(...)." },
  { pattern: "'>|<|>=|<=' not supported between instances of 'str' and 'int'|not supported between instances of '(str|int)' and '(int|str)'", message: "Estás comparando un texto con un número. Si viene de input(), conviértelo con int(...)." },
  { pattern: "missing (\\d+) required positional argument", message: "A la función le faltan datos entre los paréntesis." },
  { pattern: "takes (\\d+) positional arguments? but (\\d+) (?:was|were) given", message: "La función espera $1 dato(s), pero le diste $2." },
  { pattern: "'(\\w+)' object is not callable", message: "Pusiste paréntesis después de algo que no es una función ($1)." },
  { pattern: "invalid literal for int\\(\\) with base 10: '(.*)'", message: "int() solo convierte texto que tenga un número entero; «$1» no lo es." },
  { pattern: "could not convert string to float: '(.*)'", message: "float() solo convierte texto con un número; «$1» no lo es." },
  { pattern: "division by zero", message: "No se puede dividir entre cero." },
  { pattern: "list index out of range", message: "Pediste una posición que la lista no tiene. Ojo: se cuenta desde 0, así que la última es len(lista) - 1." },
  { pattern: "string index out of range", message: "Pediste una posición que el texto no tiene. Se cuenta desde 0." },
  { tipo: "KeyError", pattern: "^'?(.*?)'?$", message: "El diccionario no tiene la clave «$1»." },
  { pattern: "'(\\w+)' object has no attribute '(\\w+)'", message: "Un valor de tipo $1 no tiene «$2». Revisa cómo se escribe." },
  { pattern: "maximum recursion depth exceeded", message: "Una función se llama a sí misma sin parar." },
  { pattern: "local variable '(\\w+)' referenced before assignment|cannot access local variable '(\\w+)'", message: "Usaste «$1» dentro de la función antes de darle un valor." },
];

/** El mensaje en palabras simples para un error de Python. */
export function pythonFriendlyError(tipo: string | undefined, mensaje: string | undefined): string {
  const msg = mensaje || "";
  for (const f of PYTHON_FRIENDLY_ERRORS) {
    if (f.tipo && f.tipo !== tipo) continue;
    const m = msg.match(new RegExp(f.pattern));
    if (m) return f.message.replace("$1", m[1] || m[2] || "").replace("$2", m[2] || "");
  }
  return tipo ? `${tipo}: ${msg}` : msg;
}

/** El texto que se le muestra al alumno para un resultado del arnés. */
export function pythonResultMessage(run: PythonRun): string | null {
  if (!run.ok) {
    const donde = run.linea ? `Línea ${run.linea}: ` : "";
    return donde + pythonFriendlyError(run.tipo, run.mensaje);
  }
  if (run.paso === false) {
    const motivo = run.motivo || "";
    if (motivo.startsWith("__cb_error_prueba:")) {
      // La prueba usó algo que el alumno no creó (por ejemplo una función con otro nombre).
      const [tipo, ...rest] = motivo.slice("__cb_error_prueba:".length).split(": ");
      return pythonFriendlyError(tipo, rest.join(": "));
    }
    return motivo || "Todavía no es lo que pide el ejercicio.";
  }
  return null;
}

// Código que intenta tocar el interior de Python: en el servidor corre en un
// proceso nuevo que se descarta después (no puede afectar a otro alumno).
export const PYTHON_SUSPICIOUS = /__|\b(getattr|setattr|delattr|vars|eval|exec|compile|globals|locals|breakpoint|open|memoryview)\b|\b(import|from)\s+(sys|gc|inspect|builtins|importlib|types|os|ctypes|code|codeop|pickle|marshal|threading|signal|io|weakref|ast|runpy|pkgutil|site|traceback)\b/;

/** El resultado cuando el programa pasó el tiempo máximo. */
export function pythonTimeoutRun(): PythonRun {
  return { ok: false, salida: "", tipo: "Tiempo", mensaje: "__cb_tiempo", linea: null, paso: false };
}
