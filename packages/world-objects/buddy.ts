// Buddy: el robot de los cursos para niños. El código del alumno le da
// órdenes (`buddy.decir("hola")`, `buddy.contarChiste()`...) y Buddy cambia
// de estado. El MISMO motor corre en dos lugares, por eso es texto:
//   - en la web, dentro del iframe de la vista previa, que después reproduce
//     los pasos con animaciones;
//   - en la API, dentro de node:vm, para corregir el ejercicio de verdad
//     (las verificaciones `assert(buddy.animo === "riendo")` miran el estado
//     final).
// Lenguaje del ejercicio: "buddy".

export const BUDDY_LANGUAGE = 'buddy';

export const BUDDY_MOODS = ['normal', 'feliz', 'riendo', 'triste', 'dormido', 'sorprendido', 'cansado'] as const;
export type BuddyMood = (typeof BUDDY_MOODS)[number];

export type BuddyStep =
  | { accion: 'decir'; texto: string }
  | { accion: 'chiste'; risas: number }
  | { accion: 'saltar' }
  | { accion: 'bailar' }
  | { accion: 'dormir' }
  | { accion: 'despertar' }
  | { accion: 'comer' }
  | { accion: 'avanzar'; pasos: number }
  | { accion: 'animo'; animo: BuddyMood }
  | { accion: 'zzz' };

export type BuddyState = {
  animo: BuddyMood;
  energia: number;
  chistes: number;
  risas: number;
  saltos: number;
  pasteles: number;
  posicion: number;
  bailando: boolean;
  dormido: boolean;
  dicho: string[];
};

/** Máximo de órdenes por ejecución: un bucle infinito de órdenes se corta. */
export const BUDDY_MAX_STEPS = 300;

/**
 * Define `buddy` (y redirige console.log a buddy.decir) como globales que no
 * se pueden reemplazar, más `__buddyReport()` para leer el resultado
 * ({ state, steps }). El estado vive en un cierre: solo cambia con órdenes.
 * Sin dependencias ni APIs del navegador o de Node: corre igual en ambos.
 */
// Órdenes y propiedades en inglés y alemán: alias de las de español (el
// estado interno sigue en español). Así el mismo ejercicio se puede escribir
// en el idioma del alumno: buddy.say("Hi") es lo mismo que buddy.decir("Hi").
export const BUDDY_COMMANDS: Record<'en' | 'de', Record<string, string>> = {
  en: { say: 'decir', tellJoke: 'contarChiste', jump: 'saltar', dance: 'bailar', sleep: 'dormir', wakeUp: 'despertar', eat: 'comer', walk: 'avanzar', setMood: 'ponerAnimo', isAsleep: 'estaDormido', isTired: 'estaCansado' },
  de: { sagen: 'decir', witzMachen: 'contarChiste', springen: 'saltar', tanzen: 'bailar', schlafen: 'dormir', aufwachen: 'despertar', essen: 'comer', gehen: 'avanzar', setzeStimmung: 'ponerAnimo', istAmSchlafen: 'estaDormido', istMuede: 'estaCansado', 'istMüde': 'estaCansado' },
};
export const BUDDY_PROPERTIES: Record<'en' | 'de', Record<string, string>> = {
  en: { mood: 'animo', energy: 'energia', jokes: 'chistes', laughs: 'risas', jumps: 'saltos', cakes: 'pasteles', position: 'posicion', dancing: 'bailando', asleep: 'dormido', said: 'dicho' },
  de: { stimmung: 'animo', energie: 'energia', witze: 'chistes', lacher: 'risas', spruenge: 'saltos', 'sprünge': 'saltos', kuchen: 'pasteles', position: 'posicion', tanzt: 'bailando', schlaeft: 'dormido', 'schläft': 'dormido', gesagt: 'dicho' },
};
/** Nombre de cada ánimo en cada idioma (el de español es el interno). */
export const BUDDY_MOOD_NAMES: Record<'en' | 'de', Record<BuddyMood, string>> = {
  en: { normal: 'normal', feliz: 'happy', riendo: 'laughing', triste: 'sad', dormido: 'asleep', sorprendido: 'surprised', cansado: 'tired' },
  de: { normal: 'normal', feliz: 'froh', riendo: 'lachend', triste: 'traurig', dormido: 'schlafend', sorprendido: 'überrascht', cansado: 'müde' },
};

export const BUDDY_RUNTIME = String.raw`
(function (root) {
  var L = (typeof __CB_LANG !== "undefined" && (__CB_LANG === "en" || __CB_LANG === "de")) ? __CB_LANG : "es";
  var MSG = {
    es: { mareado: "Buddy está mareado: ¡demasiadas órdenes! Revisa que tu bucle termine.", animo: "Buddy no conoce el ánimo", prueba: "Prueba con" },
    en: { mareado: "Buddy is dizzy: too many commands! Check that your loop ends.", animo: "Buddy doesn't know the mood", prueba: "Try" },
    de: { mareado: "Buddy ist schwindelig: zu viele Befehle! Prüf, ob deine Schleife endet.", animo: "Buddy kennt diese Stimmung nicht:", prueba: "Probier" }
  }[L];
  var CMDS = ${JSON.stringify(BUDDY_COMMANDS)};
  var PROPS = ${JSON.stringify(BUDDY_PROPERTIES)};
  var MOODS = ${JSON.stringify(BUDDY_MOOD_NAMES)};
  var __BUDDY_MOODS = ["normal", "feliz", "riendo", "triste", "dormido", "sorprendido", "cansado"];
  // Cualquier nombre de ánimo (de cualquier idioma, con o sin diéresis) al interno.
  function __plain(x) { return String(x).toLowerCase().replace(/ü/g, "ue").replace(/ö/g, "oe").replace(/ä/g, "ae"); }
  function __buddyMood(name) {
    var a = __plain(name);
    if (__BUDDY_MOODS.indexOf(a) >= 0) return a;
    for (var lang in MOODS) for (var k in MOODS[lang]) if (__plain(MOODS[lang][k]) === a) return k;
    return null;
  }
  var __buddyState = { animo: "normal", energia: 5, chistes: 0, risas: 0, saltos: 0, pasteles: 0, posicion: 0, bailando: false, dormido: false, dicho: [] };
  var __buddySteps = [];
  function __buddyPush(step) {
    if (__buddySteps.length >= ${BUDDY_MAX_STEPS}) throw new Error(MSG.mareado);
    step.animo = step.animo || __buddyState.animo;
    var line = __buddyLine();
    if (line) step.linea = line;
    __buddySteps.push(step);
  }
  // Línea del código del alumno que dio la orden (para pintarla en el editor).
  // Solo existe en la vista previa, donde el código corre con
  // "//# sourceURL=alumno.js"; new Function le suma 2 líneas de cabecera.
  function __buddyLine() {
    var stack = String(new Error().stack || "");
    var match = stack.match(/alumno\.js:(\d+)/);
    return match ? Math.max(1, Number(match[1]) - 2) : null;
  }
  function __buddyTired() {
    if (__buddyState.energia <= 0) { __buddyState.energia = 0; __buddyState.animo = "cansado"; return true; }
    return false;
  }
  function __buddyAsleep() {
    if (__buddyState.dormido) { __buddyPush({ accion: "zzz" }); return true; }
    return false;
  }
  var buddy = {
    decir: function (texto) {
      if (__buddyAsleep()) return;
      var t = String(texto);
      __buddyState.dicho.push(t);
      __buddyPush({ accion: "decir", texto: t });
    },
    contarChiste: function () {
      if (__buddyAsleep()) return;
      __buddyState.chistes += 1;
      if (__buddyState.energia > 0) {
        __buddyState.risas += 1;
        __buddyState.energia -= 1;
        __buddyState.animo = __buddyState.risas >= 3 ? "riendo" : "feliz";
      }
      __buddyPush({ accion: "chiste", risas: __buddyState.risas });
      __buddyTired();
    },
    saltar: function () {
      if (__buddyAsleep()) return;
      if (__buddyState.energia <= 0) { __buddyTired(); __buddyPush({ accion: "animo", animo: "cansado" }); return; }
      __buddyState.saltos += 1;
      __buddyState.energia -= 1;
      __buddyPush({ accion: "saltar" });
      __buddyTired();
    },
    bailar: function () {
      if (__buddyAsleep()) return;
      __buddyState.bailando = true;
      if (__buddyState.animo !== "riendo") __buddyState.animo = "feliz";
      __buddyPush({ accion: "bailar" });
    },
    dormir: function () {
      __buddyState.dormido = true;
      __buddyState.bailando = false;
      __buddyState.animo = "dormido";
      __buddyState.energia = 5;
      __buddyPush({ accion: "dormir" });
    },
    despertar: function () {
      if (!__buddyState.dormido) return;
      __buddyState.dormido = false;
      __buddyState.animo = "normal";
      __buddyPush({ accion: "despertar" });
    },
    comer: function () {
      if (__buddyAsleep()) return;
      __buddyState.pasteles += 1;
      __buddyState.energia = Math.min(10, __buddyState.energia + 2);
      if (__buddyState.animo === "cansado" || __buddyState.animo === "triste" || __buddyState.animo === "normal") __buddyState.animo = "feliz";
      __buddyPush({ accion: "comer" });
    },
    avanzar: function (pasos) {
      if (__buddyAsleep()) return;
      var n = Math.trunc(Number(pasos === undefined ? 1 : pasos)) || 0;
      __buddyState.posicion += n;
      __buddyPush({ accion: "avanzar", pasos: n });
    },
    ponerAnimo: function (animo) {
      var a = __buddyMood(animo);
      if (!a) throw new Error(MSG.animo + " \"" + String(animo) + "\". " + MSG.prueba + ": " + (L === "es" ? __BUDDY_MOODS : __BUDDY_MOODS.map(function (m) { return MOODS[L][m]; })).join(", "));
      __buddyState.animo = a;
      __buddyState.dormido = a === "dormido";
      __buddyPush({ accion: "animo", animo: a });
    },
    estaDormido: function () { return __buddyState.dormido; },
    estaCansado: function () { return __buddyState.energia <= 0; }
  };
  ["animo", "energia", "chistes", "risas", "saltos", "pasteles", "posicion", "bailando", "dormido"].forEach(function (key) {
    Object.defineProperty(buddy, key, { get: function () { return __buddyState[key]; }, enumerable: true });
  });
  Object.defineProperty(buddy, "dicho", { get: function () { return __buddyState.dicho.slice(); }, enumerable: true });
  // Los mismos nombres en inglés y alemán. El ánimo se lee en ese idioma.
  for (var lang in CMDS) for (var name in CMDS[lang]) buddy[name] = buddy[CMDS[lang][name]];
  for (var plang in PROPS) for (var pname in PROPS[plang]) (function (l, n, key) {
    if (!Object.prototype.hasOwnProperty.call(buddy, n)) Object.defineProperty(buddy, n, { get: function () {
      if (key === "animo") return MOODS[l][__buddyState.animo];
      return key === "dicho" ? __buddyState.dicho.slice() : __buddyState[key];
    }, enumerable: false });
  })(plang, pname, PROPS[plang][pname]);
  Object.freeze(buddy);
  var __console = { log: function () { buddy.decir(Array.prototype.slice.call(arguments).join(" ")); }, error: function () {}, warn: function () {}, info: function () {} };
  
  var report = function () {
    return { state: JSON.parse(JSON.stringify(__buddyState)), steps: __buddySteps.slice() };
  };
  // Constantes de verdad: el alumno no puede reemplazar a Buddy ni leer o
  // cambiar su estado por fuera de las órdenes.
  Object.defineProperty(root, "buddy", { value: buddy, writable: false, configurable: false });
  Object.defineProperty(root, "console", { value: __console, writable: false, configurable: false });
  Object.defineProperty(root, "__buddyReport", { value: report, writable: false, configurable: false });
})(typeof globalThis !== "undefined" ? globalThis : this);
`;

// Errores de JavaScript en palabras simples, en el idioma del alumno. Los
// mensajes del motor (en inglés y técnicos) se traducen; los del propio motor
// ya vienen en el idioma. Son datos (no funciones) para poder mandarlos al
// iframe de la vista previa. En el mensaje, $1 es lo que capturó el paréntesis.
export type FriendlyLang = 'es' | 'en' | 'de';
export const friendlyLang = (lang?: string | null): FriendlyLang => {
  const v = String(lang ?? '').toLowerCase();
  return v.startsWith('en') ? 'en' : v.startsWith('de') ? 'de' : 'es';
};

export const BUDDY_FRIENDLY_ERRORS_BY_LANG: Record<FriendlyLang, Array<{ pattern: string; message: string }>> = {
  es: [
    { pattern: 'Invalid or unexpected token|Unterminated string', message: 'Hay algo raro en tu código: ¿te falta cerrar una comilla "?' },
    { pattern: 'missing \\) after argument list', message: 'Falta cerrar un paréntesis ). Cada ( necesita su ).' },
    { pattern: 'Unexpected end of input', message: 'El código se termina antes de tiempo: ¿falta cerrar un paréntesis ) o una llave }?' },
    { pattern: "Unexpected token '?([^'\\s]+)'?", message: 'Hay un «$1» que sobra o está en un lugar raro. Revisa los paréntesis y las comillas.' },
    { pattern: 'buddy\\.(\\w+) is not a function', message: 'Buddy no sabe hacer «$1». Revisa cómo se escribe la orden.' },
    { pattern: '(\\w+) is not defined', message: 'No conozco «$1». ¿Lo escribiste bien? Las órdenes empiezan con buddy.' },
    { pattern: 'Cannot read propert(?:y|ies) of (?:undefined|null)', message: 'Estás usando algo que no existe. Revisa que esté bien escrito.' },
  ],
  en: [
    { pattern: 'Invalid or unexpected token|Unterminated string', message: 'Something is odd in your code: are you missing a closing quote "?' },
    { pattern: 'missing \\) after argument list', message: 'A parenthesis ) is missing. Every ( needs its ).' },
    { pattern: 'Unexpected end of input', message: 'The code ends too early: is a parenthesis ) or a brace } missing?' },
    { pattern: "Unexpected token '?([^'\\s]+)'?", message: 'There is a “$1” that is extra or in a strange place. Check the parentheses and the quotes.' },
    { pattern: 'buddy\\.(\\w+) is not a function', message: 'Buddy doesn’t know how to “$1”. Check how the command is spelled.' },
    { pattern: '(\\w+) is not defined', message: 'I don’t know “$1”. Did you spell it right? Commands start with buddy.' },
    { pattern: 'Cannot read propert(?:y|ies) of (?:undefined|null)', message: 'You are using something that doesn’t exist. Check that it is spelled right.' },
  ],
  de: [
    { pattern: 'Invalid or unexpected token|Unterminated string', message: 'Etwas stimmt nicht in deinem Code: Fehlt ein schließendes Anführungszeichen "?' },
    { pattern: 'missing \\) after argument list', message: 'Eine Klammer ) fehlt. Jede ( braucht ihre ).' },
    { pattern: 'Unexpected end of input', message: 'Der Code hört zu früh auf: Fehlt eine Klammer ) oder eine geschweifte Klammer }?' },
    { pattern: "Unexpected token '?([^'\\s]+)'?", message: 'Da ist ein „$1“ zu viel oder an einer seltsamen Stelle. Prüf die Klammern und die Anführungszeichen.' },
    { pattern: 'buddy\\.(\\w+) is not a function', message: 'Buddy kann „$1“ nicht. Prüf, wie der Befehl geschrieben wird.' },
    { pattern: '(\\w+) is not defined', message: '„$1“ kenne ich nicht. Hast du es richtig geschrieben? Befehle fangen mit buddy. an.' },
    { pattern: 'Cannot read propert(?:y|ies) of (?:undefined|null)', message: 'Du benutzt etwas, das es nicht gibt. Prüf, ob es richtig geschrieben ist.' },
  ],
};
export const BUDDY_FRIENDLY_ERRORS = BUDDY_FRIENDLY_ERRORS_BY_LANG.es;

/** Mensaje de la verificación cuando el ejercicio no trae uno propio. */
export const BUDDY_NOT_YET: Record<FriendlyLang, string> = {
  es: 'Buddy todavía no está como pide el ejercicio',
  en: 'Buddy is not quite how the exercise asks yet',
  de: 'Buddy ist noch nicht so, wie die Aufgabe es verlangt',
};

export function buddyFriendlyError(message: string, lang?: string | null): string {
  for (const rule of BUDDY_FRIENDLY_ERRORS_BY_LANG[friendlyLang(lang)]) {
    const match = message.match(new RegExp(rule.pattern, 'i'));
    if (match) return rule.message.replace('$1', match[1] ?? '');
  }
  return message;
}
