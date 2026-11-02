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
export const BUDDY_RUNTIME = String.raw`
(function (root) {
  var __buddyState = { animo: "normal", energia: 5, chistes: 0, risas: 0, saltos: 0, pasteles: 0, posicion: 0, bailando: false, dormido: false, dicho: [] };
  var __buddySteps = [];
  var __BUDDY_MOODS = ["normal", "feliz", "riendo", "triste", "dormido", "sorprendido", "cansado"];
  function __buddyPush(step) {
    if (__buddySteps.length >= ${BUDDY_MAX_STEPS}) throw new Error("Buddy está mareado: ¡demasiadas órdenes! Revisa que tu bucle termine.");
    step.animo = step.animo || __buddyState.animo;
    __buddySteps.push(step);
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
      var a = String(animo);
      if (__BUDDY_MOODS.indexOf(a) < 0) throw new Error("Buddy no conoce el ánimo \"" + a + "\". Prueba con: " + __BUDDY_MOODS.join(", "));
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
