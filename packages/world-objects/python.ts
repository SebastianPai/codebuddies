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

# Antes de correr, se revisa el programa: el curso no usa clases, ni atributos
# internos (__x__, gi_frame, f_back, ...), ni getattr/eval/..., y solo importa
# módulos simples. Con eso el alumno no puede llegar al corrector para hacer
# trampa (por ejemplo, cambiar cómo se comparan los valores en las pruebas).
import ast as _cb_ast
_cb_parse = _cb_ast.parse
_cb_walk = _cb_ast.walk
_CB_AST = {k: getattr(_cb_ast, k) for k in ("ClassDef", "Attribute", "Name", "Import", "ImportFrom", "Call", "Global", "Nonlocal", "arg", "keyword", "FunctionDef")}
_CB_MODULOS_OK = ("random", "math", "time", "string")
_CB_NOMBRES_NO = frozenset(("getattr", "setattr", "delattr", "hasattr", "globals", "locals", "vars", "eval", "exec", "compile", "open", "breakpoint", "memoryview", "super", "classmethod", "staticmethod", "property", "object", "help", "exit", "quit", "copyright", "credits", "license"))
_CB_PREFIJOS_NO = ("_", "f_", "gi_", "cr_", "ag_", "tb_", "co_")

def _cb_revisar(codigo):
    """None si el programa se puede correr; si no, (mensaje, línea)."""
    try:
        arbol = _cb_parse(codigo, "alumno.py")
    except _cb_B["BaseException"]:
        return None  # el error de sintaxis lo muestra compile, como siempre
    tipo_ok = _cb_B["set"]()
    for n in _cb_walk(arbol):
        # type(x) con un solo dato está bien (muestra el tipo); con 3 crea clases.
        if _cb_B["isinstance"](n, _CB_AST["Call"]) and _cb_B["isinstance"](n.func, _CB_AST["Name"]) and n.func.id == "type" and _cb_B["len"](n.args) == 1 and not n.keywords:
            tipo_ok.add(_cb_B["id"](n.func))
    for n in _cb_walk(arbol):
        linea = _cb_B["getattr"](n, "lineno", None)
        if _cb_B["isinstance"](n, _CB_AST["ClassDef"]):
            return ("clases", linea)
        if _cb_B["isinstance"](n, (_CB_AST["Global"], _CB_AST["Nonlocal"])):
            return ("global", linea)
        if _cb_B["isinstance"](n, _CB_AST["Attribute"]) and n.attr.startswith(_CB_PREFIJOS_NO):
            return ("attr:" + n.attr, linea)
        if _cb_B["isinstance"](n, _CB_AST["Name"]):
            if n.id.startswith("__") or n.id in _CB_NOMBRES_NO:
                return ("nombre:" + n.id, linea)
            if n.id == "type" and _cb_B["id"](n) not in tipo_ok:
                return ("type", linea)
        if _cb_B["isinstance"](n, (_CB_AST["arg"], _CB_AST["FunctionDef"])):
            nombre = n.arg if _cb_B["isinstance"](n, _CB_AST["arg"]) else n.name
            if nombre.startswith("__"):
                return ("dunder", linea)
        if _cb_B["isinstance"](n, _CB_AST["keyword"]) and n.arg and n.arg.startswith("__"):
            return ("dunder", linea)
        if _cb_B["isinstance"](n, _CB_AST["Import"]):
            for a in n.names:
                if a.name.split(".")[0] not in _CB_MODULOS_OK:
                    return ("import", linea)
        if _cb_B["isinstance"](n, _CB_AST["ImportFrom"]):
            if n.level or (n.module or "").split(".")[0] not in _CB_MODULOS_OK:
                return ("import", linea)
            for a in n.names:
                if a.name == "*" or a.name.startswith("_"):
                    return ("importfrom", linea)
    return None

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
    regla = _cb_revisar(codigo)
    if regla is not None:
        res = {"ok": False, "tipo": "Regla", "mensaje": "__cb_regla:" + regla[0], "linea": regla[1], "salida": ""}
        if pruebas.strip():
            res["paso"] = False
        return _cb_dumps(res)
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
        texto += "\n[...]"
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
                res["motivo"] = _cb_B["str"](fallo)  # vacío: el texto por defecto lo pone cada idioma
            else:
                res["paso"] = False
                res["motivo"] = "__cb_error_prueba:" + _cb_B["type"](fallo).__name__ + ": " + _cb_B["str"](fallo)[:200]
    return _cb_dumps(res)
`;

// Errores de Python explicados en palabras simples, en los tres idiomas de la
// plataforma. "$1"/"$2" es lo que capturó el patrón. El arnés no escribe
// textos para el alumno: devuelve códigos (__cb_regla:..., __cb_sin_datos,
// __cb_tiempo) que se traducen acá.
export type PythonMsgLang = "es" | "en" | "de";
export type PythonFriendlyError = { tipo?: string; pattern: string; message: string };

export function pythonMsgLang(lang?: string | null): PythonMsgLang {
  const v = String(lang ?? "").toLowerCase();
  return v.startsWith("en") ? "en" : v.startsWith("de") ? "de" : "es";
}

const ES: PythonFriendlyError[] = [
  { pattern: "^__cb_regla:clases$", message: "En este curso no se usan clases (class)." },
  { pattern: "^__cb_regla:global$", message: "En este curso no se usa global ni nonlocal: usa return para devolver valores." },
  { pattern: "^__cb_regla:attr:(.*)$", message: "En este curso no se usa «.$1»." },
  { pattern: "^__cb_regla:nombre:(.*)$", message: "En este curso no se usa «$1»." },
  { pattern: "^__cb_regla:type$", message: "type se usa así: type(valor)." },
  { pattern: "^__cb_regla:dunder$", message: "Los nombres no pueden empezar con __." },
  { pattern: "^__cb_regla:import$", message: "En este curso solo se puede importar: random, math, time, string." },
  { pattern: "^__cb_regla:importfrom$", message: "Importa solo lo que vas a usar, por ejemplo: from random import randint." },
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

const EN: PythonFriendlyError[] = [
  { pattern: "^__cb_regla:clases$", message: "This course doesn't use classes (class)." },
  { pattern: "^__cb_regla:global$", message: "This course doesn't use global or nonlocal: use return to give values back." },
  { pattern: "^__cb_regla:attr:(.*)$", message: "This course doesn't use “.$1”." },
  { pattern: "^__cb_regla:nombre:(.*)$", message: "This course doesn't use “$1”." },
  { pattern: "^__cb_regla:type$", message: "Use type like this: type(value)." },
  { pattern: "^__cb_regla:dunder$", message: "Names can't start with __." },
  { pattern: "^__cb_regla:import$", message: "In this course you can only import: random, math, time, string." },
  { pattern: "^__cb_regla:importfrom$", message: "Import only what you need, for example: from random import randint." },
  { pattern: "__cb_sin_datos", message: "The program asked for data with input(), but there is nothing left to type." },
  { pattern: "__cb_tiempo", message: "Your program never ends. Is there a while loop whose condition never becomes false?" },
  { pattern: "was never closed", message: "You opened a parenthesis (or bracket) and didn't close it." },
  { pattern: "unterminated string literal|EOL while scanning string literal", message: "The text is missing its closing quote: if you open with \" you have to close with \"." },
  { pattern: "unterminated triple-quoted string", message: "You opened a text with three quotes and didn't close it." },
  { pattern: "unmatched '(\\)|\\]|\\})'", message: "There's an extra “$1”: you closed something you never opened." },
  { pattern: "closing parenthesis '(.)' does not match opening parenthesis '(.)'", message: "You closed with “$1” but you had opened with “$2”." },
  { pattern: "expected ':'", message: "The colon (:) is missing at the end of the line." },
  { pattern: "expected an indented block", message: "After the colon (:) the lines inside must be indented: 4 spaces at the start." },
  { pattern: "unexpected indent", message: "This line has extra spaces at the start. Only lines inside an if, for, while or def are indented." },
  { pattern: "unindent does not match any outer indentation level", message: "The indentation of this line doesn't match the lines above. Always use 4 spaces." },
  { pattern: "Did you mean '==' or ':=' instead of '='", message: "To compare you use == (two equals signs). A single = stores a value in a variable." },
  { pattern: "cannot assign to expression here|cannot assign to literal", message: "The left side of = must be a variable name, for example: age = 12." },
  { pattern: "Perhaps you forgot a comma", message: "It looks like a comma is missing between two things." },
  { pattern: "invalid character '(.)'", message: "There's a strange character: “$1”. Use normal quotes (\") and type the code in the editor instead of copying it from a document." },
  { pattern: "Missing parentheses in call to 'print'", message: "print needs parentheses: print(\"Hello\")." },
  { pattern: "invalid syntax", message: "Python doesn't understand this line. Check the quotes, the parentheses and the colons (:)." },
  { pattern: "name '(Print|PRINT|Input|INPUT|If|For|While|Def|True_|False_)' is not defined", message: "In Python “$1” is written in lowercase." },
  { pattern: "name '(true|false)' is not defined", message: "In Python you write True or False, with a capital first letter." },
  { pattern: "name '(.+?)' is not defined", message: "Python doesn't know “$1”. Is it spelled right? If it's text, it goes in quotes. If it's a variable, you have to create it first." },
  { pattern: "can only concatenate str \\(not \"(int|float)\"\\) to str", message: "You can't join text and a number with +. Convert the number with str(...) or separate them with a comma in print." },
  { pattern: "unsupported operand type\\(s\\) for \\+: '(int|float)' and 'str'", message: "You're adding a number and a text. If the text comes from input(), convert it with int(...)." },
  { pattern: "'>|<|>=|<=' not supported between instances of 'str' and 'int'|not supported between instances of '(str|int)' and '(int|str)'", message: "You're comparing a text with a number. If it comes from input(), convert it with int(...)." },
  { pattern: "missing (\\d+) required positional argument", message: "The function is missing data between the parentheses." },
  { pattern: "takes (\\d+) positional arguments? but (\\d+) (?:was|were) given", message: "The function expects $1 value(s), but you gave it $2." },
  { pattern: "'(\\w+)' object is not callable", message: "You put parentheses after something that isn't a function ($1)." },
  { pattern: "invalid literal for int\\(\\) with base 10: '(.*)'", message: "int() only converts text that holds a whole number; “$1” doesn't." },
  { pattern: "could not convert string to float: '(.*)'", message: "float() only converts text that holds a number; “$1” doesn't." },
  { pattern: "division by zero", message: "You can't divide by zero." },
  { pattern: "list index out of range", message: "You asked for a position the list doesn't have. Careful: counting starts at 0, so the last one is len(list) - 1." },
  { pattern: "string index out of range", message: "You asked for a position the text doesn't have. Counting starts at 0." },
  { tipo: "KeyError", pattern: "^'?(.*?)'?$", message: "The dictionary doesn't have the key “$1”." },
  { pattern: "'(\\w+)' object has no attribute '(\\w+)'", message: "A value of type $1 doesn't have “$2”. Check the spelling." },
  { pattern: "maximum recursion depth exceeded", message: "A function keeps calling itself without stopping." },
  { pattern: "local variable '(\\w+)' referenced before assignment|cannot access local variable '(\\w+)'", message: "You used “$1” inside the function before giving it a value." },
];

const DE: PythonFriendlyError[] = [
  { pattern: "^__cb_regla:clases$", message: "In diesem Kurs werden keine Klassen (class) verwendet." },
  { pattern: "^__cb_regla:global$", message: "In diesem Kurs wird global oder nonlocal nicht verwendet: Gib Werte mit return zurück." },
  { pattern: "^__cb_regla:attr:(.*)$", message: "In diesem Kurs wird „.$1“ nicht verwendet." },
  { pattern: "^__cb_regla:nombre:(.*)$", message: "In diesem Kurs wird „$1“ nicht verwendet." },
  { pattern: "^__cb_regla:type$", message: "type benutzt man so: type(wert)." },
  { pattern: "^__cb_regla:dunder$", message: "Namen dürfen nicht mit __ anfangen." },
  { pattern: "^__cb_regla:import$", message: "In diesem Kurs kannst du nur importieren: random, math, time, string." },
  { pattern: "^__cb_regla:importfrom$", message: "Importiere nur, was du brauchst, zum Beispiel: from random import randint." },
  { pattern: "__cb_sin_datos", message: "Das Programm hat mit input() nach einer Eingabe gefragt, aber es gibt keine Eingaben mehr." },
  { pattern: "__cb_tiempo", message: "Dein Programm hört nie auf. Gibt es eine while-Schleife, deren Bedingung nie falsch wird?" },
  { pattern: "was never closed", message: "Du hast eine Klammer geöffnet und nicht geschlossen." },
  { pattern: "unterminated string literal|EOL while scanning string literal", message: "Beim Text fehlt das schließende Anführungszeichen: Wenn du mit \" anfängst, musst du mit \" aufhören." },
  { pattern: "unterminated triple-quoted string", message: "Du hast einen Text mit drei Anführungszeichen geöffnet und nicht geschlossen." },
  { pattern: "unmatched '(\\)|\\]|\\})'", message: "Ein „$1“ ist zu viel: Du hast etwas geschlossen, das nie geöffnet wurde." },
  { pattern: "closing parenthesis '(.)' does not match opening parenthesis '(.)'", message: "Du hast mit „$1“ geschlossen, aber mit „$2“ geöffnet." },
  { pattern: "expected ':'", message: "Am Ende der Zeile fehlt der Doppelpunkt (:)." },
  { pattern: "expected an indented block", message: "Nach dem Doppelpunkt (:) werden die Zeilen darin eingerückt: 4 Leerzeichen am Anfang." },
  { pattern: "unexpected indent", message: "Diese Zeile hat am Anfang zu viele Leerzeichen. Eingerückt werden nur Zeilen in einem if, for, while oder def." },
  { pattern: "unindent does not match any outer indentation level", message: "Die Einrückung dieser Zeile passt nicht zu den Zeilen darüber. Benutze immer 4 Leerzeichen." },
  { pattern: "Did you mean '==' or ':=' instead of '='", message: "Zum Vergleichen benutzt man == (zwei Gleichheitszeichen). Ein einzelnes = speichert einen Wert in einer Variable." },
  { pattern: "cannot assign to expression here|cannot assign to literal", message: "Links vom = steht der Name einer Variable, zum Beispiel: alter = 12." },
  { pattern: "Perhaps you forgot a comma", message: "Anscheinend fehlt ein Komma zwischen zwei Dingen." },
  { pattern: "invalid character '(.)'", message: "Da ist ein seltsames Zeichen: „$1“. Benutze normale Anführungszeichen (\") und schreib den Code im Editor, statt ihn aus einem Dokument zu kopieren." },
  { pattern: "Missing parentheses in call to 'print'", message: "print braucht Klammern: print(\"Hallo\")." },
  { pattern: "invalid syntax", message: "Python versteht diese Zeile nicht. Prüfe die Anführungszeichen, die Klammern und die Doppelpunkte (:)." },
  { pattern: "name '(Print|PRINT|Input|INPUT|If|For|While|Def|True_|False_)' is not defined", message: "In Python schreibt man „$1“ klein." },
  { pattern: "name '(true|false)' is not defined", message: "In Python schreibt man True oder False, mit großem Anfangsbuchstaben." },
  { pattern: "name '(.+?)' is not defined", message: "Python kennt „$1“ nicht. Ist es richtig geschrieben? Ein Text kommt in Anführungszeichen. Eine Variable musst du zuerst anlegen." },
  { pattern: "can only concatenate str \\(not \"(int|float)\"\\) to str", message: "Text und Zahl kann man nicht mit + verbinden. Wandle die Zahl mit str(...) um oder trenne sie in print mit einem Komma." },
  { pattern: "unsupported operand type\\(s\\) for \\+: '(int|float)' and 'str'", message: "Du addierst eine Zahl und einen Text. Wenn der Text von input() kommt, wandle ihn mit int(...) um." },
  { pattern: "'>|<|>=|<=' not supported between instances of 'str' and 'int'|not supported between instances of '(str|int)' and '(int|str)'", message: "Du vergleichst einen Text mit einer Zahl. Wenn er von input() kommt, wandle ihn mit int(...) um." },
  { pattern: "missing (\\d+) required positional argument", message: "Der Funktion fehlen Werte in den Klammern." },
  { pattern: "takes (\\d+) positional arguments? but (\\d+) (?:was|were) given", message: "Die Funktion erwartet $1 Wert(e), aber du hast ihr $2 gegeben." },
  { pattern: "'(\\w+)' object is not callable", message: "Du hast Klammern hinter etwas gesetzt, das keine Funktion ist ($1)." },
  { pattern: "invalid literal for int\\(\\) with base 10: '(.*)'", message: "int() wandelt nur Text mit einer ganzen Zahl um; „$1“ ist keine." },
  { pattern: "could not convert string to float: '(.*)'", message: "float() wandelt nur Text mit einer Zahl um; „$1“ ist keine." },
  { pattern: "division by zero", message: "Man kann nicht durch null teilen." },
  { pattern: "list index out of range", message: "Du hast nach einer Position gefragt, die die Liste nicht hat. Achtung: Man zählt ab 0, die letzte ist also len(liste) - 1." },
  { pattern: "string index out of range", message: "Du hast nach einer Position gefragt, die der Text nicht hat. Man zählt ab 0." },
  { tipo: "KeyError", pattern: "^'?(.*?)'?$", message: "Das Wörterbuch hat den Schlüssel „$1“ nicht." },
  { pattern: "'(\\w+)' object has no attribute '(\\w+)'", message: "Ein Wert vom Typ $1 hat kein „$2“. Prüfe die Schreibweise." },
  { pattern: "maximum recursion depth exceeded", message: "Eine Funktion ruft sich ohne Ende selbst auf." },
  { pattern: "local variable '(\\w+)' referenced before assignment|cannot access local variable '(\\w+)'", message: "Du hast „$1“ in der Funktion benutzt, bevor es einen Wert hatte." },
];

export const PYTHON_FRIENDLY_ERRORS_BY_LANG: Record<PythonMsgLang, PythonFriendlyError[]> = { es: ES, en: EN, de: DE };
/** Compatibilidad: la tabla en español. */
export const PYTHON_FRIENDLY_ERRORS = ES;

/** Textos fijos del corrector en cada idioma. */
export const PYTHON_TEXTS: Record<PythonMsgLang, { line: string; notYet: string; writeFirst: string }> = {
  es: { line: "Línea", notYet: "Todavía no es lo que pide el ejercicio.", writeFirst: "Escribe tu programa primero." },
  en: { line: "Line", notYet: "That's not what the exercise asks for yet.", writeFirst: "Write your program first." },
  de: { line: "Zeile", notYet: "Das ist noch nicht, was die Übung verlangt.", writeFirst: "Schreib zuerst dein Programm." },
};

/** El mensaje en palabras simples para un error de Python. */
export function pythonFriendlyError(tipo: string | undefined, mensaje: string | undefined, lang?: string | null): string {
  const msg = mensaje || "";
  for (const f of PYTHON_FRIENDLY_ERRORS_BY_LANG[pythonMsgLang(lang)]) {
    if (f.tipo && f.tipo !== tipo) continue;
    const m = msg.match(new RegExp(f.pattern));
    if (m) return f.message.replace("$1", m[1] || m[2] || "").replace("$2", m[2] || "");
  }
  return tipo ? `${tipo}: ${msg}` : msg;
}

/** El texto que se le muestra al alumno para un resultado del arnés. */
export function pythonResultMessage(run: PythonRun, lang?: string | null): string | null {
  const T = PYTHON_TEXTS[pythonMsgLang(lang)];
  if (!run.ok) {
    const donde = run.linea ? `${T.line} ${run.linea}: ` : "";
    return donde + pythonFriendlyError(run.tipo, run.mensaje, lang);
  }
  if (run.paso === false) {
    const motivo = run.motivo || "";
    if (motivo.startsWith("__cb_error_prueba:")) {
      // La prueba usó algo que el alumno no creó (por ejemplo una función con otro nombre).
      const [tipo, ...rest] = motivo.slice("__cb_error_prueba:".length).split(": ");
      return pythonFriendlyError(tipo, rest.join(": "), lang);
    }
    return motivo || T.notYet;
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
