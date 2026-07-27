import { PrismaClient, Prisma, Difficulty, ExerciseType } from '@prisma/client';

// ---------------------------------------------------------------------------
// Tipos de la data curricular (contenido, no schema de BD)
// ---------------------------------------------------------------------------

interface Localized {
  es: string;
  en: string;
}

interface InstructionBlock {
  type: 'text' | 'code';
  value: string;
  language?: string;
}

interface QuizQuestionSeed {
  question: string;
  options: string[];
  correct: number[];
  isMultiple: boolean;
  explanation: string;
}

interface CodeExerciseSeed {
  kind: 'CODE';
  title: Localized;
  description: Localized;
  blocksEs: InstructionBlock[];
  blocksEn: InstructionBlock[];
  starterCode: string;
  assertions: string;
  experience?: number;
  coins?: number;
}

interface QuizExerciseSeed {
  kind: 'QUIZ';
  title: Localized;
  description: Localized;
  questionsEs: QuizQuestionSeed[];
  questionsEn: QuizQuestionSeed[];
  experience?: number;
  coins?: number;
}

type ExerciseSeed = CodeExerciseSeed | QuizExerciseSeed;

interface LessonSeed {
  title: Localized;
  description: Localized;
  exercises: ExerciseSeed[];
}

interface CourseSeed {
  title: Localized;
  description: Localized;
  difficulty: Difficulty;
  lessons: LessonSeed[];
}

// ---------------------------------------------------------------------------
// Helpers de autoría
// ---------------------------------------------------------------------------

const text = (value: string): InstructionBlock => ({ type: 'text', value });
const js = (value: string): InstructionBlock => ({
  type: 'code',
  value,
  language: 'javascript',
});

function codeExercise(opts: Omit<CodeExerciseSeed, 'kind'>): ExerciseSeed {
  return { kind: 'CODE', ...opts };
}

function quizExercise(opts: Omit<QuizExerciseSeed, 'kind'>): ExerciseSeed {
  return { kind: 'QUIZ', ...opts };
}

// ---------------------------------------------------------------------------
// CURSO 1 — Fundamentos de JavaScript (EASY)
// ---------------------------------------------------------------------------

const course1: CourseSeed = {
  title: { es: 'JavaScript: Fundamentos', en: 'JavaScript: Fundamentals' },
  description: {
    es: 'La base sólida de JavaScript: variables, tipos, control de flujo, funciones, arrays y objetos. Termina con un proyecto integrador.',
    en: 'A solid JavaScript foundation: variables, types, control flow, functions, arrays and objects. Ends with a capstone project.',
  },
  difficulty: Difficulty.EASY,
  lessons: [
    // ------------------------------------------------------------------
    // Lección 1 — Variables, tipos y coerción
    // ------------------------------------------------------------------
    {
      title: { es: 'Variables, tipos y coerción', en: 'Variables, types and coercion' },
      description: {
        es: 'let, const, var, los tipos primitivos y por qué == e === no son lo mismo.',
        en: 'let, const, var, primitive types, and why == and === are not the same.',
      },
      exercises: [
        codeExercise({
          title: { es: 'Tu primera caja de datos', en: 'Your first data box' },
          description: {
            es: 'Declara variables con el tipo correcto para describir un curso.',
            en: 'Declare variables with the right type to describe a course.',
          },
          blocksEs: [
            text(
              'En JavaScript una variable es un nombre que apunta a un valor guardado en memoria. Hay tres formas de declararla: const (no se puede reasignar), let (se puede reasignar, vive solo en su bloque) y var (la forma vieja, evita usarla: no respeta bloques, solo funciones). La regla practica: usa const por defecto y cambia a let solo si de verdad vas a reasignar el valor.',
            ),
            js(
              'const nombre = "Ada";      // no se puede reasignar\nlet edad = 30;             // se puede reasignar\nedad = 31;                 // OK\n\n// nombre = "Grace";       // Error: Assignment to constant variable.',
            ),
            text(
              'JavaScript tiene 7 tipos primitivos: string, number, boolean, undefined, null, symbol y bigint. Todo lo que no es primitivo (arrays, objetos, funciones) es de tipo object. typeof te dice el tipo en tiempo de ejecucion.',
            ),
            js(
              'typeof "hola"      // "string"\ntypeof 42          // "number"\ntypeof true         // "boolean"\ntypeof undefined    // "undefined"\ntypeof {}           // "object"\ntypeof null         // "object" (si, es una rareza historica del lenguaje)',
            ),
            text(
              'Tarea: declara tres variables con el nombre, tipo y valor exactos que se piden en los comentarios del editor.',
            ),
          ],
          blocksEn: [
            text(
              'In JavaScript, a variable is a name pointing to a value stored in memory. There are three ways to declare one: const (cannot be reassigned), let (can be reassigned, block-scoped) and var (the old way, avoid it: it ignores blocks, only respects functions). Practical rule: use const by default, switch to let only when you really need to reassign.',
            ),
            js(
              'const name = "Ada";      // cannot be reassigned\nlet age = 30;            // can be reassigned\nage = 31;                // OK\n\n// name = "Grace";       // Error: Assignment to constant variable.',
            ),
            text(
              'JavaScript has 7 primitive types: string, number, boolean, undefined, null, symbol and bigint. Everything that is not primitive (arrays, objects, functions) is of type object. typeof tells you the runtime type.',
            ),
            js(
              'typeof "hi"         // "string"\ntypeof 42           // "number"\ntypeof true          // "boolean"\ntypeof undefined     // "undefined"\ntypeof {}            // "object"\ntypeof null          // "object" (yes, a historical quirk of the language)',
            ),
            text(
              'Task: declare three variables with the exact name, type and value requested in the editor comments.',
            ),
          ],
          starterCode:
            '// 1) const nombreCurso = "JavaScript"\n// 2) let anioActual = 2026 (numero)\n// 3) let esGratis = true (booleano)\n\n',
          assertions:
            'assert(typeof nombreCurso !== "undefined", "Falta declarar nombreCurso");\nassert(nombreCurso === "JavaScript", "nombreCurso debe ser exactamente el string JavaScript");\nassert(typeof anioActual === "number", "anioActual debe ser un numero");\nassert(anioActual === 2026, "anioActual debe ser 2026");\nassert(typeof esGratis === "boolean", "esGratis debe ser un booleano");\nassert(esGratis === true, "esGratis debe ser true");',
          experience: 15,
          coins: 8,
        }),
        codeExercise({
          title: { es: 'Coerción: == vs ===', en: 'Coercion: == vs ===' },
          description: {
            es: 'Escribe una función que compare dos valores sin coerción de tipos.',
            en: 'Write a function that compares two values without type coercion.',
          },
          blocksEs: [
            text(
              '== compara despues de convertir los tipos (coerción); === compara el valor Y el tipo, sin conversiones. Por eso "5" == 5 es true, pero "5" === 5 es false. En la practica casi siempre quieres ===: evita bugs sutiles donde un string y un numero se comparan "iguales" quiz por accidente.',
            ),
            js(
              '"5" == 5     // true  (coerción: "5" se convierte a numero)\n"5" === 5    // false (tipos distintos: string vs number)\n0 == false   // true  (coerción)\n0 === false  // false\nnull == undefined  // true\nnull === undefined // false',
            ),
            text(
              'Tarea: completa la función esIgualEstricto(a, b) para que devuelva true solo si a y b tienen el mismo valor Y el mismo tipo (usa ===).',
            ),
          ],
          blocksEn: [
            text(
              '== compares after converting types (coercion); === compares both value AND type, no conversions. That is why "5" == 5 is true but "5" === 5 is false. In practice you almost always want ===: it avoids subtle bugs where a string and a number compare "equal" by accident.',
            ),
            js(
              '"5" == 5     // true  (coercion: "5" is converted to a number)\n"5" === 5    // false (different types: string vs number)\n0 == false   // true  (coercion)\n0 === false  // false\nnull == undefined  // true\nnull === undefined // false',
            ),
            text(
              'Task: complete strictEquals(a, b) so it returns true only if a and b have the same value AND the same type (use ===).',
            ),
          ],
          starterCode:
            'function esIgualEstricto(a, b) {\n  // tu código aquí\n}\n',
          assertions:
            'assert(typeof esIgualEstricto === "function", "Debes definir la funcion esIgualEstricto");\nassert(esIgualEstricto(5, 5) === true, "5 y 5 deberian ser iguales");\nassert(esIgualEstricto("5", 5) === false, "\'5\' (string) y 5 (number) NO deberian ser iguales");\nassert(esIgualEstricto(0, false) === false, "0 y false NO deberian ser iguales");\nassert(esIgualEstricto(null, undefined) === false, "null y undefined NO deberian ser iguales");\nassert(esIgualEstricto("a", "a") === true, "\'a\' y \'a\' deberian ser iguales");',
          experience: 20,
          coins: 10,
        }),
        quizExercise({
          title: { es: 'Quiz: variables y tipos', en: 'Quiz: variables and types' },
          description: {
            es: 'Repasa lo que acabas de aprender.',
            en: 'Review what you just learned.',
          },
          questionsEs: [
            {
              question: '¿Cuál es la diferencia principal entre let y const?',
              options: [
                'const es más rápida que let',
                'const no permite reasignar la variable, let sí',
                'let solo funciona con números',
                'No hay ninguna diferencia real',
              ],
              correct: [1],
              isMultiple: false,
              explanation:
                'const crea un enlace inmutable al valor (no puedes reasignarlo); let sí permite reasignación. Ambas son de bloque (a diferencia de var).',
            },
            {
              question: '¿Qué devuelve typeof null?',
              options: ['"null"', '"undefined"', '"object"', '"boolean"'],
              correct: [2],
              isMultiple: false,
              explanation:
                'Es una rareza histórica del lenguaje: typeof null devuelve "object", aunque null no es realmente un objeto.',
            },
            {
              question: '¿Qué expresiones son true? (selecciona todas las que apliquen)',
              options: ['"5" == 5', '"5" === 5', '0 == false', '0 === false'],
              correct: [0, 2],
              isMultiple: true,
              explanation:
                '== hace coerción de tipos antes de comparar, por eso "5" == 5 y 0 == false son true. === nunca convierte tipos, así que las versiones con === son false.',
            },
            {
              question: 'var, a diferencia de let y const...',
              options: [
                'no existe en JavaScript moderno',
                'ignora el scope de bloque y solo respeta el de función',
                'solo puede usarse dentro de funciones flecha',
                'obliga a inicializar la variable',
              ],
              correct: [1],
              isMultiple: false,
              explanation:
                'var tiene function scope, no block scope: una var declarada dentro de un if o un for "se escapa" del bloque, lo que suele causar bugs. Por eso se prefiere let/const.',
            },
          ],
          questionsEn: [
            {
              question: 'What is the main difference between let and const?',
              options: [
                'const is faster than let',
                'const cannot be reassigned, let can',
                'let only works with numbers',
                'There is no real difference',
              ],
              correct: [1],
              isMultiple: false,
              explanation:
                'const creates an immutable binding to the value (you cannot reassign it); let allows reassignment. Both are block-scoped (unlike var).',
            },
            {
              question: 'What does typeof null return?',
              options: ['"null"', '"undefined"', '"object"', '"boolean"'],
              correct: [2],
              isMultiple: false,
              explanation:
                'It is a historical quirk of the language: typeof null returns "object", even though null is not really an object.',
            },
            {
              question: 'Which expressions are true? (select all that apply)',
              options: ['"5" == 5', '"5" === 5', '0 == false', '0 === false'],
              correct: [0, 2],
              isMultiple: true,
              explanation:
                '== coerces types before comparing, so "5" == 5 and 0 == false are true. === never converts types, so the === versions are false.',
            },
            {
              question: 'var, unlike let and const...',
              options: [
                'does not exist in modern JavaScript',
                'ignores block scope and only respects function scope',
                'can only be used inside arrow functions',
                'forces you to initialize the variable',
              ],
              correct: [1],
              isMultiple: false,
              explanation:
                'var is function-scoped, not block-scoped: a var declared inside an if or a for "leaks" out of the block, which often causes bugs. That is why let/const are preferred.',
            },
          ],
          experience: 25,
          coins: 12,
        }),
      ],
    },

    // ------------------------------------------------------------------
    // Lección 2 — Operadores y expresiones
    // ------------------------------------------------------------------
    {
      title: { es: 'Operadores y expresiones', en: 'Operators and expressions' },
      description: {
        es: 'Aritméticos, de comparación, lógicos, y el orden en que se evalúan.',
        en: 'Arithmetic, comparison, logical operators, and evaluation order.',
      },
      exercises: [
        codeExercise({
          title: { es: 'Operadores aritméticos y de asignación', en: 'Arithmetic and assignment operators' },
          description: {
            es: 'Calcula el precio final de un producto con descuento e impuestos.',
            en: 'Calculate the final price of a product with a discount and taxes.',
          },
          blocksEs: [
            text(
              'Los operadores aritméticos son +, -, *, /, % (módulo: el resto de una división) y ** (potencia). Los operadores de asignación combinada como += , -= , *= son un atajo: x += 5 es lo mismo que x = x + 5.',
            ),
            js(
              'let x = 10;\nx += 5;   // x = 15\nx *= 2;   // x = 30\n\n7 % 2     // 1 (el resto de 7 / 2)\n2 ** 10   // 1024 (2 elevado a la 10)',
            ),
            text(
              'Tarea: dado un precio base, aplica un 20% de descuento y luego suma 16% de impuesto sobre el precio ya descontado. Guarda el resultado en precioFinal (número, puedes dejar decimales).',
            ),
          ],
          blocksEn: [
            text(
              'Arithmetic operators are +, -, *, /, % (modulo: the remainder of a division) and ** (power). Compound assignment operators like += , -= , *= are shorthand: x += 5 is the same as x = x + 5.',
            ),
            js(
              'let x = 10;\nx += 5;   // x = 15\nx *= 2;   // x = 30\n\n7 % 2     // 1 (the remainder of 7 / 2)\n2 ** 10   // 1024 (2 to the power of 10)',
            ),
            text(
              'Task: given a base price, apply a 20% discount and then add 16% tax on top of the discounted price. Store the result in finalPrice (a number, decimals are fine).',
            ),
          ],
          starterCode:
            'const precioBase = 200;\n\n// calcula precioFinal: precioBase con 20% de descuento, y luego +16% de impuesto\n',
          assertions:
            'assert(typeof precioFinal === "number", "precioFinal debe ser un numero");\nassert(Math.abs(precioFinal - 185.6) < 0.01, "precioFinal deberia ser 185.6 (200 - 20% = 160, 160 + 16% = 185.6)");',
          experience: 15,
          coins: 8,
        }),
        codeExercise({
          title: { es: 'Operadores lógicos y cortocircuito', en: 'Logical operators and short-circuiting' },
          description: {
            es: 'Usa &&, || y ?? para dar valores por defecto.',
            en: 'Use &&, || and ?? to provide default values.',
          },
          blocksEs: [
            text(
              '&& y || no solo devuelven true/false: devuelven uno de sus dos operandos. a || b devuelve a si a es "truthy", si no devuelve b — por eso se usa para valores por defecto. ?? (nullish coalescing) es parecido pero solo cae al valor por defecto si el primero es null o undefined (a diferencia de ||, que también cae con 0, "" o false).',
            ),
            js(
              'const nombre = "" || "Invitado";   // "Invitado" ("" es falsy)\nconst edad = 0 ?? 18;              // 0 (0 no es null/undefined, ?? lo respeta)\nconst edad2 = 0 || 18;             // 18 (0 es falsy para ||)',
            ),
            text(
              'Tarea: completa obtenerApodo(apodo) para que devuelva el apodo recibido si no es null ni undefined, y "Anónimo" en caso contrario (usa ??, no ||, porque un apodo de string vacío "" debe respetarse).',
            ),
          ],
          blocksEn: [
            text(
              '&& and || do not just return true/false: they return one of their two operands. a || b returns a if a is "truthy", otherwise it returns b — that is why it is used for default values. ?? (nullish coalescing) is similar but only falls back if the first value is null or undefined (unlike ||, which also falls back on 0, "" or false).',
            ),
            js(
              'const name = "" || "Guest";   // "Guest" ("" is falsy)\nconst age = 0 ?? 18;          // 0 (0 is not null/undefined, ?? respects it)\nconst age2 = 0 || 18;         // 18 (0 is falsy for ||)',
            ),
            text(
              'Task: complete getNickname(nickname) so it returns the given nickname if it is not null or undefined, and "Anonymous" otherwise (use ??, not ||, because an empty string "" nickname must be respected).',
            ),
          ],
          starterCode:
            'function obtenerApodo(apodo) {\n  // tu código aquí\n}\n',
          assertions:
            'assert(typeof obtenerApodo === "function", "Debes definir obtenerApodo");\nassert(obtenerApodo("Neo") === "Neo", "Deberia devolver el apodo si existe");\nassert(obtenerApodo("") === "", "Un string vacio es un apodo valido, no deberia reemplazarse");\nassert(obtenerApodo(null) === "Anónimo", "null deberia devolver Anónimo");\nassert(obtenerApodo(undefined) === "Anónimo", "undefined deberia devolver Anónimo");',
          experience: 20,
          coins: 10,
        }),
        quizExercise({
          title: { es: 'Quiz: operadores', en: 'Quiz: operators' },
          description: { es: 'Confirma que dominas la precedencia y el cortocircuito.', en: 'Confirm you master precedence and short-circuiting.' },
          questionsEs: [
            {
              question: '¿Cuánto es 7 % 2?',
              options: ['3.5', '1', '0', '2'],
              correct: [1],
              isMultiple: false,
              explanation: '% es el operador módulo: devuelve el resto de la división. 7 dividido 2 es 3 con resto 1.',
            },
            {
              question: '¿Qué devuelve "" || "valor por defecto"?',
              options: ['""', '"valor por defecto"', 'undefined', 'false'],
              correct: [1],
              isMultiple: false,
              explanation: '"" es un valor falsy, así que || sigue evaluando y devuelve el segundo operando.',
            },
            {
              question: '¿Cuándo usarías ?? en vez de ||?',
              options: [
                'Nunca, son idénticos',
                'Cuando quieres que 0, "" o false se traten como válidos y solo null/undefined activen el valor por defecto',
                'Solo funciona con números',
                'Cuando quieres comparar tipos estrictamente',
              ],
              correct: [1],
              isMultiple: false,
              explanation: '?? solo cae al valor por defecto si el operando izquierdo es null o undefined, respetando otros valores falsy como 0 o "".',
            },
            {
              question: '¿Qué imprime: console.log(2 ** 3 + 1)?',
              options: ['9', '16', '7', '8'],
              correct: [0],
              isMultiple: false,
              explanation: '** tiene mayor precedencia que +, así que se evalúa como (2**3) + 1 = 8 + 1 = 9.',
            },
          ],
          questionsEn: [
            {
              question: 'What is 7 % 2?',
              options: ['3.5', '1', '0', '2'],
              correct: [1],
              isMultiple: false,
              explanation: '% is the modulo operator: it returns the remainder of the division. 7 divided by 2 is 3 with remainder 1.',
            },
            {
              question: 'What does "" || "default value" return?',
              options: ['""', '"default value"', 'undefined', 'false'],
              correct: [1],
              isMultiple: false,
              explanation: '"" is a falsy value, so || keeps evaluating and returns the second operand.',
            },
            {
              question: 'When would you use ?? instead of ||?',
              options: [
                'Never, they are identical',
                'When you want 0, "" or false to be treated as valid and only null/undefined should trigger the default',
                'It only works with numbers',
                'When you want to strictly compare types',
              ],
              correct: [1],
              isMultiple: false,
              explanation: '?? only falls back to the default when the left operand is null or undefined, respecting other falsy values like 0 or "".',
            },
            {
              question: 'What does console.log(2 ** 3 + 1) print?',
              options: ['9', '16', '7', '8'],
              correct: [0],
              isMultiple: false,
              explanation: '** has higher precedence than +, so it evaluates as (2**3) + 1 = 8 + 1 = 9.',
            },
          ],
          experience: 25,
          coins: 12,
        }),
      ],
    },

    // ------------------------------------------------------------------
    // Lección 3 — Control de flujo
    // ------------------------------------------------------------------
    {
      title: { es: 'Control de flujo', en: 'Control flow' },
      description: {
        es: 'if/else, switch y el operador ternario para tomar decisiones.',
        en: 'if/else, switch and the ternary operator for decision making.',
      },
      exercises: [
        codeExercise({
          title: { es: 'Clasificador con if/else', en: 'Classifier with if/else' },
          description: {
            es: 'Escribe una función que clasifique una edad en categorías.',
            en: 'Write a function that classifies an age into categories.',
          },
          blocksEs: [
            text(
              'if evalúa una condición: si es truthy ejecuta el bloque, si no pasa al else. Puedes encadenar varios con else if para más de dos caminos. La condición no tiene que ser un booleano puro: cualquier valor truthy/falsy funciona (por eso if (edad) es distinto de if (edad > 0)).',
            ),
            js(
              'function clasificar(n) {\n  if (n < 0) return "invalido";\n  else if (n < 10) return "chico";\n  else return "grande";\n}',
            ),
            text(
              'Tarea: completa categoriaEdad(edad) para que devuelva "bebe" si edad < 2, "niño" si edad < 13, "adolescente" si edad < 18, y "adulto" en cualquier otro caso.',
            ),
          ],
          blocksEn: [
            text(
              'if evaluates a condition: if it is truthy it runs the block, otherwise it falls through to else. You can chain several with else if for more than two paths. The condition does not have to be a pure boolean: any truthy/falsy value works (that is why if (age) is different from if (age > 0)).',
            ),
            js(
              'function classify(n) {\n  if (n < 0) return "invalid";\n  else if (n < 10) return "small";\n  else return "large";\n}',
            ),
            text(
              'Task: complete ageCategory(age) so it returns "baby" if age < 2, "child" if age < 13, "teen" if age < 18, and "adult" for anything else.',
            ),
          ],
          starterCode:
            'function categoriaEdad(edad) {\n  // tu código aquí\n}\n',
          assertions:
            'assert(typeof categoriaEdad === "function", "Debes definir categoriaEdad");\nassert(categoriaEdad(1) === "bebe", "1 deberia ser bebe");\nassert(categoriaEdad(8) === "niño", "8 deberia ser niño");\nassert(categoriaEdad(15) === "adolescente", "15 deberia ser adolescente");\nassert(categoriaEdad(30) === "adulto", "30 deberia ser adulto");',
          experience: 15,
          coins: 8,
        }),
        codeExercise({
          title: { es: 'switch y el operador ternario', en: 'switch and the ternary operator' },
          description: {
            es: 'Convierte un número de día en su nombre usando switch.',
            en: 'Convert a day number into its name using switch.',
          },
          blocksEs: [
            text(
              'switch compara un valor contra varios case con === (comparación estricta). No olvides break: sin él, la ejecución "cae" al siguiente case (esto se llama fall-through y a veces es intencional, pero casi siempre es un bug). El operador ternario cond ? valorSiTrue : valorSiFalse es una forma compacta de un if/else que devuelve un valor.',
            ),
            js(
              'function saludo(esDeNoche) {\n  return esDeNoche ? "Buenas noches" : "Buenos días";\n}\n\nswitch (mes) {\n  case 12:\n  case 1:\n  case 2:\n    estacion = "invierno";\n    break;\n  default:\n    estacion = "otra";\n}',
            ),
            text(
              'Tarea: completa nombreDia(n) usando switch, donde 1="Lunes", 2="Martes", 3="Miércoles", 4="Jueves", 5="Viernes", 6="Sábado", 7="Domingo", y cualquier otro número devuelve "Desconocido" (usa default).',
            ),
          ],
          blocksEn: [
            text(
              'switch compares a value against several case labels using === (strict comparison). Do not forget break: without it, execution "falls through" to the next case (this is called fall-through and is sometimes intentional, but is almost always a bug). The ternary operator cond ? valueIfTrue : valueIfFalse is a compact if/else that returns a value.',
            ),
            js(
              'function greeting(isNight) {\n  return isNight ? "Good evening" : "Good morning";\n}\n\nswitch (month) {\n  case 12:\n  case 1:\n  case 2:\n    season = "winter";\n    break;\n  default:\n    season = "other";\n}',
            ),
            text(
              'Task: complete dayName(n) using switch, where 1="Monday", 2="Tuesday", 3="Wednesday", 4="Thursday", 5="Friday", 6="Saturday", 7="Sunday", and any other number returns "Unknown" (use default).',
            ),
          ],
          starterCode:
            'function nombreDia(n) {\n  // tu código aquí, usa switch\n}\n',
          assertions:
            'assert(typeof nombreDia === "function", "Debes definir nombreDia");\nassert(nombreDia(1) === "Lunes", "1 deberia ser Lunes");\nassert(nombreDia(5) === "Viernes", "5 deberia ser Viernes");\nassert(nombreDia(7) === "Domingo", "7 deberia ser Domingo");\nassert(nombreDia(9) === "Desconocido", "9 deberia ser Desconocido");',
          experience: 20,
          coins: 10,
        }),
        quizExercise({
          title: { es: 'Quiz: control de flujo', en: 'Quiz: control flow' },
          description: { es: 'Confirma que dominas if/else y switch.', en: 'Confirm you master if/else and switch.' },
          questionsEs: [
            {
              question: '¿Qué pasa si olvidas el break dentro de un case de switch?',
              options: [
                'JavaScript lanza un error de sintaxis',
                'La ejecución "cae" al siguiente case (fall-through)',
                'El switch simplemente no hace nada',
                'Se ejecuta solo el default',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'Sin break, la ejecución continúa en el siguiente case sin volver a evaluar su condición: esto es fall-through.',
            },
            {
              question: '¿Qué compara switch entre el valor y cada case?',
              options: ['== (con coerción)', '=== (estricta)', 'Object.is', 'No compara, solo evalúa booleanos'],
              correct: [1],
              isMultiple: false,
              explanation: 'switch usa comparación estricta (===) entre la expresión y cada case.',
            },
            {
              question: '¿Qué devuelve: (5 > 3) ? "si" : "no"?',
              options: ['"si"', '"no"', 'true', 'undefined'],
              correct: [0],
              isMultiple: false,
              explanation: '5 > 3 es true, así que el operador ternario devuelve el valor antes de los dos puntos: "si".',
            },
            {
              question: 'if (edad) { ... } (sin comparación) se ejecuta cuando...',
              options: [
                'edad es exactamente true',
                'edad es un valor truthy (distinto de 0, "", null, undefined, NaN, false)',
                'edad es un número positivo únicamente',
                'Nunca se ejecuta sin comparación explícita',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'if convierte internamente su condición a booleano; cualquier valor truthy activa el bloque, no solo true literal.',
            },
          ],
          questionsEn: [
            {
              question: 'What happens if you forget break inside a switch case?',
              options: [
                'JavaScript throws a syntax error',
                'Execution "falls through" to the next case',
                'The switch simply does nothing',
                'Only the default runs',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'Without break, execution continues into the next case without re-evaluating its condition: this is fall-through.',
            },
            {
              question: 'What comparison does switch use between the value and each case?',
              options: ['== (with coercion)', '=== (strict)', 'Object.is', 'It does not compare, it only evaluates booleans'],
              correct: [1],
              isMultiple: false,
              explanation: 'switch uses strict comparison (===) between the expression and each case.',
            },
            {
              question: 'What does (5 > 3) ? "yes" : "no" return?',
              options: ['"yes"', '"no"', 'true', 'undefined'],
              correct: [0],
              isMultiple: false,
              explanation: '5 > 3 is true, so the ternary operator returns the value before the colon: "yes".',
            },
            {
              question: 'if (age) { ... } (with no comparison) runs when...',
              options: [
                'age is exactly true',
                'age is a truthy value (anything other than 0, "", null, undefined, NaN, false)',
                'age is a positive number only',
                'It never runs without an explicit comparison',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'if internally converts its condition to a boolean; any truthy value triggers the block, not just literal true.',
            },
          ],
          experience: 25,
          coins: 12,
        }),
      ],
    },

    // ------------------------------------------------------------------
    // Lección 4 — Bucles e iteración
    // ------------------------------------------------------------------
    {
      title: { es: 'Bucles e iteración', en: 'Loops and iteration' },
      description: {
        es: 'for, while, do-while, y cómo cortar o saltar iteraciones con break/continue.',
        en: 'for, while, do-while, and how to cut or skip iterations with break/continue.',
      },
      exercises: [
        codeExercise({
          title: { es: 'El bucle for clásico', en: 'The classic for loop' },
          description: {
            es: 'Suma los números de un rango usando un for.',
            en: 'Sum the numbers of a range using a for loop.',
          },
          blocksEs: [
            text(
              'for (inicialización; condición; paso) { ... } es el bucle más común: se ejecuta la inicialización una vez, luego repite el bloque mientras la condición sea true, ejecutando el paso al final de cada vuelta. while (condición) { ... } es más simple: repite mientras la condición sea true, útil cuando no sabes de antemano cuántas vueltas serán.',
            ),
            js(
              'let total = 0;\nfor (let i = 1; i <= 5; i++) {\n  total += i;\n}\n// total termina en 15 (1+2+3+4+5)\n\nlet n = 10;\nwhile (n > 0) {\n  n = n - 3;\n}\n// n termina en -2 (10,7,4,1,-2)',
            ),
            text(
              'Tarea: completa sumaRango(desde, hasta) para que sume todos los enteros de desde a hasta, ambos incluidos, usando un for.',
            ),
          ],
          blocksEn: [
            text(
              'for (init; condition; step) { ... } is the most common loop: the init runs once, then the block repeats while condition is true, running step at the end of each pass. while (condition) { ... } is simpler: it repeats while the condition is true, useful when you do not know in advance how many passes there will be.',
            ),
            js(
              'let total = 0;\nfor (let i = 1; i <= 5; i++) {\n  total += i;\n}\n// total ends at 15 (1+2+3+4+5)\n\nlet n = 10;\nwhile (n > 0) {\n  n = n - 3;\n}\n// n ends at -2 (10,7,4,1,-2)',
            ),
            text(
              'Task: complete sumRange(from, to) so it sums all integers from from to to, both included, using a for loop.',
            ),
          ],
          starterCode:
            'function sumaRango(desde, hasta) {\n  // tu código aquí\n}\n',
          assertions:
            'assert(typeof sumaRango === "function", "Debes definir sumaRango");\nassert(sumaRango(1, 5) === 15, "sumaRango(1,5) deberia ser 15");\nassert(sumaRango(1, 1) === 1, "sumaRango(1,1) deberia ser 1");\nassert(sumaRango(5, 1) === 0, "sumaRango(5,1) deberia ser 0 (rango invalido, no se suma nada)");',
          experience: 15,
          coins: 8,
        }),
        codeExercise({
          title: { es: 'break y continue', en: 'break and continue' },
          description: {
            es: 'Filtra valores dentro de un bucle usando continue, y detente antes con break.',
            en: 'Filter values inside a loop using continue, and stop early with break.',
          },
          blocksEs: [
            text(
              'break sale inmediatamente del bucle. continue salta el resto del cuerpo del bucle actual y pasa a la siguiente iteración (no sale del bucle, solo se salta esa vuelta). Son especialmente útiles para evitar anidar muchos if dentro de un bucle.',
            ),
            js(
              'for (let i = 1; i <= 10; i++) {\n  if (i % 2 !== 0) continue; // salta los impares\n  if (i > 6) break;          // se detiene al llegar a 8\n  console.log(i);            // imprime 2, 4, 6\n}',
            ),
            text(
              'Tarea: completa primerMultiploDe(base, lista) para que devuelva el primer número de lista que sea múltiplo de base (usa break o return apenas lo encuentres), o -1 si ninguno lo es.',
            ),
          ],
          blocksEn: [
            text(
              'break exits the loop immediately. continue skips the rest of the current loop body and moves to the next iteration (it does not exit the loop, it just skips that pass). They are especially useful to avoid nesting many ifs inside a loop.',
            ),
            js(
              'for (let i = 1; i <= 10; i++) {\n  if (i % 2 !== 0) continue; // skip odd numbers\n  if (i > 6) break;          // stops once it reaches 8\n  console.log(i);            // prints 2, 4, 6\n}',
            ),
            text(
              'Task: complete firstMultipleOf(base, list) so it returns the first number in list that is a multiple of base (use break or return as soon as you find it), or -1 if none is.',
            ),
          ],
          starterCode:
            'function primerMultiploDe(base, lista) {\n  // tu código aquí\n}\n',
          assertions:
            'assert(typeof primerMultiploDe === "function", "Debes definir primerMultiploDe");\nassert(primerMultiploDe(3, [1, 2, 4, 9, 12]) === 9, "El primer multiplo de 3 deberia ser 9");\nassert(primerMultiploDe(5, [1, 2, 3]) === -1, "Si no hay multiplos deberia devolver -1");\nassert(primerMultiploDe(2, [4, 6, 8]) === 4, "El primer multiplo de 2 deberia ser 4");',
          experience: 20,
          coins: 10,
        }),
        quizExercise({
          title: { es: 'Quiz: bucles', en: 'Quiz: loops' },
          description: { es: 'Repasa for, while, break y continue.', en: 'Review for, while, break and continue.' },
          questionsEs: [
            {
              question: '¿Cuál es la diferencia entre break y continue?',
              options: [
                'Son sinónimos',
                'break sale del bucle por completo; continue salta a la siguiente iteración',
                'break solo funciona en while, continue solo en for',
                'continue sale del bucle; break salta la iteración',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'break termina el bucle inmediatamente. continue omite el resto del cuerpo actual pero el bucle sigue con la siguiente vuelta.',
            },
            {
              question: '¿Cuántas veces se ejecuta el cuerpo de: for (let i = 0; i < 3; i++) { ... }?',
              options: ['2', '3', '4', 'Infinitas'],
              correct: [1],
              isMultiple: false,
              explanation: 'i toma los valores 0, 1, 2 (se detiene cuando i < 3 es false, es decir en i=3), son 3 iteraciones.',
            },
            {
              question: '¿Cuándo es más natural usar while en vez de for?',
              options: [
                'Nunca, for siempre es mejor',
                'Cuando no sabes de antemano cuántas iteraciones habrá y dependen de una condición externa',
                'while es más rápido que for siempre',
                'while no puede usarse con break',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'while brilla cuando el número de iteraciones depende de una condición que cambia de forma no numérica y predecible, a diferencia del contador típico de for.',
            },
            {
              question: 'do { ... } while (condición) se diferencia de while (condición) { ... } en que...',
              options: [
                'do-while nunca termina',
                'do-while ejecuta el bloque al menos una vez, incluso si la condición es falsa desde el inicio',
                'No hay ninguna diferencia',
                'do-while no admite break',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'do-while evalúa la condición DESPUÉS de ejecutar el bloque, así que el cuerpo siempre corre al menos una vez.',
            },
          ],
          questionsEn: [
            {
              question: 'What is the difference between break and continue?',
              options: [
                'They are synonyms',
                'break exits the loop entirely; continue skips to the next iteration',
                'break only works in while, continue only in for',
                'continue exits the loop; break skips the iteration',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'break ends the loop immediately. continue skips the rest of the current body but the loop continues with the next pass.',
            },
            {
              question: 'How many times does the body run in: for (let i = 0; i < 3; i++) { ... }?',
              options: ['2', '3', '4', 'Infinite'],
              correct: [1],
              isMultiple: false,
              explanation: 'i takes the values 0, 1, 2 (it stops when i < 3 is false, i.e. at i=3), that is 3 iterations.',
            },
            {
              question: 'When is it more natural to use while instead of for?',
              options: [
                'Never, for is always better',
                'When you do not know in advance how many iterations there will be and it depends on an external condition',
                'while is always faster than for',
                'while cannot be used with break',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'while shines when the number of iterations depends on a condition that changes in a non-numeric, unpredictable way, unlike the typical for counter.',
            },
            {
              question: 'do { ... } while (condition) differs from while (condition) { ... } in that...',
              options: [
                'do-while never ends',
                'do-while runs the block at least once, even if the condition is false from the start',
                'There is no difference',
                'do-while does not support break',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'do-while checks the condition AFTER running the block, so the body always runs at least once.',
            },
          ],
          experience: 25,
          coins: 12,
        }),
      ],
    },

    // ------------------------------------------------------------------
    // Lección 5 — Funciones I
    // ------------------------------------------------------------------
    {
      title: { es: 'Funciones I', en: 'Functions I' },
      description: {
        es: 'Declaración, parámetros, valores de retorno, y funciones como valores.',
        en: 'Declaration, parameters, return values, and functions as values.',
      },
      exercises: [
        codeExercise({
          title: { es: 'Parámetros, retorno y valores por defecto', en: 'Parameters, return and default values' },
          description: {
            es: 'Escribe una función con un parámetro opcional.',
            en: 'Write a function with an optional parameter.',
          },
          blocksEs: [
            text(
              'Una función es un bloque de código reutilizable que recibe parámetros y puede devolver un valor con return. Si no hay return explícito, la función devuelve undefined. Los parámetros pueden tener un valor por defecto que se usa solo si no se pasa ese argumento (o se pasa undefined).',
            ),
            js(
              'function potencia(base, exponente = 2) {\n  return base ** exponente;\n}\n\npotencia(3);     // 9  (exponente usa el default: 2)\npotencia(3, 3);  // 27',
            ),
            text(
              'Tarea: completa saludar(nombre, saludo) donde saludo tiene el valor por defecto "Hola", y la función devuelve el string saludo + ", " + nombre + "!" (por ejemplo: "Hola, Ada!").',
            ),
          ],
          blocksEn: [
            text(
              'A function is a reusable block of code that receives parameters and can return a value with return. If there is no explicit return, the function returns undefined. Parameters can have a default value that is used only when that argument is not passed (or is passed as undefined).',
            ),
            js(
              'function power(base, exponent = 2) {\n  return base ** exponent;\n}\n\npower(3);     // 9  (exponent uses the default: 2)\npower(3, 3);  // 27',
            ),
            text(
              'Task: complete greet(name, greeting) where greeting defaults to "Hello", and the function returns the string greeting + ", " + name + "!" (for example: "Hello, Ada!").',
            ),
          ],
          starterCode:
            'function saludar(nombre, saludo) {\n  // tu código aquí\n}\n',
          assertions:
            'assert(typeof saludar === "function", "Debes definir saludar");\nassert(saludar("Ada") === "Hola, Ada!", "Sin saludo explicito deberia usar el default Hola");\nassert(saludar("Ada", "Buenas") === "Buenas, Ada!", "Con saludo explicito deberia usarlo");',
          experience: 15,
          coins: 8,
        }),
        codeExercise({
          title: { es: 'Funciones como valores (callbacks básicos)', en: 'Functions as values (basic callbacks)' },
          description: {
            es: 'Pasa una función como argumento de otra.',
            en: 'Pass a function as an argument to another.',
          },
          blocksEs: [
            text(
              'En JavaScript las funciones son "ciudadanos de primera clase": se pueden guardar en variables, pasar como argumentos a otras funciones, y devolver desde otras funciones. Una función que recibe otra función como parámetro (o la devuelve) es de "orden superior". Esto es la base de map/filter/reduce que verás más adelante.',
            ),
            js(
              'function aplicarDosVeces(fn, valor) {\n  return fn(fn(valor));\n}\n\nfunction duplicar(x) { return x * 2; }\n\naplicarDosVeces(duplicar, 3); // 12  (duplicar(duplicar(3)) = duplicar(6) = 12)',
            ),
            text(
              'Tarea: completa operar(a, b, operacion) que reciba dos números y una función operacion(x, y), y devuelva el resultado de llamar operacion(a, b).',
            ),
          ],
          blocksEn: [
            text(
              'In JavaScript functions are "first-class citizens": they can be stored in variables, passed as arguments to other functions, and returned from other functions. A function that receives another function as a parameter (or returns one) is "higher-order". This is the foundation of map/filter/reduce that you will see later.',
            ),
            js(
              'function applyTwice(fn, value) {\n  return fn(fn(value));\n}\n\nfunction double(x) { return x * 2; }\n\napplyTwice(double, 3); // 12  (double(double(3)) = double(6) = 12)',
            ),
            text(
              'Task: complete operate(a, b, operation) that receives two numbers and a function operation(x, y), and returns the result of calling operation(a, b).',
            ),
          ],
          starterCode:
            'function operar(a, b, operacion) {\n  // tu código aquí\n}\n',
          assertions:
            'assert(typeof operar === "function", "Debes definir operar");\nassert(operar(2, 3, function (x, y) { return x + y; }) === 5, "Deberia sumar usando la funcion recibida");\nassert(operar(4, 2, function (x, y) { return x - y; }) === 2, "Deberia restar usando la funcion recibida");\nassert(operar(3, 3, function (x, y) { return x * y; }) === 9, "Deberia multiplicar usando la funcion recibida");',
          experience: 20,
          coins: 10,
        }),
        quizExercise({
          title: { es: 'Quiz: funciones', en: 'Quiz: functions' },
          description: { es: 'Repasa parámetros, retorno y funciones como valores.', en: 'Review parameters, return and functions as values.' },
          questionsEs: [
            {
              question: '¿Qué devuelve una función sin una sentencia return explícita?',
              options: ['null', 'undefined', '0', 'Un error'],
              correct: [1],
              isMultiple: false,
              explanation: 'Si no hay return, JavaScript devuelve undefined implícitamente al llegar al final de la función.',
            },
            {
              question: '¿Cuándo se usa el valor por defecto de un parámetro?',
              options: [
                'Siempre, sin importar qué se pase',
                'Solo cuando el argumento no se pasa, o se pasa explícitamente como undefined',
                'Solo si el parámetro es un número',
                'Nunca, JavaScript no soporta valores por defecto',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'El valor por defecto se activa cuando el argumento correspondiente falta o es undefined; con null u otro valor, no se usa el default.',
            },
            {
              question: 'Que las funciones sean "de primera clase" en JS significa que...',
              options: [
                'Solo pueden llamarse una vez',
                'Se pueden guardar en variables, pasar como argumentos y devolver desde otras funciones',
                'Solo funcionan dentro de clases',
                'Requieren siempre la palabra clave function',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'Ser "de primera clase" significa que las funciones se tratan como cualquier otro valor: se asignan, se pasan y se retornan.',
            },
            {
              question: 'Una función de "orden superior" es aquella que...',
              options: [
                'Tiene más de 10 líneas de código',
                'Recibe una función como argumento y/o devuelve una función',
                'Solo existe dentro de un array',
                'Se ejecuta más rápido que las demás',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'Orden superior = opera con funciones: las recibe como parámetros o las devuelve como resultado (o ambas).',
            },
          ],
          questionsEn: [
            {
              question: 'What does a function return without an explicit return statement?',
              options: ['null', 'undefined', '0', 'An error'],
              correct: [1],
              isMultiple: false,
              explanation: 'Without a return, JavaScript implicitly returns undefined when it reaches the end of the function.',
            },
            {
              question: 'When is a parameter default value used?',
              options: [
                'Always, no matter what is passed',
                'Only when the argument is not passed, or is explicitly passed as undefined',
                'Only if the parameter is a number',
                'Never, JavaScript does not support default values',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'The default kicks in when the corresponding argument is missing or undefined; with null or another value, the default is not used.',
            },
            {
              question: 'Functions being "first-class" in JS means...',
              options: [
                'They can only be called once',
                'They can be stored in variables, passed as arguments, and returned from other functions',
                'They only work inside classes',
                'They always require the function keyword',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'Being "first-class" means functions are treated like any other value: assigned, passed around, and returned.',
            },
            {
              question: 'A "higher-order" function is one that...',
              options: [
                'Has more than 10 lines of code',
                'Receives a function as an argument and/or returns a function',
                'Only exists inside an array',
                'Runs faster than other functions',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'Higher-order = operates on functions: it receives them as parameters or returns them as a result (or both).',
            },
          ],
          experience: 25,
          coins: 12,
        }),
      ],
    },

    // ------------------------------------------------------------------
    // Lección 6 — Arrays: fundamentos y métodos de mutación
    // ------------------------------------------------------------------
    {
      title: { es: 'Arrays: fundamentos', en: 'Arrays: fundamentals' },
      description: {
        es: 'Crear, indexar y mutar arrays con push, pop, shift, unshift y splice.',
        en: 'Create, index and mutate arrays with push, pop, shift, unshift and splice.',
      },
      exercises: [
        codeExercise({
          title: { es: 'Indexar y mutar un array', en: 'Indexing and mutating an array' },
          description: {
            es: 'Manipula una lista de tareas con métodos que modifican el array original.',
            en: 'Manipulate a task list with methods that modify the original array.',
          },
          blocksEs: [
            text(
              'Un array se indexa desde 0 (arr[0] es el primer elemento) y arr.length da su tamaño. push(x) agrega al final, pop() quita y devuelve el último, unshift(x) agrega al inicio, shift() quita y devuelve el primero. Todos estos métodos MUTAN el array original (lo modifican en su lugar), a diferencia de map/filter que verás luego.',
            ),
            js(
              'const frutas = ["manzana", "pera"];\nfrutas.push("uva");      // ["manzana", "pera", "uva"]\nfrutas.shift();           // quita "manzana" -> ["pera", "uva"]\nfrutas.length;            // 2',
            ),
            text(
              'Tarea: parte de const tareas = ["lavar", "cocinar"]. Usa push para agregar "estudiar" al final, y unshift para agregar "despertar" al inicio. Al terminar, tareas debe quedar exactamente ["despertar", "lavar", "cocinar", "estudiar"].',
            ),
          ],
          blocksEn: [
            text(
              'An array is indexed from 0 (arr[0] is the first element) and arr.length gives its size. push(x) adds to the end, pop() removes and returns the last one, unshift(x) adds to the start, shift() removes and returns the first one. All of these methods MUTATE the original array (modify it in place), unlike map/filter which you will see later.',
            ),
            js(
              'const fruits = ["apple", "pear"];\nfruits.push("grape");     // ["apple", "pear", "grape"]\nfruits.shift();            // removes "apple" -> ["pear", "grape"]\nfruits.length;             // 2',
            ),
            text(
              'Task: start from const tasks = ["wash", "cook"]. Use push to add "study" at the end, and unshift to add "wake up" at the start. At the end, tasks must be exactly ["wake up", "wash", "cook", "study"].',
            ),
          ],
          starterCode:
            'const tareas = ["lavar", "cocinar"];\n\n// usa push y unshift para dejar tareas como se pide\n',
          assertions:
            'assert(Array.isArray(tareas), "tareas debe seguir siendo un array");\nassert(tareas.length === 4, "tareas deberia tener 4 elementos");\nassert(tareas[0] === "despertar", "El primer elemento deberia ser despertar");\nassert(tareas[3] === "estudiar", "El ultimo elemento deberia ser estudiar");\nassert(tareas[1] === "lavar" && tareas[2] === "cocinar", "El orden del medio no deberia cambiar");',
          experience: 15,
          coins: 8,
        }),
        codeExercise({
          title: { es: 'splice: insertar y eliminar en cualquier posición', en: 'splice: insert and remove anywhere' },
          description: {
            es: 'Usa splice para editar un array en una posición específica.',
            en: 'Use splice to edit an array at a specific position.',
          },
          blocksEs: [
            text(
              'splice(inicio, cantidadAEliminar, ...itemsAInsertar) es el método más versátil: elimina cantidadAEliminar elementos desde inicio, y en su lugar inserta los items dados (puede ser ninguno). También muta el array original. includes(x) te dice si un valor existe en el array.',
            ),
            js(
              'const letras = ["a", "b", "c", "d"];\nletras.splice(1, 2);            // elimina "b" y "c" -> ["a", "d"]\nletras.splice(1, 0, "x", "y");  // inserta sin eliminar -> ["a", "x", "y", "d"]',
            ),
            text(
              'Tarea: completa reemplazarEnPosicion(arr, indice, nuevoValor) para que reemplace el elemento en indice por nuevoValor usando splice (elimina 1 elemento en esa posición e inserta nuevoValor), y devuelva el array modificado.',
            ),
          ],
          blocksEn: [
            text(
              'splice(start, deleteCount, ...itemsToInsert) is the most versatile method: it removes deleteCount elements starting at start, and inserts the given items in their place (can be none). It also mutates the original array. includes(x) tells you whether a value exists in the array.',
            ),
            js(
              'const letters = ["a", "b", "c", "d"];\nletters.splice(1, 2);            // removes "b" and "c" -> ["a", "d"]\nletters.splice(1, 0, "x", "y");  // inserts without removing -> ["a", "x", "y", "d"]',
            ),
            text(
              'Task: complete replaceAt(arr, index, newValue) so it replaces the element at index with newValue using splice (remove 1 element at that position and insert newValue), and returns the modified array.',
            ),
          ],
          starterCode:
            'function reemplazarEnPosicion(arr, indice, nuevoValor) {\n  // tu código aquí, usa splice\n}\n',
          assertions:
            'assert(typeof reemplazarEnPosicion === "function", "Debes definir reemplazarEnPosicion");\nvar r1 = reemplazarEnPosicion(["a", "b", "c"], 1, "Z");\nassert(JSON.stringify(r1) === JSON.stringify(["a", "Z", "c"]), "Deberia reemplazar el elemento en la posicion 1");\nvar r2 = reemplazarEnPosicion([1, 2, 3], 0, 99);\nassert(JSON.stringify(r2) === JSON.stringify([99, 2, 3]), "Deberia reemplazar el primer elemento");',
          experience: 20,
          coins: 10,
        }),
        quizExercise({
          title: { es: 'Quiz: arrays', en: 'Quiz: arrays' },
          description: { es: 'Repasa los métodos de mutación de arrays.', en: 'Review array mutation methods.' },
          questionsEs: [
            {
              question: '¿Qué método agrega un elemento al final de un array?',
              options: ['unshift', 'push', 'pop', 'shift'],
              correct: [1],
              isMultiple: false,
              explanation: 'push agrega uno o más elementos al final del array y devuelve la nueva longitud.',
            },
            {
              question: '¿Qué hace shift()?',
              options: [
                'Elimina y devuelve el último elemento',
                'Elimina y devuelve el primer elemento',
                'Agrega un elemento al inicio',
                'Ordena el array',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'shift() elimina el primer elemento del array y lo devuelve, recorriendo los índices del resto una posición hacia atrás.',
            },
            {
              question: '¿splice() modifica el array original o devuelve uno nuevo sin tocar el original?',
              options: [
                'Modifica el original (muta)',
                'Siempre devuelve uno nuevo sin tocar el original',
                'Depende del navegador',
                'No hace ninguna de las dos cosas',
              ],
              correct: [0],
              isMultiple: false,
              explanation: 'splice muta el array original: elimina/inserta directamente sobre él (a diferencia de slice, que no muta).',
            },
            {
              question: '¿Qué imprime: [10, 20, 30].length?',
              options: ['2', '3', '30', 'undefined'],
              correct: [1],
              isMultiple: false,
              explanation: 'length devuelve la cantidad de elementos del array, en este caso 3.',
            },
          ],
          questionsEn: [
            {
              question: 'Which method adds an element to the end of an array?',
              options: ['unshift', 'push', 'pop', 'shift'],
              correct: [1],
              isMultiple: false,
              explanation: 'push adds one or more elements to the end of the array and returns the new length.',
            },
            {
              question: 'What does shift() do?',
              options: [
                'Removes and returns the last element',
                'Removes and returns the first element',
                'Adds an element to the start',
                'Sorts the array',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'shift() removes the first element of the array and returns it, shifting the rest of the indices back by one.',
            },
            {
              question: 'Does splice() modify the original array or return a new one without touching the original?',
              options: [
                'It modifies the original (mutates)',
                'It always returns a new one without touching the original',
                'It depends on the browser',
                'Neither of those',
              ],
              correct: [0],
              isMultiple: false,
              explanation: 'splice mutates the original array: it removes/inserts directly on it (unlike slice, which does not mutate).',
            },
            {
              question: 'What does [10, 20, 30].length print?',
              options: ['2', '3', '30', 'undefined'],
              correct: [1],
              isMultiple: false,
              explanation: 'length returns the number of elements in the array, in this case 3.',
            },
          ],
          experience: 25,
          coins: 12,
        }),
      ],
    },

    // ------------------------------------------------------------------
    // Lección 7 — Objetos: literales, propiedades, this básico
    // ------------------------------------------------------------------
    {
      title: { es: 'Objetos: literales y propiedades', en: 'Objects: literals and properties' },
      description: {
        es: 'Crear objetos, acceder y modificar propiedades, y una primera mirada a this.',
        en: 'Create objects, access and modify properties, and a first look at this.',
      },
      exercises: [
        codeExercise({
          title: { es: 'Leer y modificar propiedades', en: 'Reading and modifying properties' },
          description: {
            es: 'Crea un objeto y modifica sus propiedades con dot y bracket notation.',
            en: 'Create an object and modify its properties with dot and bracket notation.',
          },
          blocksEs: [
            text(
              'Un objeto es una colección de pares clave-valor. Se accede a las propiedades con punto (obj.clave) cuando conoces el nombre exacto, o con corchetes (obj["clave"]) cuando el nombre viene de una variable o tiene caracteres especiales. Puedes agregar propiedades nuevas simplemente asignándolas.',
            ),
            js(
              'const persona = { nombre: "Ada", edad: 30 };\npersona.edad = 31;                  // modifica una propiedad existente\npersona["profesion"] = "programadora"; // agrega una nueva\n\nconst clave = "nombre";\npersona[clave];                     // "Ada" (acceso dinamico)',
            ),
            text(
              'Tarea: crea un objeto libro con las propiedades titulo ("Cien años de soledad"), autor ("García Márquez") y anio (1967). Luego agrega una propiedad nueva disponible con valor true usando bracket notation.',
            ),
          ],
          blocksEn: [
            text(
              'An object is a collection of key-value pairs. You access properties with dot notation (obj.key) when you know the exact name, or with bracket notation (obj["key"]) when the name comes from a variable or has special characters. You can add new properties just by assigning them.',
            ),
            js(
              'const person = { name: "Ada", age: 30 };\nperson.age = 31;                    // modifies an existing property\nperson["profession"] = "engineer";  // adds a new one\n\nconst key = "name";\nperson[key];                        // "Ada" (dynamic access)',
            ),
            text(
              'Task: create a book object with the properties title ("One Hundred Years of Solitude"), author ("García Márquez") and year (1967). Then add a new available property with value true using bracket notation.',
            ),
          ],
          starterCode:
            '// crea el objeto libro con titulo, autor y anio\n// luego agrega la propiedad "disponible" = true con bracket notation\n',
          assertions:
            'assert(typeof libro === "object" && libro !== null, "Debes crear el objeto libro");\nassert(libro.titulo === "Cien años de soledad", "titulo incorrecto");\nassert(libro.autor === "García Márquez", "autor incorrecto");\nassert(libro.anio === 1967, "anio incorrecto");\nassert(libro.disponible === true, "Falta la propiedad disponible = true");',
          experience: 15,
          coins: 8,
        }),
        codeExercise({
          title: { es: 'Métodos de objeto y this', en: 'Object methods and this' },
          description: {
            es: 'Agrega un método a un objeto que use this para acceder a sus propias propiedades.',
            en: 'Add a method to an object that uses this to access its own properties.',
          },
          blocksEs: [
            text(
              'Cuando una función vive dentro de un objeto se llama "método". Dentro de un método normal (declarado con la sintaxis clave() {} o clave: function() {}), this se refiere al objeto sobre el que se llamó el método — es la forma de acceder a las otras propiedades del mismo objeto desde adentro.',
            ),
            js(
              'const rectangulo = {\n  ancho: 4,\n  alto: 3,\n  area() {\n    return this.ancho * this.alto;\n  }\n};\n\nrectangulo.area(); // 12  (this === rectangulo aqui)',
            ),
            text(
              'Tarea: completa el objeto cuenta con propiedades saldo (empieza en 100) y un método depositar(monto) que sume monto a this.saldo y devuelva el nuevo saldo.',
            ),
          ],
          blocksEn: [
            text(
              'When a function lives inside an object it is called a "method". Inside a regular method (declared with key() {} or key: function() {} syntax), this refers to the object the method was called on — it is how you access the object\'s other properties from inside.',
            ),
            js(
              'const rectangle = {\n  width: 4,\n  height: 3,\n  area() {\n    return this.width * this.height;\n  }\n};\n\nrectangle.area(); // 12  (this === rectangle here)',
            ),
            text(
              'Task: complete the account object with a balance property (starts at 100) and a deposit(amount) method that adds amount to this.balance and returns the new balance.',
            ),
          ],
          starterCode:
            'const cuenta = {\n  saldo: 100,\n  // agrega el metodo depositar(monto) aqui\n};\n',
          assertions:
            'assert(typeof cuenta === "object", "cuenta debe ser un objeto");\nassert(typeof cuenta.depositar === "function", "Falta el metodo depositar");\nvar nuevoSaldo = cuenta.depositar(50);\nassert(nuevoSaldo === 150, "depositar(50) deberia devolver 150");\nassert(cuenta.saldo === 150, "el saldo del objeto tambien deberia actualizarse a 150");',
          experience: 20,
          coins: 10,
        }),
        quizExercise({
          title: { es: 'Quiz: objetos', en: 'Quiz: objects' },
          description: { es: 'Repasa propiedades, notación y this.', en: 'Review properties, notation and this.' },
          questionsEs: [
            {
              question: '¿Cuándo es obligatorio usar bracket notation en vez de dot notation?',
              options: [
                'Nunca, dot notation siempre funciona',
                'Cuando el nombre de la propiedad viene de una variable o tiene caracteres especiales/espacios',
                'Solo con arrays',
                'Solo con números',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'bracket notation permite usar una expresión (variable, string con espacios, etc.) como nombre de propiedad; dot notation requiere un identificador literal fijo.',
            },
            {
              question: 'Dentro de un método normal de un objeto, ¿a qué se refiere this?',
              options: [
                'Siempre al objeto window/global',
                'Al objeto sobre el que se llamó el método',
                'A la función misma como string',
                'A undefined siempre',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'En un método llamado como obj.metodo(), this apunta al objeto obj en el momento de la llamada.',
            },
            {
              question: '¿Qué pasa si accedes a una propiedad que no existe en un objeto?',
              options: [
                'Lanza un error inmediatamente',
                'Devuelve undefined',
                'Devuelve null',
                'Crea la propiedad automáticamente con valor 0',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'Acceder a una propiedad inexistente devuelve undefined en vez de lanzar un error (a diferencia de llamar a un método que no existe).',
            },
            {
              question: '¿Cuál de estas formas agrega correctamente una propiedad nueva a un objeto existente obj?',
              options: [
                'obj.new nuevaProp = 5;',
                'obj.nuevaProp = 5;',
                'obj -> nuevaProp = 5;',
                'add(obj, nuevaProp, 5);',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'Simplemente asignar a obj.nuevaProp (o obj["nuevaProp"]) crea la propiedad si no existía.',
            },
          ],
          questionsEn: [
            {
              question: 'When is bracket notation required instead of dot notation?',
              options: [
                'Never, dot notation always works',
                'When the property name comes from a variable or has special characters/spaces',
                'Only with arrays',
                'Only with numbers',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'Bracket notation lets you use an expression (variable, string with spaces, etc.) as the property name; dot notation requires a fixed literal identifier.',
            },
            {
              question: 'Inside a regular object method, what does this refer to?',
              options: [
                'Always the window/global object',
                'The object the method was called on',
                'The function itself as a string',
                'Always undefined',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'In a method called as obj.method(), this points to obj at the moment of the call.',
            },
            {
              question: 'What happens when you access a property that does not exist on an object?',
              options: [
                'It throws an error immediately',
                'It returns undefined',
                'It returns null',
                'It automatically creates the property with value 0',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'Accessing a missing property returns undefined instead of throwing an error (unlike calling a method that does not exist).',
            },
            {
              question: 'Which of these correctly adds a new property to an existing object obj?',
              options: [
                'obj.new newProp = 5;',
                'obj.newProp = 5;',
                'obj -> newProp = 5;',
                'add(obj, newProp, 5);',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'Simply assigning to obj.newProp (or obj["newProp"]) creates the property if it did not exist.',
            },
          ],
          experience: 25,
          coins: 12,
        }),
      ],
    },

    // ------------------------------------------------------------------
    // Lección 8 — Strings y template literals
    // ------------------------------------------------------------------
    {
      title: { es: 'Strings y template literals', en: 'Strings and template literals' },
      description: {
        es: 'Métodos esenciales de strings, inmutabilidad y template literals.',
        en: 'Essential string methods, immutability and template literals.',
      },
      exercises: [
        codeExercise({
          title: { es: 'Métodos esenciales de strings', en: 'Essential string methods' },
          description: {
            es: 'Transforma un string usando métodos que no lo modifican.',
            en: 'Transform a string using methods that do not modify it.',
          },
          blocksEs: [
            text(
              'Los strings son inmutables: ningún método los modifica "en su lugar", siempre devuelven un string nuevo. toUpperCase()/toLowerCase() cambian mayúsculas/minúsculas, trim() quita espacios de los extremos, includes(x) busca una subcadena, slice(inicio, fin) extrae una parte, split(separador) convierte el string en un array.',
            ),
            js(
              'const frase = "  Hola Mundo  ";\nfrase.trim();               // "Hola Mundo"\nfrase.trim().toLowerCase(); // "hola mundo"\n"a,b,c".split(",");         // ["a", "b", "c"]\n"JavaScript".slice(0, 4);   // "Java"',
            ),
            text(
              'Tarea: completa limpiarYNormalizar(texto) para que quite espacios de los extremos (trim) y convierta todo a minúsculas (toLowerCase), en ese orden, y devuelva el resultado.',
            ),
          ],
          blocksEn: [
            text(
              'Strings are immutable: no method modifies them "in place", they always return a new string. toUpperCase()/toLowerCase() change case, trim() removes whitespace from both ends, includes(x) searches for a substring, slice(start, end) extracts a part, split(separator) turns the string into an array.',
            ),
            js(
              'const phrase = "  Hello World  ";\nphrase.trim();               // "Hello World"\nphrase.trim().toLowerCase(); // "hello world"\n"a,b,c".split(",");          // ["a", "b", "c"]\n"JavaScript".slice(0, 4);    // "Java"',
            ),
            text(
              'Task: complete cleanAndNormalize(text) so it trims whitespace from both ends (trim) and converts everything to lowercase (toLowerCase), in that order, and returns the result.',
            ),
          ],
          starterCode:
            'function limpiarYNormalizar(texto) {\n  // tu código aquí\n}\n',
          assertions:
            'assert(typeof limpiarYNormalizar === "function", "Debes definir limpiarYNormalizar");\nassert(limpiarYNormalizar("  Hola MUNDO  ") === "hola mundo", "Deberia recortar y pasar a minusculas");\nassert(limpiarYNormalizar("JavaScript") === "javascript", "Deberia funcionar sin espacios extra");',
          experience: 15,
          coins: 8,
        }),
        codeExercise({
          title: { es: 'Template literals', en: 'Template literals' },
          description: {
            es: 'Construye strings dinámicos con backticks e interpolación.',
            en: 'Build dynamic strings with backticks and interpolation.',
          },
          blocksEs: [
            text(
              'Los template literals se escriben con backticks (comilla invertida) en vez de comillas simples/dobles. Permiten interpolar expresiones con ${expresion} directamente dentro del string, y también escribir strings multilínea sin necesidad de \\n. Son la forma moderna de construir strings dinámicos, mucho más legible que concatenar con +.',
            ),
            js(
              'const nombre = "Ada";\nconst edad = 30;\n\n// con backticks:\nconst mensaje = `Hola, soy ${nombre} y tengo ${edad + 1} años el proximo cumpleaños.`;\n\n// equivalente con +:\nconst mensaje2 = "Hola, soy " + nombre + " y tengo " + (edad + 1) + " años el proximo cumpleaños.";',
            ),
            text(
              'Tarea: completa describirProducto(nombre, precio) para que devuelva, usando un template literal, exactamente el string: "El producto NOMBRE cuesta $PRECIO" (por ejemplo describirProducto("Mouse", 25) debe devolver "El producto Mouse cuesta $25").',
            ),
          ],
          blocksEn: [
            text(
              'Template literals are written with backticks instead of single/double quotes. They let you interpolate expressions with ${expression} directly inside the string, and also write multiline strings without needing \\n. They are the modern way to build dynamic strings, much more readable than concatenating with +.',
            ),
            js(
              'const name = "Ada";\nconst age = 30;\n\n// with backticks:\nconst message = `Hi, I am ${name} and I will be ${age + 1} on my next birthday.`;\n\n// equivalent with +:\nconst message2 = "Hi, I am " + name + " and I will be " + (age + 1) + " on my next birthday.";',
            ),
            text(
              'Task: complete describeProduct(name, price) so it returns, using a template literal, exactly the string: "The product NAME costs $PRICE" (for example describeProduct("Mouse", 25) must return "The product Mouse costs $25").',
            ),
          ],
          starterCode:
            'function describirProducto(nombre, precio) {\n  // tu código aquí, usa un template literal\n}\n',
          assertions:
            'assert(typeof describirProducto === "function", "Debes definir describirProducto");\nassert(describirProducto("Mouse", 25) === "El producto Mouse cuesta $25", "Formato incorrecto para Mouse");\nassert(describirProducto("Teclado", 40) === "El producto Teclado cuesta $40", "Formato incorrecto para Teclado");',
          experience: 20,
          coins: 10,
        }),
        quizExercise({
          title: { es: 'Quiz: strings', en: 'Quiz: strings' },
          description: { es: 'Repasa métodos de strings y template literals.', en: 'Review string methods and template literals.' },
          questionsEs: [
            {
              question: '¿Por qué se dice que los strings son inmutables?',
              options: [
                'Porque no se pueden crear strings nuevos',
                'Porque ningún método cambia el string original: siempre devuelven uno nuevo',
                'Porque solo aceptan letras minúsculas',
                'Porque no tienen métodos',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'Métodos como toUpperCase() o slice() nunca modifican el string original; siempre construyen y devuelven uno nuevo.',
            },
            {
              question: '¿Qué carácter se usa para delimitar un template literal?',
              options: ['Comillas simples ( \' )', 'Comillas dobles ( " )', 'Backtick ( ` )', 'Corchetes ( [ ] )'],
              correct: [2],
              isMultiple: false,
              explanation: 'Los template literals usan backticks, lo que habilita la interpolación con ${} y las cadenas multilínea.',
            },
            {
              question: '¿Qué devuelve: `Total: ${2 + 2}`?',
              options: ['"Total: 2 + 2"', '"Total: ${2 + 2}"', '"Total: 4"', 'Un error de sintaxis'],
              correct: [2],
              isMultiple: false,
              explanation: 'La expresión dentro de ${} se evalúa (2 + 2 = 4) y su resultado se inserta en el string final.',
            },
            {
              question: '¿Qué hace "  hola  ".trim()?',
              options: [
                'Convierte "hola" a mayúsculas',
                'Elimina los espacios al inicio y al final, dejando "hola"',
                'Elimina todos los espacios, incluso los internos',
                'Lanza un error porque el string tiene espacios',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'trim() solo quita espacios en blanco de los extremos (inicio y fin) del string, no los internos.',
            },
          ],
          questionsEn: [
            {
              question: 'Why are strings said to be immutable?',
              options: [
                'Because you cannot create new strings',
                'Because no method changes the original string: they always return a new one',
                'Because they only accept lowercase letters',
                'Because they have no methods',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'Methods like toUpperCase() or slice() never modify the original string; they always build and return a new one.',
            },
            {
              question: 'Which character delimits a template literal?',
              options: ['Single quotes ( \' )', 'Double quotes ( " )', 'Backtick ( ` )', 'Brackets ( [ ] )'],
              correct: [2],
              isMultiple: false,
              explanation: 'Template literals use backticks, which enable ${} interpolation and multiline strings.',
            },
            {
              question: 'What does `Total: ${2 + 2}` return?',
              options: ['"Total: 2 + 2"', '"Total: ${2 + 2}"', '"Total: 4"', 'A syntax error'],
              correct: [2],
              isMultiple: false,
              explanation: 'The expression inside ${} is evaluated (2 + 2 = 4) and the result is inserted into the final string.',
            },
            {
              question: 'What does "  hello  ".trim() do?',
              options: [
                'Converts "hello" to uppercase',
                'Removes whitespace from the start and end, leaving "hello"',
                'Removes all whitespace, including internal spaces',
                'Throws an error because the string has spaces',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'trim() only removes whitespace from both ends of the string, not internal spaces.',
            },
          ],
          experience: 25,
          coins: 12,
        }),
      ],
    },

    // ------------------------------------------------------------------
    // Lección 9 — Scope, hoisting y proyecto integrador
    // ------------------------------------------------------------------
    {
      title: { es: 'Scope, hoisting y proyecto final', en: 'Scope, hoisting and final project' },
      description: {
        es: 'Cierra los fundamentos entendiendo el scope y hoisting, y construye una agenda de contactos.',
        en: 'Close out the fundamentals by understanding scope and hoisting, and build a contacts app.',
      },
      exercises: [
        codeExercise({
          title: { es: 'Scope de bloque vs scope de función', en: 'Block scope vs function scope' },
          description: {
            es: 'Observa cómo let/const respetan bloques y var no.',
            en: 'See how let/const respect blocks and var does not.',
          },
          blocksEs: [
            text(
              'El "scope" (ámbito) determina dónde es visible una variable. let y const tienen scope de bloque: solo existen dentro del {} donde se declararon. var tiene scope de función: ignora los bloques (if, for, etc.) y solo respeta los límites de la función. Además, las declaraciones de function y var se "elevan" (hoisting): JavaScript las registra antes de ejecutar el código, por eso a veces puedes llamar una función antes de donde aparece escrita. let/const también se elevan, pero quedan en una "zona muerta temporal" y lanzan error si las usas antes de la línea donde se declaran.',
            ),
            js(
              'if (true) {\n  var x = 1;\n  let y = 2;\n}\nconsole.log(x); // 1 (var se escapo del bloque if)\n// console.log(y); // ReferenceError: y no esta definida aqui\n\nsaludar(); // funciona: las function declarations se elevan completas\nfunction saludar() { console.log("hola"); }',
            ),
            text(
              'Tarea: completa contarPares(numeros) usando un for con let (no var) para contar cuántos números del array son pares, devolviendo el contador.',
            ),
          ],
          blocksEn: [
            text(
              'Scope determines where a variable is visible. let and const are block-scoped: they only exist inside the {} where they were declared. var is function-scoped: it ignores blocks (if, for, etc.) and only respects function boundaries. Also, function and var declarations are "hoisted": JavaScript registers them before running the code, which is why you can sometimes call a function before the line where it appears. let/const are hoisted too, but they land in a "temporal dead zone" and throw if you use them before their declaration line.',
            ),
            js(
              'if (true) {\n  var x = 1;\n  let y = 2;\n}\nconsole.log(x); // 1 (var leaked out of the if block)\n// console.log(y); // ReferenceError: y is not defined here\n\ngreet(); // works: function declarations are hoisted whole\nfunction greet() { console.log("hi"); }',
            ),
            text(
              'Task: complete countEvens(numbers) using a for loop with let (not var) to count how many numbers in the array are even, returning the count.',
            ),
          ],
          starterCode:
            'function contarPares(numeros) {\n  // tu código aquí\n}\n',
          assertions:
            'assert(typeof contarPares === "function", "Debes definir contarPares");\nassert(contarPares([1, 2, 3, 4, 5, 6]) === 3, "Deberia contar 3 pares en [1,2,3,4,5,6]");\nassert(contarPares([1, 3, 5]) === 0, "Deberia contar 0 pares en [1,3,5]");\nassert(contarPares([]) === 0, "Un array vacio deberia dar 0");',
          experience: 15,
          coins: 8,
        }),
        codeExercise({
          title: { es: 'Proyecto: agenda de contactos', en: 'Project: contacts app' },
          description: {
            es: 'Implementa un mini CRUD en memoria combinando todo lo visto en el curso.',
            en: 'Implement a small in-memory CRUD combining everything from the course.',
          },
          blocksEs: [
            text(
              'Este es el proyecto integrador de Fundamentos: vas a manejar una lista de contactos (un array de objetos) con funciones que agregan, buscan y eliminan. Combina todo lo que viste: arrays, objetos, funciones, condicionales y bucles.',
            ),
            js(
              'const contactos = [\n  { nombre: "Ana", telefono: "111" },\n  { nombre: "Beto", telefono: "222" },\n];',
            ),
            text(
              'Tarea: implementa estas tres funciones sobre un array de contactos como el de arriba (cada contacto es { nombre, telefono }):\n\n1) agregarContacto(lista, contacto): agrega contacto al final de lista y devuelve lista.\n2) buscarPorNombre(lista, nombre): devuelve el objeto contacto cuyo nombre coincide exactamente, o null si no existe.\n3) eliminarPorNombre(lista, nombre): elimina de lista (mutándola) el contacto con ese nombre si existe, y devuelve lista.',
            ),
          ],
          blocksEn: [
            text(
              'This is the Fundamentals capstone project: you will manage a list of contacts (an array of objects) with functions that add, search and remove. It combines everything from the course: arrays, objects, functions, conditionals and loops.',
            ),
            js(
              'const contacts = [\n  { name: "Ana", phone: "111" },\n  { name: "Beto", phone: "222" },\n];',
            ),
            text(
              'Task: implement these three functions over an array of contacts like the one above (each contact is { nombre, telefono }):\n\n1) agregarContacto(list, contact): adds contact to the end of list and returns list.\n2) buscarPorNombre(list, name): returns the contact object whose name matches exactly, or null if it does not exist.\n3) eliminarPorNombre(list, name): removes (mutating it) the contact with that name from list if it exists, and returns list.',
            ),
          ],
          starterCode:
            'function agregarContacto(lista, contacto) {\n  // tu código aquí\n}\n\nfunction buscarPorNombre(lista, nombre) {\n  // tu código aquí\n}\n\nfunction eliminarPorNombre(lista, nombre) {\n  // tu código aquí\n}\n',
          assertions:
            'assert(typeof agregarContacto === "function", "Falta agregarContacto");\nassert(typeof buscarPorNombre === "function", "Falta buscarPorNombre");\nassert(typeof eliminarPorNombre === "function", "Falta eliminarPorNombre");\n\nvar agenda = [{ nombre: "Ana", telefono: "111" }];\nagregarContacto(agenda, { nombre: "Beto", telefono: "222" });\nassert(agenda.length === 2, "agregarContacto deberia dejar 2 contactos");\nassert(agenda[1].nombre === "Beto", "El segundo contacto deberia ser Beto");\n\nvar encontrado = buscarPorNombre(agenda, "Ana");\nassert(encontrado !== null && encontrado.telefono === "111", "buscarPorNombre deberia encontrar a Ana con telefono 111");\n\nvar noEncontrado = buscarPorNombre(agenda, "Zeta");\nassert(noEncontrado === null, "buscarPorNombre deberia devolver null si no existe");\n\neliminarPorNombre(agenda, "Ana");\nassert(agenda.length === 1, "eliminarPorNombre deberia dejar 1 contacto");\nassert(agenda[0].nombre === "Beto", "El contacto restante deberia ser Beto");',
          experience: 40,
          coins: 20,
        }),
        quizExercise({
          title: { es: 'Quiz final: Fundamentos', en: 'Final quiz: Fundamentals' },
          description: {
            es: 'Un repaso integrador de todo el curso.',
            en: 'An integrative review of the whole course.',
          },
          questionsEs: [
            {
              question: '¿Qué variables "se escapan" de un bloque if/for aunque se declaren adentro?',
              options: ['let', 'const', 'var', 'Ninguna, todas respetan el bloque'],
              correct: [2],
              isMultiple: false,
              explanation: 'var es function-scoped, no block-scoped: ignora los límites de if/for y solo respeta la función que la contiene.',
            },
            {
              question: '¿Qué es el "hoisting"?',
              options: [
                'Un método para ordenar arrays',
                'El registro que hace JavaScript de las declaraciones (var, function) antes de ejecutar el código',
                'Una forma de definir clases',
                'Un tipo de bucle',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'Hoisting es el comportamiento por el cual las declaraciones se "suben" conceptualmente al inicio de su scope antes de la ejecución.',
            },
            {
              question: '¿Cuáles de estos SON verdaderos sobre let/const respecto al hoisting? (selecciona todas las que apliquen)',
              options: [
                'También se elevan (hoisting), a diferencia de lo que mucha gente cree',
                'Quedan en una "zona muerta temporal" hasta su línea de declaración',
                'Nunca se pueden usar antes de declararlas ni siquiera indirectamente',
                'Tienen scope de bloque',
              ],
              correct: [0, 1, 3],
              isMultiple: true,
              explanation: 'let/const se elevan pero permanecen inaccesibles (zona muerta temporal) hasta la línea de su declaración, y siempre son de scope de bloque.',
            },
            {
              question: 'En el proyecto de la agenda de contactos, ¿qué combinaste principalmente?',
              options: [
                'Solo strings',
                'Arrays de objetos, funciones, condicionales y bucles',
                'Solo clases',
                'Solo operadores aritméticos',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'El proyecto integrador junta arrays, objetos, funciones y lógica condicional/iterativa: exactamente los pilares de Fundamentos.',
            },
          ],
          questionsEn: [
            {
              question: 'Which variables "leak" out of an if/for block even when declared inside it?',
              options: ['let', 'const', 'var', 'None, they all respect the block'],
              correct: [2],
              isMultiple: false,
              explanation: 'var is function-scoped, not block-scoped: it ignores if/for boundaries and only respects the enclosing function.',
            },
            {
              question: 'What is "hoisting"?',
              options: [
                'A method to sort arrays',
                'The registration JavaScript does of declarations (var, function) before running the code',
                'A way to define classes',
                'A type of loop',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'Hoisting is the behavior by which declarations are conceptually "lifted" to the top of their scope before execution.',
            },
            {
              question: 'Which of these are TRUE about let/const regarding hoisting? (select all that apply)',
              options: [
                'They are hoisted too, unlike what many people believe',
                'They stay in a "temporal dead zone" until their declaration line',
                'They can never be used before declaring them, not even indirectly',
                'They are block-scoped',
              ],
              correct: [0, 1, 3],
              isMultiple: true,
              explanation: 'let/const are hoisted but remain inaccessible (temporal dead zone) until their declaration line, and are always block-scoped.',
            },
            {
              question: 'In the contacts app project, what did you mainly combine?',
              options: [
                'Only strings',
                'Arrays of objects, functions, conditionals and loops',
                'Only classes',
                'Only arithmetic operators',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'The capstone project brings together arrays, objects, functions and conditional/iterative logic: exactly the pillars of Fundamentals.',
            },
          ],
          experience: 35,
          coins: 18,
        }),
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Lista de cursos a sembrar (se agregan curso2 y curso3 en las siguientes fases)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// CURSO 2 — JavaScript Intermedio (MEDIUM)
// ---------------------------------------------------------------------------

const course2: CourseSeed = {
  title: { es: 'JavaScript: Intermedio', en: 'JavaScript: Intermediate' },
  description: {
    es: 'Funciones de orden superior, closures, clases, manejo de errores y asincronía con Promises y async/await.',
    en: 'Higher-order functions, closures, classes, error handling, and asynchrony with Promises and async/await.',
  },
  difficulty: Difficulty.MEDIUM,
  lessons: [
    // ------------------------------------------------------------------
    // Lección 1 — Arrow functions y funciones de orden superior
    // ------------------------------------------------------------------
    {
      title: { es: 'Arrow functions y funciones de orden superior', en: 'Arrow functions and higher-order functions' },
      description: {
        es: 'La sintaxis moderna de funciones y cómo componerlas.',
        en: 'Modern function syntax and how to compose them.',
      },
      exercises: [
        codeExercise({
          title: { es: 'Sintaxis de arrow functions', en: 'Arrow function syntax' },
          description: {
            es: 'Reescribe funciones tradicionales como arrow functions.',
            en: 'Rewrite traditional functions as arrow functions.',
          },
          blocksEs: [
            text(
              'Las arrow functions son una sintaxis más corta para escribir funciones: (params) => expresion. Si el cuerpo es una sola expresión, se devuelve automáticamente (sin necesidad de return ni llaves). Si necesitas varias líneas, usa llaves y return explícito, igual que una función normal. Diferencia clave que verás más adelante: las arrow functions no tienen su propio this.',
            ),
            js(
              'function cuadradoClasica(x) { return x * x; }\nconst cuadrado = (x) => x * x;              // equivalente, retorno implicito\nconst sumar = (a, b) => a + b;               // dos parametros\nconst saludar = () => "Hola";                // sin parametros\nconst procesar = (x) => {\n  const doble = x * 2;\n  return doble + 1;                          // varias lineas: llaves + return\n};',
            ),
            text(
              'Tarea: define esMayorDeEdad como una arrow function de retorno implícito que reciba edad y devuelva true si edad >= 18.',
            ),
          ],
          blocksEn: [
            text(
              'Arrow functions are a shorter syntax for writing functions: (params) => expression. If the body is a single expression, it is returned automatically (no return or braces needed). If you need multiple lines, use braces and an explicit return, just like a normal function. Key difference you will see later: arrow functions do not have their own this.',
            ),
            js(
              'function classicSquare(x) { return x * x; }\nconst square = (x) => x * x;                // equivalent, implicit return\nconst add = (a, b) => a + b;                 // two parameters\nconst greet = () => "Hi";                    // no parameters\nconst process = (x) => {\n  const doubled = x * 2;\n  return doubled + 1;                        // multiple lines: braces + return\n};',
            ),
            text(
              'Task: define isAdult as an implicit-return arrow function that receives age and returns true if age >= 18.',
            ),
          ],
          starterCode: '// const esMayorDeEdad = (edad) => ...\n',
          assertions:
            'assert(typeof esMayorDeEdad === "function", "Debes definir esMayorDeEdad como arrow function");\nassert(esMayorDeEdad(18) === true, "18 deberia ser mayor de edad");\nassert(esMayorDeEdad(17) === false, "17 no deberia ser mayor de edad");\nassert(esMayorDeEdad(40) === true, "40 deberia ser mayor de edad");',
          experience: 15,
          coins: 8,
        }),
        codeExercise({
          title: { es: 'Componer funciones', en: 'Composing functions' },
          description: {
            es: 'Combina varias funciones pequeñas en una sola operación.',
            en: 'Combine several small functions into a single operation.',
          },
          blocksEs: [
            text(
              'Una ventaja de tener funciones como valores es poder combinarlas: aplicar una función al resultado de otra. Esto se llama composición y es la base de mucho código funcional moderno.',
            ),
            js(
              'const duplicar = (x) => x * 2;\nconst incrementar = (x) => x + 1;\n\nconst duplicarLuegoIncrementar = (x) => incrementar(duplicar(x));\nduplicarLuegoIncrementar(5); // incrementar(10) = 11',
            ),
            text(
              'Tarea: completa componer(f, g) que devuelva una NUEVA función que, al recibir x, calcule f(g(x)) (primero aplica g, luego f al resultado).',
            ),
          ],
          blocksEn: [
            text(
              'One advantage of having functions as values is being able to combine them: applying one function to the result of another. This is called composition and is the foundation of a lot of modern functional code.',
            ),
            js(
              'const double = (x) => x * 2;\nconst increment = (x) => x + 1;\n\nconst doubleThenIncrement = (x) => increment(double(x));\ndoubleThenIncrement(5); // increment(10) = 11',
            ),
            text(
              'Task: complete compose(f, g) so it returns a NEW function that, given x, computes f(g(x)) (apply g first, then f to the result).',
            ),
          ],
          starterCode: 'function componer(f, g) {\n  // tu código aquí, debe devolver una funcion\n}\n',
          assertions:
            'assert(typeof componer === "function", "Debes definir componer");\nvar duplicar = function (x) { return x * 2; };\nvar incrementar = function (x) { return x + 1; };\nvar combinada = componer(incrementar, duplicar);\nassert(typeof combinada === "function", "componer debe devolver una funcion");\nassert(combinada(5) === 11, "componer(incrementar, duplicar)(5) deberia ser 11");\nassert(combinada(0) === 1, "componer(incrementar, duplicar)(0) deberia ser 1");',
          experience: 20,
          coins: 10,
        }),
        quizExercise({
          title: { es: 'Quiz: arrow functions', en: 'Quiz: arrow functions' },
          description: { es: 'Repasa sintaxis y composición.', en: 'Review syntax and composition.' },
          questionsEs: [
            {
              question: '¿Cuándo una arrow function devuelve un valor sin usar la palabra return?',
              options: [
                'Nunca, siempre requiere return',
                'Cuando el cuerpo es una sola expresión sin llaves {}',
                'Solo si no recibe parámetros',
                'Solo dentro de un array',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'El "retorno implícito" ocurre cuando el cuerpo de la arrow function es una expresión directa, sin llaves; con llaves necesitas return explícito.',
            },
            {
              question: 'const f = (a, b) => a + b; ¿Qué tipo de valor es f?',
              options: ['Un número', 'Una función', 'Un objeto plano', 'undefined'],
              correct: [1],
              isMultiple: false,
              explanation: 'f es una función guardada en una variable, invocable como f(1, 2).',
            },
            {
              question: 'componer(f, g)(x) calcula...',
              options: ['g(f(x))', 'f(g(x))', 'f(x) + g(x)', 'f(x, g(x))'],
              correct: [1],
              isMultiple: false,
              explanation: 'Por la definición usada en el ejercicio, primero se aplica g a x, y el resultado se pasa a f.',
            },
            {
              question: '¿Cuál es una diferencia real entre function y las arrow functions que verás en detalle más adelante?',
              options: [
                'Las arrow functions no pueden recibir parámetros',
                'Las arrow functions no tienen su propio this',
                'function no se puede guardar en una variable',
                'No hay ninguna diferencia real',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'A diferencia de function, las arrow functions no crean su propio this: heredan el this del contexto donde se definieron (lo verás en la lección de this dinámico).',
            },
          ],
          questionsEn: [
            {
              question: 'When does an arrow function return a value without using the return keyword?',
              options: [
                'Never, it always requires return',
                'When the body is a single expression without braces {}',
                'Only if it receives no parameters',
                'Only inside an array',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'The "implicit return" happens when the arrow function body is a direct expression, without braces; with braces you need an explicit return.',
            },
            {
              question: 'const f = (a, b) => a + b; What kind of value is f?',
              options: ['A number', 'A function', 'A plain object', 'undefined'],
              correct: [1],
              isMultiple: false,
              explanation: 'f is a function stored in a variable, callable as f(1, 2).',
            },
            {
              question: 'compose(f, g)(x) computes...',
              options: ['g(f(x))', 'f(g(x))', 'f(x) + g(x)', 'f(x, g(x))'],
              correct: [1],
              isMultiple: false,
              explanation: 'By the definition used in the exercise, g is applied to x first, and the result is passed to f.',
            },
            {
              question: 'What is a real difference between function and arrow functions you will see in detail later?',
              options: [
                'Arrow functions cannot receive parameters',
                'Arrow functions do not have their own this',
                'function cannot be stored in a variable',
                'There is no real difference',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'Unlike function, arrow functions do not create their own this: they inherit this from the context where they were defined (you will see this in the dynamic this lesson).',
            },
          ],
          experience: 25,
          coins: 12,
        }),
      ],
    },

    // ------------------------------------------------------------------
    // Lección 2 — map/filter/reduce/find/some/every
    // ------------------------------------------------------------------
    {
      title: { es: 'map, filter y reduce a fondo', en: 'map, filter and reduce in depth' },
      description: {
        es: 'Los métodos funcionales de arrays que reemplazan a la mayoría de los bucles manuales.',
        en: 'The functional array methods that replace most manual loops.',
      },
      exercises: [
        codeExercise({
          title: { es: 'map y filter', en: 'map and filter' },
          description: {
            es: 'Transforma y filtra un array sin mutar el original.',
            en: 'Transform and filter an array without mutating the original.',
          },
          blocksEs: [
            text(
              'map(fn) crea un NUEVO array aplicando fn a cada elemento (mismo tamaño que el original). filter(fn) crea un NUEVO array solo con los elementos donde fn devuelve true. Ninguno de los dos muta el array original — a diferencia de push/splice que viste en Fundamentos.',
            ),
            js(
              'const numeros = [1, 2, 3, 4, 5];\nconst duplicados = numeros.map((n) => n * 2);        // [2, 4, 6, 8, 10]\nconst pares = numeros.filter((n) => n % 2 === 0);    // [2, 4]\nnumeros; // sigue siendo [1, 2, 3, 4, 5], no cambio',
            ),
            text(
              'Tarea: dado const precios = [10, 25, 8, 40, 15], usa map y filter para calcular caros: un array con los precios (sin modificar) que sean mayores a 15, luego aplícales un 10% de descuento con map. El resultado final (caros) debe ser un array de números ya descontados.',
            ),
          ],
          blocksEn: [
            text(
              'map(fn) creates a NEW array applying fn to each element (same size as the original). filter(fn) creates a NEW array with only the elements where fn returns true. Neither mutates the original array — unlike push/splice from Fundamentals.',
            ),
            js(
              'const numbers = [1, 2, 3, 4, 5];\nconst doubled = numbers.map((n) => n * 2);          // [2, 4, 6, 8, 10]\nconst evens = numbers.filter((n) => n % 2 === 0);   // [2, 4]\nnumbers; // still [1, 2, 3, 4, 5], unchanged',
            ),
            text(
              'Task: given const prices = [10, 25, 8, 40, 15], use filter and map to compute expensive: the prices greater than 15, with a 10% discount applied to each. The final result (expensive) must be an array of already-discounted numbers.',
            ),
          ],
          starterCode:
            'const precios = [10, 25, 8, 40, 15];\n\n// caros: filtra > 15, luego aplica 10% de descuento con map\n',
          assertions:
            'assert(Array.isArray(caros), "caros debe ser un array");\nassert(caros.length === 2, "deberian quedar 2 precios (25 y 40) despues del filtro");\nassert(Math.abs(caros[0] - 22.5) < 0.01, "25 con 10% de descuento es 22.5");\nassert(Math.abs(caros[1] - 36) < 0.01, "40 con 10% de descuento es 36");',
          experience: 15,
          coins: 8,
        }),
        codeExercise({
          title: { es: 'reduce, find, some y every', en: 'reduce, find, some and every' },
          description: {
            es: 'Colapsa un array en un solo valor y haz búsquedas booleanas.',
            en: 'Collapse an array into a single value and do boolean searches.',
          },
          blocksEs: [
            text(
              'reduce(fn, valorInicial) recorre el array acumulando un resultado: fn recibe (acumulador, elementoActual) y devuelve el nuevo acumulador. find(fn) devuelve el primer elemento que cumple fn (o undefined). some(fn) devuelve true si AL MENOS UN elemento cumple fn. every(fn) devuelve true si TODOS los elementos cumplen fn.',
            ),
            js(
              'const nums = [1, 2, 3, 4];\nconst suma = nums.reduce((acc, n) => acc + n, 0);     // 10\nconst primerPar = nums.find((n) => n % 2 === 0);      // 2\nconst hayNegativos = nums.some((n) => n < 0);          // false\nconst todosPositivos = nums.every((n) => n > 0);       // true',
            ),
            text(
              'Tarea: usa reduce para completa totalCarrito(items) que reciba un array de objetos { precio, cantidad } y devuelva la suma de precio * cantidad de todos los items.',
            ),
          ],
          blocksEn: [
            text(
              'reduce(fn, initialValue) walks the array accumulating a result: fn receives (accumulator, currentElement) and returns the new accumulator. find(fn) returns the first element that satisfies fn (or undefined). some(fn) returns true if AT LEAST ONE element satisfies fn. every(fn) returns true if ALL elements satisfy fn.',
            ),
            js(
              'const nums = [1, 2, 3, 4];\nconst sum = nums.reduce((acc, n) => acc + n, 0);       // 10\nconst firstEven = nums.find((n) => n % 2 === 0);       // 2\nconst hasNegatives = nums.some((n) => n < 0);           // false\nconst allPositive = nums.every((n) => n > 0);           // true',
            ),
            text(
              'Task: use reduce to complete cartTotal(items), which receives an array of { precio, cantidad } objects and returns the sum of precio * cantidad across all items.',
            ),
          ],
          starterCode:
            'function totalCarrito(items) {\n  // tu código aquí, usa reduce\n}\n',
          assertions:
            'assert(typeof totalCarrito === "function", "Debes definir totalCarrito");\nassert(totalCarrito([{ precio: 10, cantidad: 2 }, { precio: 5, cantidad: 3 }]) === 35, "10*2 + 5*3 = 35");\nassert(totalCarrito([]) === 0, "Un carrito vacio deberia dar 0");\nassert(totalCarrito([{ precio: 100, cantidad: 1 }]) === 100, "Un solo item deberia funcionar");',
          experience: 20,
          coins: 10,
        }),
        quizExercise({
          title: { es: 'Quiz: métodos funcionales de arrays', en: 'Quiz: functional array methods' },
          description: { es: 'Repasa map, filter, reduce, find, some y every.', en: 'Review map, filter, reduce, find, some and every.' },
          questionsEs: [
            {
              question: '¿Cuál es la diferencia principal entre map y filter?',
              options: [
                'map transforma cada elemento (mismo tamaño); filter selecciona elementos (tamaño igual o menor)',
                'Son exactamente lo mismo',
                'filter siempre devuelve booleanos',
                'map muta el array original, filter no',
              ],
              correct: [0],
              isMultiple: false,
              explanation: 'map produce un array del mismo tamaño con cada elemento transformado; filter produce un array (del mismo tamaño o más chico) con los elementos que pasan la condición.',
            },
            {
              question: '¿Qué hace [].reduce((acc, n) => acc + n, 0) sobre [1,2,3]?',
              options: ['Devuelve [1,2,3]', 'Devuelve 6', 'Devuelve 0', 'Lanza un error'],
              correct: [1],
              isMultiple: false,
              explanation: 'reduce acumula: parte de 0, suma 1 (1), suma 2 (3), suma 3 (6). El resultado final es 6.',
            },
            {
              question: '¿Cuál es la diferencia entre some y every?',
              options: [
                'some requiere que TODOS cumplan; every que AL MENOS UNO cumpla',
                'some requiere que AL MENOS UNO cumpla; every que TODOS cumplan',
                'Son sinónimos',
                'Ambos devuelven el elemento encontrado, no un booleano',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'some: true si algún elemento cumple. every: true solo si todos los elementos cumplen.',
            },
            {
              question: '¿Qué devuelve find si ningún elemento cumple la condición?',
              options: ['null', 'undefined', 'Un array vacío', 'Lanza un error'],
              correct: [1],
              isMultiple: false,
              explanation: 'find devuelve undefined (no null, no un array vacío) cuando ningún elemento satisface la función.',
            },
          ],
          questionsEn: [
            {
              question: 'What is the main difference between map and filter?',
              options: [
                'map transforms each element (same size); filter selects elements (equal or smaller size)',
                'They are exactly the same',
                'filter always returns booleans',
                'map mutates the original array, filter does not',
              ],
              correct: [0],
              isMultiple: false,
              explanation: 'map produces an array of the same size with each element transformed; filter produces an array (same size or smaller) with the elements that pass the condition.',
            },
            {
              question: 'What does [].reduce((acc, n) => acc + n, 0) do on [1,2,3]?',
              options: ['Returns [1,2,3]', 'Returns 6', 'Returns 0', 'Throws an error'],
              correct: [1],
              isMultiple: false,
              explanation: 'reduce accumulates: starts at 0, adds 1 (1), adds 2 (3), adds 3 (6). The final result is 6.',
            },
            {
              question: 'What is the difference between some and every?',
              options: [
                'some requires ALL to match; every requires AT LEAST ONE to match',
                'some requires AT LEAST ONE to match; every requires ALL to match',
                'They are synonyms',
                'Both return the found element, not a boolean',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'some: true if any element matches. every: true only if all elements match.',
            },
            {
              question: 'What does find return if no element matches the condition?',
              options: ['null', 'undefined', 'An empty array', 'It throws an error'],
              correct: [1],
              isMultiple: false,
              explanation: 'find returns undefined (not null, not an empty array) when no element satisfies the function.',
            },
          ],
          experience: 25,
          coins: 12,
        }),
      ],
    },

    // ------------------------------------------------------------------
    // Lección 3 — Closures
    // ------------------------------------------------------------------
    {
      title: { es: 'Closures', en: 'Closures' },
      description: {
        es: 'Cómo una función "recuerda" el entorno donde fue creada.',
        en: 'How a function "remembers" the environment where it was created.',
      },
      exercises: [
        codeExercise({
          title: { es: 'Tu primer closure: un contador', en: 'Your first closure: a counter' },
          description: {
            es: 'Crea una función que recuerda estado entre llamadas.',
            en: 'Create a function that remembers state between calls.',
          },
          blocksEs: [
            text(
              'Un closure ocurre cuando una función interna "recuerda" las variables de la función externa donde fue definida, incluso después de que la función externa ya terminó de ejecutarse. Esto permite crear estado privado: variables que solo son accesibles a través de las funciones que las "encierran".',
            ),
            js(
              'function crearContador() {\n  let cuenta = 0;               // esta variable vive en el closure\n  return function () {\n    cuenta = cuenta + 1;        // la funcion interna "recuerda" cuenta\n    return cuenta;\n  };\n}\n\nconst contador = crearContador();\ncontador(); // 1\ncontador(); // 2  (recuerda el valor anterior!)\ncontador(); // 3',
            ),
            text(
              'Tarea: completa crearContador() para que devuelva una función que, cada vez que se llama, incremente y devuelva un contador interno empezando en 1 (la primera llamada devuelve 1, la segunda 2, etc.).',
            ),
          ],
          blocksEn: [
            text(
              'A closure happens when an inner function "remembers" the variables of the outer function where it was defined, even after the outer function has already finished running. This lets you create private state: variables only accessible through the functions that "enclose" them.',
            ),
            js(
              'function createCounter() {\n  let count = 0;                // this variable lives in the closure\n  return function () {\n    count = count + 1;          // the inner function "remembers" count\n    return count;\n  };\n}\n\nconst counter = createCounter();\ncounter(); // 1\ncounter(); // 2  (it remembers the previous value!)\ncounter(); // 3',
            ),
            text(
              'Task: complete createCounter() so it returns a function that, each time it is called, increments and returns an internal counter starting at 1 (the first call returns 1, the second 2, etc.).',
            ),
          ],
          starterCode: 'function crearContador() {\n  // tu código aquí\n}\n',
          assertions:
            'assert(typeof crearContador === "function", "Debes definir crearContador");\nvar contadorA = crearContador();\nassert(contadorA() === 1, "La primera llamada deberia devolver 1");\nassert(contadorA() === 2, "La segunda llamada deberia devolver 2");\nassert(contadorA() === 3, "La tercera llamada deberia devolver 3");\nvar contadorB = crearContador();\nassert(contadorB() === 1, "Un contador nuevo deberia empezar en 1 de forma independiente");',
          experience: 20,
          coins: 10,
        }),
        codeExercise({
          title: { es: 'Fábrica de funciones con closures', en: 'Function factory with closures' },
          description: {
            es: 'Usa un closure para "recordar" un parámetro de configuración.',
            en: 'Use a closure to "remember" a configuration parameter.',
          },
          blocksEs: [
            text(
              'Un patrón muy común: una función que recibe configuración y devuelve OTRA función ya "configurada", que recuerda ese parámetro gracias al closure. Esto evita repetir el mismo argumento una y otra vez.',
            ),
            js(
              'function crearMultiplicador(factor) {\n  return function (numero) {\n    return numero * factor;   // recuerda "factor" del closure\n  };\n}\n\nconst porTres = crearMultiplicador(3);\nporTres(10); // 30\nporTres(5);  // 15',
            ),
            text(
              'Tarea: completa crearValidadorDeRango(min, max) para que devuelva una función que reciba un número y devuelva true si está entre min y max (ambos inclusive), false en caso contrario.',
            ),
          ],
          blocksEn: [
            text(
              'A very common pattern: a function that receives configuration and returns ANOTHER already "configured" function, which remembers that parameter thanks to the closure. This avoids repeating the same argument over and over.',
            ),
            js(
              'function createMultiplier(factor) {\n  return function (number) {\n    return number * factor;   // remembers "factor" from the closure\n  };\n}\n\nconst timesThree = createMultiplier(3);\ntimesThree(10); // 30\ntimesThree(5);  // 15',
            ),
            text(
              'Task: complete createRangeValidator(min, max) so it returns a function that receives a number and returns true if it is between min and max (both inclusive), false otherwise.',
            ),
          ],
          starterCode: 'function crearValidadorDeRango(min, max) {\n  // tu código aquí\n}\n',
          assertions:
            'assert(typeof crearValidadorDeRango === "function", "Debes definir crearValidadorDeRango");\nvar esEdadValida = crearValidadorDeRango(0, 120);\nassert(esEdadValida(30) === true, "30 deberia ser valido entre 0 y 120");\nassert(esEdadValida(150) === false, "150 no deberia ser valido");\nassert(esEdadValida(0) === true, "El limite inferior deberia ser valido (inclusive)");\nassert(esEdadValida(120) === true, "El limite superior deberia ser valido (inclusive)");',
          experience: 20,
          coins: 10,
        }),
        quizExercise({
          title: { es: 'Quiz: closures', en: 'Quiz: closures' },
          description: { es: 'Confirma que entiendes cómo "recuerdan" las funciones.', en: 'Confirm you understand how functions "remember".' },
          questionsEs: [
            {
              question: '¿Qué es un closure?',
              options: [
                'Una forma de cerrar un archivo',
                'Una función que recuerda las variables del entorno donde fue creada, incluso después de que ese entorno terminó',
                'Un tipo de bucle',
                'Un método de array',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'El closure es exactamente esa "memoria": la función interna sigue teniendo acceso a las variables de su función externa aunque esta ya haya retornado.',
            },
            {
              question: 'En el ejemplo del contador, ¿por qué cada llamada a contador() devuelve un número mayor?',
              options: [
                'Porque JavaScript genera números aleatorios',
                'Porque la variable cuenta vive en el closure y se actualiza entre llamadas, en vez de reiniciarse',
                'Porque contador() recibe un parámetro oculto',
                'Es un error, en realidad siempre debería devolver 1',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'cuenta no se reinicia porque vive en el scope de crearContador, capturado por closure; cada llamada a la función interna la incrementa y conserva el nuevo valor.',
            },
            {
              question: 'Si llamas crearContador() dos veces (contador A y contador B), ¿comparten el mismo estado?',
              options: [
                'Sí, siempre están sincronizados',
                'No, cada llamada a crearContador() crea un closure independiente con su propia variable cuenta',
                'Solo si se llaman en el mismo orden',
                'Depende del navegador',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'Cada invocación de crearContador() genera un nuevo scope con su propia cuenta; los closures resultantes son completamente independientes entre sí.',
            },
            {
              question: '¿Para qué sirve principalmente una "fábrica de funciones" como crearMultiplicador?',
              options: [
                'Para crear funciones ya configuradas con cierto parámetro fijo, evitando repetirlo en cada llamada',
                'Para borrar funciones que ya no se usan',
                'Es solo un patrón decorativo sin uso práctico',
                'Para convertir funciones en arrays',
              ],
              correct: [0],
              isMultiple: false,
              explanation: 'Las fábricas de funciones aprovechan el closure para "pre-configurar" comportamiento y devolver funciones especializadas listas para usar.',
            },
          ],
          questionsEn: [
            {
              question: 'What is a closure?',
              options: [
                'A way to close a file',
                'A function that remembers the variables of the environment where it was created, even after that environment has finished',
                'A type of loop',
                'An array method',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'A closure is exactly that "memory": the inner function still has access to its outer function\'s variables even after the outer function has returned.',
            },
            {
              question: 'In the counter example, why does each call to counter() return a larger number?',
              options: [
                'Because JavaScript generates random numbers',
                'Because the count variable lives in the closure and is updated between calls instead of resetting',
                'Because counter() receives a hidden parameter',
                'It is a bug, it should actually always return 1',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'count does not reset because it lives in createCounter\'s scope, captured by the closure; each call to the inner function increments it and keeps the new value.',
            },
            {
              question: 'If you call createCounter() twice (counter A and counter B), do they share the same state?',
              options: [
                'Yes, they are always in sync',
                'No, each call to createCounter() creates an independent closure with its own count variable',
                'Only if called in the same order',
                'It depends on the browser',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'Each invocation of createCounter() creates a new scope with its own count; the resulting closures are completely independent from each other.',
            },
            {
              question: 'What is a "function factory" like createMultiplier mainly used for?',
              options: [
                'To create pre-configured functions with a fixed parameter, avoiding repeating it on every call',
                'To delete functions that are no longer used',
                'It is just a decorative pattern with no practical use',
                'To convert functions into arrays',
              ],
              correct: [0],
              isMultiple: false,
              explanation: 'Function factories use closures to "pre-configure" behavior and return specialized, ready-to-use functions.',
            },
          ],
          experience: 30,
          coins: 15,
        }),
      ],
    },

    // ------------------------------------------------------------------
    // Lección 4 — Destructuring, spread/rest y parámetros por defecto
    // ------------------------------------------------------------------
    {
      title: { es: 'Destructuring, spread y rest', en: 'Destructuring, spread and rest' },
      description: {
        es: 'Extrae valores de arrays/objetos, y combina o recolecta datos con ... .',
        en: 'Extract values from arrays/objects, and combine or collect data with ... .',
      },
      exercises: [
        codeExercise({
          title: { es: 'Destructuring de objetos y arrays', en: 'Object and array destructuring' },
          description: {
            es: 'Extrae propiedades y elementos en variables de una sola vez.',
            en: 'Extract properties and elements into variables in one go.',
          },
          blocksEs: [
            text(
              'El destructuring extrae valores de un objeto o array y los asigna a variables en una sola línea. En objetos usa los mismos nombres de las propiedades (o los renombra con :); en arrays usa la posición.',
            ),
            js(
              'const persona = { nombre: "Ada", edad: 30, pais: "UK" };\nconst { nombre, edad } = persona;         // nombre="Ada", edad=30\nconst { pais: nacion } = persona;         // renombrado: nacion="UK"\n\nconst coordenadas = [10, 20, 30];\nconst [x, y] = coordenadas;               // x=10, y=20 (se ignora el resto)',
            ),
            text(
              'Tarea: dado const producto = { nombre: "Teclado", precio: 45, stock: 12 }, usa destructuring para crear las variables nombreProducto (renombrando nombre) y precio directamente desde producto.',
            ),
          ],
          blocksEn: [
            text(
              'Destructuring extracts values from an object or array and assigns them to variables in a single line. On objects it uses the same property names (or renames them with :); on arrays it uses position.',
            ),
            js(
              'const person = { name: "Ada", age: 30, country: "UK" };\nconst { name, age } = person;            // name="Ada", age=30\nconst { country: nation } = person;      // renamed: nation="UK"\n\nconst coords = [10, 20, 30];\nconst [x, y] = coords;                   // x=10, y=20 (rest is ignored)',
            ),
            text(
              'Task: given const producto = { nombre: "Teclado", precio: 45, stock: 12 }, use destructuring to create the variables nombreProducto (renaming nombre) and precio directly from producto.',
            ),
          ],
          starterCode:
            'const producto = { nombre: "Teclado", precio: 45, stock: 12 };\n\n// const { nombre: nombreProducto, precio } = producto;\n',
          assertions:
            'assert(typeof nombreProducto !== "undefined", "Falta nombreProducto");\nassert(nombreProducto === "Teclado", "nombreProducto deberia ser Teclado");\nassert(typeof precio !== "undefined", "Falta precio");\nassert(precio === 45, "precio deberia ser 45");',
          experience: 15,
          coins: 8,
        }),
        codeExercise({
          title: { es: 'Spread y rest', en: 'Spread and rest' },
          description: {
            es: 'Combina arrays/objetos con spread, y recolecta argumentos con rest.',
            en: 'Combine arrays/objects with spread, and collect arguments with rest.',
          },
          blocksEs: [
            text(
              'El operador ... tiene dos usos opuestos según el contexto. Como "spread", EXPANDE un array/objeto en elementos individuales (útil para copiar o combinar). Como "rest" en parámetros de función, RECOLECTA el resto de argumentos en un array.',
            ),
            js(
              '// spread: expandir\nconst a = [1, 2];\nconst b = [3, 4];\nconst combinado = [...a, ...b];         // [1, 2, 3, 4]\nconst copia = { ...{ x: 1, y: 2 } };    // copia superficial del objeto\n\n// rest: recolectar\nfunction sumarTodos(...numeros) {\n  return numeros.reduce((acc, n) => acc + n, 0);\n}\nsumarTodos(1, 2, 3, 4); // 10 (numeros = [1,2,3,4])',
            ),
            text(
              'Tarea: completa combinarYSumar(a, b, ...resto) que use spread para combinar los arrays a y b en uno solo, y luego sume TODOS sus números incluyendo los que vengan en resto (que es un array de números adicionales). Devuelve la suma total.',
            ),
          ],
          blocksEn: [
            text(
              'The ... operator has two opposite uses depending on context. As "spread", it EXPANDS an array/object into individual elements (useful for copying or combining). As "rest" in function parameters, it COLLECTS the remaining arguments into an array.',
            ),
            js(
              '// spread: expand\nconst a = [1, 2];\nconst b = [3, 4];\nconst combined = [...a, ...b];          // [1, 2, 3, 4]\nconst copy = { ...{ x: 1, y: 2 } };     // shallow copy of the object\n\n// rest: collect\nfunction sumAll(...numbers) {\n  return numbers.reduce((acc, n) => acc + n, 0);\n}\nsumAll(1, 2, 3, 4); // 10 (numbers = [1,2,3,4])',
            ),
            text(
              'Task: complete combineAndSum(a, b, ...rest) using spread to combine arrays a and b into one, then sum ALL their numbers including whatever comes in rest (an array of extra numbers). Return the total sum.',
            ),
          ],
          starterCode: 'function combinarYSumar(a, b, ...resto) {\n  // tu código aquí, usa spread\n}\n',
          assertions:
            'assert(typeof combinarYSumar === "function", "Debes definir combinarYSumar");\nassert(combinarYSumar([1, 2], [3, 4], 5, 6) === 21, "1+2+3+4+5+6 = 21");\nassert(combinarYSumar([], [], 10) === 10, "Con arrays vacios y un extra deberia dar 10");\nassert(combinarYSumar([1], [2]) === 3, "Sin extras deberia sumar solo 1+2=3");',
          experience: 20,
          coins: 10,
        }),
        quizExercise({
          title: { es: 'Quiz: destructuring y spread/rest', en: 'Quiz: destructuring and spread/rest' },
          description: { es: 'Confirma que distingues spread de rest.', en: 'Confirm you can tell spread from rest.' },
          questionsEs: [
            {
              question: '¿Qué hace const { a } = objeto?',
              options: [
                'Crea una variable a con el valor de objeto.a',
                'Crea una propiedad nueva llamada a en objeto',
                'Es un error de sintaxis',
                'Convierte objeto en un array',
              ],
              correct: [0],
              isMultiple: false,
              explanation: 'Es destructuring de objeto: extrae la propiedad a de objeto y la asigna a una nueva variable local llamada a.',
            },
            {
              question: '¿Cómo se llama el uso de ... que EXPANDE un array/objeto en sus elementos individuales?',
              options: ['rest', 'spread', 'destructuring', 'hoisting'],
              correct: [1],
              isMultiple: false,
              explanation: 'Spread "esparce" los elementos de un array/objeto, por ejemplo dentro de otro array literal ([...arr]) o de una llamada a función.',
            },
            {
              question: 'function f(a, ...resto) { }  al llamar f(1, 2, 3, 4), ¿qué contiene resto?',
              options: ['2', '[2, 3, 4]', '[1, 2, 3, 4]', 'undefined'],
              correct: [1],
              isMultiple: false,
              explanation: 'rest recolecta todos los argumentos que sobran después de los parámetros nombrados explícitamente (aquí, después de a).',
            },
            {
              question: '¿Qué produce [...[1,2], ...[3,4]]?',
              options: ['[[1,2],[3,4]]', '[1,2,3,4]', '"1234"', 'Un error'],
              correct: [1],
              isMultiple: false,
              explanation: 'Cada spread expande su array en elementos individuales dentro del array literal exterior, dando como resultado un único array plano.',
            },
          ],
          questionsEn: [
            {
              question: 'What does const { a } = object do?',
              options: [
                'Creates a variable a with the value of object.a',
                'Creates a new property called a on object',
                'It is a syntax error',
                'Converts object into an array',
              ],
              correct: [0],
              isMultiple: false,
              explanation: 'It is object destructuring: it extracts the a property from object and assigns it to a new local variable called a.',
            },
            {
              question: 'What is the use of ... that EXPANDS an array/object into its individual elements called?',
              options: ['rest', 'spread', 'destructuring', 'hoisting'],
              correct: [1],
              isMultiple: false,
              explanation: 'Spread "spreads out" the elements of an array/object, for example inside another array literal ([...arr]) or a function call.',
            },
            {
              question: 'function f(a, ...rest) { }  when calling f(1, 2, 3, 4), what does rest contain?',
              options: ['2', '[2, 3, 4]', '[1, 2, 3, 4]', 'undefined'],
              correct: [1],
              isMultiple: false,
              explanation: 'rest collects all the arguments left over after the explicitly named parameters (here, after a).',
            },
            {
              question: 'What does [...[1,2], ...[3,4]] produce?',
              options: ['[[1,2],[3,4]]', '[1,2,3,4]', '"1234"', 'An error'],
              correct: [1],
              isMultiple: false,
              explanation: 'Each spread expands its array into individual elements inside the outer array literal, producing a single flat array.',
            },
          ],
          experience: 25,
          coins: 12,
        }),
      ],
    },

    // ------------------------------------------------------------------
    // Lección 5 — this dinámico, call/apply/bind, getters/setters
    // ------------------------------------------------------------------
    {
      title: { es: 'this dinámico, call/apply/bind', en: 'Dynamic this, call/apply/bind' },
      description: {
        es: 'Cómo se determina this realmente, y cómo controlarlo explícitamente.',
        en: 'How this is really determined, and how to control it explicitly.',
      },
      exercises: [
        codeExercise({
          title: { es: 'call y apply: elegir this manualmente', en: 'call and apply: choosing this manually' },
          description: {
            es: 'Ejecuta una función "prestando" el this de otro objeto.',
            en: 'Run a function "borrowing" the this of another object.',
          },
          blocksEs: [
            text(
              'this no se fija en dónde se DEFINE una función normal, sino en CÓMO se LLAMA. fn.call(objeto, ...args) ejecuta fn con this = objeto, pasando args uno por uno. fn.apply(objeto, arrayDeArgs) hace lo mismo pero recibe los argumentos como un array. Son útiles para "prestar" un método de un objeto a otro.',
            ),
            js(
              'function presentarse() {\n  return "Soy " + this.nombre;\n}\n\nconst persona1 = { nombre: "Ada" };\nconst persona2 = { nombre: "Grace" };\n\npresentarse.call(persona1);              // "Soy Ada"\npresentarse.apply(persona2);             // "Soy Grace"',
            ),
            text(
              'Tarea: dado function obtenerSaldo() { return this.saldo; } y const cuentaA = { saldo: 500 }, usa .call para completa saldoDeCuentaA de forma que sea el resultado de llamar obtenerSaldo con this = cuentaA.',
            ),
          ],
          blocksEn: [
            text(
              'this is not fixed by where a regular function is DEFINED, but by HOW it is CALLED. fn.call(object, ...args) runs fn with this = object, passing args one by one. fn.apply(object, argsArray) does the same but receives the arguments as an array. They are useful to "borrow" a method from one object for another.',
            ),
            js(
              'function introduce() {\n  return "I am " + this.name;\n}\n\nconst person1 = { name: "Ada" };\nconst person2 = { name: "Grace" };\n\nintroduce.call(person1);                 // "I am Ada"\nintroduce.apply(person2);                // "I am Grace"',
            ),
            text(
              'Task: given function getBalance() { return this.saldo; } and const cuentaA = { saldo: 500 }, use .call to complete saldoDeCuentaA so it is the result of calling getBalance with this = cuentaA.',
            ),
          ],
          starterCode:
            'function obtenerSaldo() {\n  return this.saldo;\n}\n\nconst cuentaA = { saldo: 500 };\n\n// const saldoDeCuentaA = obtenerSaldo.call(...)\n',
          assertions:
            'assert(typeof saldoDeCuentaA !== "undefined", "Falta saldoDeCuentaA");\nassert(saldoDeCuentaA === 500, "saldoDeCuentaA deberia ser 500 (this.saldo de cuentaA)");',
          experience: 20,
          coins: 10,
        }),
        codeExercise({
          title: { es: 'bind: fijar this para siempre', en: 'bind: locking this in place' },
          description: {
            es: 'Crea una versión de una función con this permanentemente fijado.',
            en: 'Create a version of a function with this permanently locked.',
          },
          blocksEs: [
            text(
              'fn.bind(objeto) NO ejecuta fn inmediatamente: devuelve una NUEVA función donde this siempre será objeto, sin importar cómo se llame después. Es muy usado cuando pasas un método como callback y necesitas que conserve su this original (por ejemplo, en manejadores de eventos).',
            ),
            js(
              'const contador = {\n  valor: 0,\n  incrementar() { this.valor++; return this.valor; }\n};\n\nconst incrementarSuelto = contador.incrementar;   // pierde el this al desconectarlo\n// incrementarSuelto(); // this seria undefined aqui, fallaria\n\nconst incrementarAtado = contador.incrementar.bind(contador);\nincrementarAtado(); // funciona, this sigue siendo contador',
            ),
            text(
              'Tarea: dado const producto = { nombre: "Mouse", precio: 20, describir() { return this.nombre + ": $" + this.precio; } }, usa bind para completa describirProductoAtado, una función independiente que al llamarse (sin argumentos, sin .producto delante) devuelva "Mouse: $20".',
            ),
          ],
          blocksEn: [
            text(
              'fn.bind(object) does NOT run fn immediately: it returns a NEW function where this will always be object, no matter how it is called afterwards. It is heavily used when passing a method as a callback and needing it to keep its original this (for example, in event handlers).',
            ),
            js(
              'const counter = {\n  value: 0,\n  increment() { this.value++; return this.value; }\n};\n\nconst looseIncrement = counter.increment;   // loses this once detached\n// looseIncrement(); // this would be undefined here, it would fail\n\nconst boundIncrement = counter.increment.bind(counter);\nboundIncrement(); // works, this is still counter',
            ),
            text(
              'Task: given const producto = { nombre: "Mouse", precio: 20, describir() { return this.nombre + ": $" + this.precio; } }, use bind to complete describirProductoAtado, a standalone function that when called (no arguments, no .producto in front) returns "Mouse: $20".',
            ),
          ],
          starterCode:
            'const producto = {\n  nombre: "Mouse",\n  precio: 20,\n  describir() { return this.nombre + ": $" + this.precio; }\n};\n\n// const describirProductoAtado = producto.describir.bind(...)\n',
          assertions:
            'assert(typeof describirProductoAtado === "function", "Falta describirProductoAtado");\nassert(describirProductoAtado() === "Mouse: $20", "Deberia devolver Mouse: $20 sin depender de producto directamente");',
          experience: 20,
          coins: 10,
        }),
        quizExercise({
          title: { es: 'Quiz: this, call, apply y bind', en: 'Quiz: this, call, apply and bind' },
          description: { es: 'Repasa cómo se determina y controla this.', en: 'Review how this is determined and controlled.' },
          questionsEs: [
            {
              question: '¿Qué determina el valor de this en una función normal (no arrow)?',
              options: [
                'Dónde se define la función en el código',
                'Cómo se llama la función (qué objeto está antes del punto, o call/apply/bind)',
                'El nombre de la función',
                'this siempre es el objeto global, sin excepciones',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'this se determina en tiempo de llamada, no de definición: depende de cómo invocas la función.',
            },
            {
              question: '¿Cuál es la diferencia entre call y apply?',
              options: [
                'call ejecuta la función después, apply la ejecuta inmediatamente',
                'call recibe los argumentos uno por uno; apply los recibe como un array',
                'apply solo funciona con arrow functions',
                'No hay ninguna diferencia',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'Ambos ejecutan la función inmediatamente fijando this; la única diferencia es la forma de pasar los argumentos (individuales vs array).',
            },
            {
              question: '¿bind ejecuta la función inmediatamente?',
              options: [
                'Sí, siempre',
                'No, devuelve una nueva función que se ejecutará después con this fijo',
                'Solo si no se le pasan argumentos',
                'Solo dentro de una clase',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'bind no invoca la función: prepara una nueva función lista para usarse más tarde con this ya fijado.',
            },
            {
              question: '¿Por qué "se pierde" this al guardar un método en una variable suelta (const fn = obj.metodo)?',
              options: [
                'Porque JavaScript borra los métodos al copiarlos',
                'Porque this depende de cómo se llama la función, y fn() ya no se llama a través de obj',
                'Es un error del lenguaje sin explicación',
                'No se pierde, siempre sigue apuntando a obj',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'Al desconectar el método de obj, la llamada fn() ya no tiene "el punto antes", así que this deja de ser obj.',
            },
          ],
          questionsEn: [
            {
              question: 'What determines the value of this in a regular (non-arrow) function?',
              options: [
                'Where the function is defined in the code',
                'How the function is called (what object is before the dot, or call/apply/bind)',
                'The name of the function',
                'this is always the global object, no exceptions',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'this is determined at call time, not definition time: it depends on how you invoke the function.',
            },
            {
              question: 'What is the difference between call and apply?',
              options: [
                'call runs the function later, apply runs it immediately',
                'call receives arguments one by one; apply receives them as an array',
                'apply only works with arrow functions',
                'There is no difference',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'Both run the function immediately while fixing this; the only difference is how the arguments are passed (individual vs array).',
            },
            {
              question: 'Does bind run the function immediately?',
              options: [
                'Yes, always',
                'No, it returns a new function that will run later with this locked in',
                'Only if no arguments are passed',
                'Only inside a class',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'bind does not invoke the function: it prepares a new function ready to be used later with this already fixed.',
            },
            {
              question: 'Why does this "get lost" when storing a method in a loose variable (const fn = obj.method)?',
              options: [
                'Because JavaScript deletes methods when copying them',
                'Because this depends on how the function is called, and fn() is no longer called through obj',
                'It is an unexplained language bug',
                'It does not get lost, it always keeps pointing to obj',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'By detaching the method from obj, the call fn() no longer has "the dot before it", so this stops being obj.',
            },
          ],
          experience: 30,
          coins: 15,
        }),
      ],
    },

    // ------------------------------------------------------------------
    // Lección 6 — Prototipos y herencia prototípica
    // ------------------------------------------------------------------
    {
      title: { es: 'Prototipos y herencia prototípica', en: 'Prototypes and prototypal inheritance' },
      description: {
        es: 'Cómo comparten comportamiento los objetos en JavaScript, antes de las clases.',
        en: 'How objects share behavior in JavaScript, before classes.',
      },
      exercises: [
        codeExercise({
          title: { es: 'Object.create y el prototipo', en: 'Object.create and the prototype' },
          description: {
            es: 'Crea un objeto que hereda métodos de otro a través del prototipo.',
            en: 'Create an object that inherits methods from another via the prototype.',
          },
          blocksEs: [
            text(
              'Todo objeto en JavaScript tiene un "prototipo": otro objeto del que hereda propiedades y métodos. Cuando accedes a una propiedad que el objeto no tiene directamente, JavaScript la busca en su prototipo, y luego en el prototipo del prototipo, y así (la "cadena de prototipos"). Object.create(proto) crea un objeto nuevo cuyo prototipo es proto.',
            ),
            js(
              'const animalBase = {\n  hacerSonido() { return this.sonido || "..."; }\n};\n\nconst perro = Object.create(animalBase);\nperro.sonido = "Guau";\nperro.hacerSonido();  // "Guau" (metodo heredado del prototipo, dato propio)',
            ),
            text(
              'Tarea: crea vehiculoBase con un método describir() que devuelva "Soy un vehiculo". Luego crea auto = Object.create(vehiculoBase) y agrégale la propiedad propia ruedas = 4.',
            ),
          ],
          blocksEn: [
            text(
              'Every object in JavaScript has a "prototype": another object it inherits properties and methods from. When you access a property the object does not have directly, JavaScript looks it up on its prototype, then the prototype\'s prototype, and so on (the "prototype chain"). Object.create(proto) creates a new object whose prototype is proto.',
            ),
            js(
              'const baseAnimal = {\n  makeSound() { return this.sound || "..."; }\n};\n\nconst dog = Object.create(baseAnimal);\ndog.sound = "Woof";\ndog.makeSound();  // "Woof" (inherited method, own data)',
            ),
            text(
              'Task: create vehiculoBase with a describir() method that returns "Soy un vehiculo". Then create auto = Object.create(vehiculoBase) and add its own property ruedas = 4.',
            ),
          ],
          starterCode:
            '// const vehiculoBase = { describir() { ... } };\n// const auto = Object.create(vehiculoBase);\n// auto.ruedas = 4;\n',
          assertions:
            'assert(typeof vehiculoBase !== "undefined", "Falta vehiculoBase");\nassert(typeof auto !== "undefined", "Falta auto");\nassert(auto.describir() === "Soy un vehiculo", "auto deberia heredar describir() de vehiculoBase");\nassert(auto.ruedas === 4, "auto deberia tener su propia propiedad ruedas = 4");\nassert(Object.getPrototypeOf(auto) === vehiculoBase, "El prototipo de auto deberia ser vehiculoBase");',
          experience: 20,
          coins: 10,
        }),
        codeExercise({
          title: { es: 'Funciones constructoras clásicas', en: 'Classic constructor functions' },
          description: {
            es: 'Antes de class, así se creaban objetos con new.',
            en: 'Before class, this is how objects were created with new.',
          },
          blocksEs: [
            text(
              'Antes de que existiera class, se usaban "funciones constructoras": funciones normales pensadas para llamarse con new. new hace 3 cosas automáticamente: crea un objeto vacío, lo conecta al prototype de la función, y ejecuta la función con this = ese objeto nuevo (devolviéndolo al final). Los métodos compartidos se agregan a NombreFuncion.prototype para no duplicarlos en cada instancia.',
            ),
            js(
              'function Persona(nombre) {\n  this.nombre = nombre;\n}\n\nPersona.prototype.saludar = function () {\n  return "Hola, soy " + this.nombre;\n};\n\nconst p = new Persona("Ada");\np.saludar(); // "Hola, soy Ada"',
            ),
            text(
              'Tarea: define la función constructora Punto(x, y) que asigne this.x y this.y, y agrégale un método Punto.prototype.distanciaAlOrigen() que devuelva Math.sqrt(x*x + y*y).',
            ),
          ],
          blocksEn: [
            text(
              'Before class existed, "constructor functions" were used: regular functions meant to be called with new. new automatically does 3 things: creates an empty object, links it to the function\'s prototype, and runs the function with this = that new object (returning it at the end). Shared methods are added to FunctionName.prototype so they are not duplicated on every instance.',
            ),
            js(
              'function Person(name) {\n  this.name = name;\n}\n\nPerson.prototype.greet = function () {\n  return "Hi, I am " + this.name;\n};\n\nconst p = new Person("Ada");\np.greet(); // "Hi, I am Ada"',
            ),
            text(
              'Task: define the constructor function Punto(x, y) that assigns this.x and this.y, and add a Punto.prototype.distanciaAlOrigen() method that returns Math.sqrt(x*x + y*y).',
            ),
          ],
          starterCode:
            'function Punto(x, y) {\n  // tu código aquí\n}\n\n// Punto.prototype.distanciaAlOrigen = function () { ... };\n',
          assertions:
            'assert(typeof Punto === "function", "Debes definir Punto");\nvar p1 = new Punto(3, 4);\nassert(p1.x === 3 && p1.y === 4, "El punto deberia guardar x e y");\nassert(typeof p1.distanciaAlOrigen === "function", "Falta el metodo distanciaAlOrigen en el prototype");\nassert(p1.distanciaAlOrigen() === 5, "La distancia de (3,4) al origen deberia ser 5");\nvar p2 = new Punto(0, 0);\nassert(p2.distanciaAlOrigen() === 0, "La distancia de (0,0) deberia ser 0");',
          experience: 25,
          coins: 12,
        }),
        quizExercise({
          title: { es: 'Quiz: prototipos', en: 'Quiz: prototypes' },
          description: { es: 'Repasa la cadena de prototipos y las funciones constructoras.', en: 'Review the prototype chain and constructor functions.' },
          questionsEs: [
            {
              question: '¿Qué pasa cuando accedes a una propiedad que un objeto no tiene directamente?',
              options: [
                'Siempre devuelve undefined sin buscar en ningún lado más',
                'JavaScript la busca en el prototipo del objeto, y así sucesivamente por la cadena de prototipos',
                'Lanza un error inmediatamente',
                'Se crea automáticamente con valor null',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'Esa búsqueda en cadena es exactamente la herencia prototípica: JavaScript sube por los prototipos hasta encontrar la propiedad o llegar a null.',
            },
            {
              question: '¿Qué hace Object.create(proto)?',
              options: [
                'Copia todas las propiedades de proto a un objeto nuevo, sin conexión',
                'Crea un objeto nuevo cuyo prototipo es proto',
                'Elimina el prototipo de un objeto',
                'Convierte proto en una clase',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'Object.create establece directamente el prototipo del objeto nuevo, habilitando la búsqueda en cadena hacia proto.',
            },
            {
              question: '¿Por qué se agregan los métodos a Funcion.prototype en vez de dentro de this en el constructor?',
              options: [
                'Por convención únicamente, no cambia nada',
                'Para que todas las instancias compartan la MISMA función en memoria, en vez de duplicarla en cada objeto',
                'Porque this no puede tener funciones',
                'Es obligatorio por sintaxis, no hay alternativa',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'Los métodos en el prototype se comparten entre todas las instancias (una sola copia en memoria); si estuvieran en this, cada instancia tendría su propia copia de la función.',
            },
            {
              question: '¿Qué 3 cosas hace new al llamar new Persona("Ada")?',
              options: [
                'Solo ejecuta la función normalmente',
                'Crea un objeto vacío, lo conecta al prototype de Persona, y ejecuta Persona con this = ese objeto',
                'Convierte Persona en una clase permanentemente',
                'Crea un array con los argumentos',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'new automatiza exactamente esos 3 pasos, permitiendo que this.nombre = nombre dentro del constructor funcione sobre el objeto recién creado.',
            },
          ],
          questionsEn: [
            {
              question: 'What happens when you access a property an object does not have directly?',
              options: [
                'It always returns undefined without looking anywhere else',
                "JavaScript looks it up on the object's prototype, and so on through the prototype chain",
                'It throws an error immediately',
                'It gets created automatically with value null',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'That chained lookup is exactly prototypal inheritance: JavaScript walks up the prototypes until it finds the property or reaches null.',
            },
            {
              question: 'What does Object.create(proto) do?',
              options: [
                "Copies all of proto's properties into a new, disconnected object",
                'Creates a new object whose prototype is proto',
                "Removes an object's prototype",
                'Turns proto into a class',
              ],
              correct: [1],
              isMultiple: false,
              explanation: "Object.create directly sets the new object's prototype, enabling the chained lookup towards proto.",
            },
            {
              question: 'Why are methods added to Function.prototype instead of inside this in the constructor?',
              options: [
                'Purely by convention, it changes nothing',
                'So all instances share the SAME function in memory, instead of duplicating it on every object',
                'Because this cannot hold functions',
                'It is required by syntax, there is no alternative',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'Methods on the prototype are shared across all instances (a single copy in memory); if they were on this, each instance would have its own copy of the function.',
            },
            {
              question: 'What 3 things does new do when calling new Person("Ada")?',
              options: [
                'It just runs the function normally',
                'It creates an empty object, links it to Person\'s prototype, and runs Person with this = that object',
                'It permanently turns Person into a class',
                'It creates an array with the arguments',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'new automates exactly those 3 steps, which is why this.name = name inside the constructor works on the freshly created object.',
            },
          ],
          experience: 30,
          coins: 15,
        }),
      ],
    },

    // ------------------------------------------------------------------
    // Lección 7 — Clases ES6
    // ------------------------------------------------------------------
    {
      title: { es: 'Clases ES6', en: 'ES6 classes' },
      description: {
        es: 'Sintaxis moderna sobre prototipos: class, constructor, herencia y super.',
        en: 'Modern syntax over prototypes: class, constructor, inheritance and super.',
      },
      exercises: [
        codeExercise({
          title: { es: 'Tu primera clase', en: 'Your first class' },
          description: {
            es: 'Define una clase con constructor y métodos.',
            en: 'Define a class with a constructor and methods.',
          },
          blocksEs: [
            text(
              'class es "azúcar sintáctico" sobre el sistema de prototipos que ya conoces: por dentro sigue funcionando igual, pero la sintaxis es más clara. constructor(...) es el método especial que se ejecuta al hacer new, y ahí se inicializan las propiedades de la instancia con this. Los demás métodos se agregan automáticamente al prototype.',
            ),
            js(
              'class Rectangulo {\n  constructor(ancho, alto) {\n    this.ancho = ancho;\n    this.alto = alto;\n  }\n\n  area() {\n    return this.ancho * this.alto;\n  }\n}\n\nconst r = new Rectangulo(4, 3);\nr.area(); // 12',
            ),
            text(
              'Tarea: define la clase Circulo con un constructor que reciba radio, y un método area() que devuelva Math.PI * radio * radio.',
            ),
          ],
          blocksEn: [
            text(
              'class is "syntactic sugar" over the prototype system you already know: under the hood it still works the same, but the syntax is clearer. constructor(...) is the special method that runs on new, where you initialize the instance properties with this. Other methods are automatically added to the prototype.',
            ),
            js(
              'class Rectangle {\n  constructor(width, height) {\n    this.width = width;\n    this.height = height;\n  }\n\n  area() {\n    return this.width * this.height;\n  }\n}\n\nconst r = new Rectangle(4, 3);\nr.area(); // 12',
            ),
            text(
              'Task: define the class Circulo with a constructor that receives radio, and an area() method that returns Math.PI * radio * radio.',
            ),
          ],
          starterCode: 'class Circulo {\n  // tu código aquí\n}\n',
          assertions:
            'assert(typeof Circulo === "function", "Circulo debe ser una clase (function bajo el capo)");\nvar c = new Circulo(2);\nassert(c.radio === 2, "El circulo deberia guardar radio");\nassert(Math.abs(c.area() - Math.PI * 4) < 0.001, "area() deberia ser PI * radio^2");',
          experience: 20,
          coins: 10,
        }),
        codeExercise({
          title: { es: 'Herencia con extends y super', en: 'Inheritance with extends and super' },
          description: {
            es: 'Crea una clase que herede y extienda el comportamiento de otra.',
            en: 'Create a class that inherits and extends another\'s behavior.',
          },
          blocksEs: [
            text(
              'class Hija extends Base hace que Hija herede todos los métodos de Base (por debajo, sigue siendo la cadena de prototipos). Dentro del constructor de la clase hija, super(...) llama al constructor de la clase base y DEBE llamarse antes de usar this. También puedes usar super.metodo() para llamar la versión del padre de un método sobrescrito.',
            ),
            js(
              'class Animal {\n  constructor(nombre) { this.nombre = nombre; }\n  hacerSonido() { return "..."; }\n}\n\nclass Perro extends Animal {\n  constructor(nombre) {\n    super(nombre);           // llama al constructor de Animal\n  }\n  hacerSonido() {\n    return this.nombre + " dice Guau";\n  }\n}\n\nnew Perro("Rex").hacerSonido(); // "Rex dice Guau"',
            ),
            text(
              'Tarea: define class Empleado extends Persona (asume que Persona ya existe con constructor(nombre) y método presentarse() que devuelve "Soy " + this.nombre), donde Empleado agrega un parámetro puesto en su constructor (guardado en this.puesto), y sobrescribe presentarse() para devolver el resultado de super.presentarse() + " y trabajo como " + this.puesto.',
            ),
          ],
          blocksEn: [
            text(
              'class Child extends Base makes Child inherit all of Base\'s methods (under the hood, it is still the prototype chain). Inside the child class constructor, super(...) calls the base class constructor and MUST be called before using this. You can also use super.method() to call the parent\'s version of an overridden method.',
            ),
            js(
              'class Animal {\n  constructor(name) { this.name = name; }\n  makeSound() { return "..."; }\n}\n\nclass Dog extends Animal {\n  constructor(name) {\n    super(name);              // calls Animal\'s constructor\n  }\n  makeSound() {\n    return this.name + " says Woof";\n  }\n}\n\nnew Dog("Rex").makeSound(); // "Rex says Woof"',
            ),
            text(
              'Task: define class Empleado extends Persona (assume Persona already exists with constructor(nombre) and a presentarse() method returning "Soy " + this.nombre), where Empleado adds a puesto parameter in its constructor (stored in this.puesto), and overrides presentarse() to return the result of super.presentarse() + " y trabajo como " + this.puesto.',
            ),
          ],
          starterCode:
            'class Persona {\n  constructor(nombre) {\n    this.nombre = nombre;\n  }\n  presentarse() {\n    return "Soy " + this.nombre;\n  }\n}\n\nclass Empleado extends Persona {\n  // tu código aquí\n}\n',
          assertions:
            'assert(typeof Empleado === "function", "Debes definir Empleado");\nvar e = new Empleado("Ada", "ingeniera");\nassert(e.nombre === "Ada", "Empleado deberia heredar nombre via super()");\nassert(e.puesto === "ingeniera", "Empleado deberia guardar puesto");\nassert(e.presentarse() === "Soy Ada y trabajo como ingeniera", "presentarse() deberia combinar super.presentarse() con el puesto");\nassert(e instanceof Persona, "Empleado deberia ser instancia de Persona (herencia real)");',
          experience: 25,
          coins: 12,
        }),
        quizExercise({
          title: { es: 'Quiz: clases', en: 'Quiz: classes' },
          description: { es: 'Repasa class, constructor, extends y super.', en: 'Review class, constructor, extends and super.' },
          questionsEs: [
            {
              question: '¿Qué es class en JavaScript, técnicamente?',
              options: [
                'Un sistema completamente nuevo, sin relación con prototipos',
                'Azúcar sintáctico sobre el sistema de prototipos ya existente',
                'Una función que solo existe en TypeScript',
                'Un tipo de dato primitivo',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'class no reemplaza el sistema de prototipos: es una forma más clara de escribir exactamente lo mismo que function + prototype.',
            },
            {
              question: 'Dentro del constructor de una clase hija, ¿qué debe pasar antes de usar this?',
              options: [
                'Nada especial, this siempre está disponible',
                'Se debe llamar a super(...) primero',
                'Se debe llamar a un método estático',
                'Debes declarar this como variable',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'En una clase que usa extends, this no existe hasta que super() se ejecuta (inicializa la parte heredada del objeto).',
            },
            {
              question: '¿Para qué sirve super.metodo() dentro de un método sobrescrito?',
              options: [
                'Para borrar el método del padre',
                'Para llamar explícitamente la versión del método definida en la clase base',
                'Para crear una nueva clase',
                'No tiene ningún uso real',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'super.metodo() te deja reutilizar/extender el comportamiento del padre en vez de reescribirlo completo en la clase hija.',
            },
            {
              question: '¿Qué devuelve instanciaDeEmpleado instanceof Persona si Empleado extends Persona?',
              options: ['false, siempre', 'true, porque la cadena de prototipos conecta Empleado con Persona', 'Un error', 'undefined'],
              correct: [1],
              isMultiple: false,
              explanation: 'extends conecta los prototipos de ambas clases, así que instanceof reconoce correctamente la relación de herencia.',
            },
          ],
          questionsEn: [
            {
              question: 'What is class in JavaScript, technically?',
              options: [
                'A completely new system, unrelated to prototypes',
                'Syntactic sugar over the existing prototype system',
                'A function that only exists in TypeScript',
                'A primitive data type',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'class does not replace the prototype system: it is a clearer way to write exactly the same thing as function + prototype.',
            },
            {
              question: 'Inside a child class constructor, what must happen before using this?',
              options: [
                'Nothing special, this is always available',
                'super(...) must be called first',
                'A static method must be called',
                'You must declare this as a variable',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'In a class using extends, this does not exist until super() runs (it initializes the inherited part of the object).',
            },
            {
              question: 'What is super.method() used for inside an overridden method?',
              options: [
                "To delete the parent's method",
                "To explicitly call the version of the method defined in the base class",
                'To create a new class',
                'It has no real use',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'super.method() lets you reuse/extend the parent behavior instead of rewriting it entirely in the child class.',
            },
            {
              question: 'What does employeeInstance instanceof Persona return if Empleado extends Persona?',
              options: ['false, always', 'true, because the prototype chain connects Empleado with Persona', 'An error', 'undefined'],
              correct: [1],
              isMultiple: false,
              explanation: "extends links both classes' prototypes, so instanceof correctly recognizes the inheritance relationship.",
            },
          ],
          experience: 30,
          coins: 15,
        }),
      ],
    },

    // ------------------------------------------------------------------
    // Lección 8 — Manejo de errores
    // ------------------------------------------------------------------
    {
      title: { es: 'Manejo de errores', en: 'Error handling' },
      description: {
        es: 'try/catch/finally, throw, y crear tus propios tipos de error.',
        en: 'try/catch/finally, throw, and creating your own error types.',
      },
      exercises: [
        codeExercise({
          title: { es: 'try/catch/finally', en: 'try/catch/finally' },
          description: {
            es: 'Captura errores en tiempo de ejecución sin que rompan tu programa.',
            en: 'Catch runtime errors without them crashing your program.',
          },
          blocksEs: [
            text(
              'try { } envuelve código que puede fallar. Si algo lanza un error, la ejecución salta inmediatamente a catch (error) { }, donde error.message tiene el texto del problema. finally { } se ejecuta SIEMPRE, haya habido error o no (útil para "limpieza"). throw new Error("mensaje") lanza un error manualmente.',
            ),
            js(
              'function dividir(a, b) {\n  if (b === 0) {\n    throw new Error("No se puede dividir entre cero");\n  }\n  return a / b;\n}\n\ntry {\n  dividir(10, 0);\n} catch (error) {\n  console.log(error.message); // "No se puede dividir entre cero"\n} finally {\n  console.log("Intento terminado");\n}',
            ),
            text(
              'Tarea: completa dividirSeguro(a, b) para que devuelva a / b normalmente, pero si b es 0, capture el error internamente con try/catch (lanzando un Error dentro del try) y devuelva null en vez de propagar el error.',
            ),
          ],
          blocksEn: [
            text(
              'try { } wraps code that might fail. If something throws, execution jumps immediately to catch (error) { }, where error.message has the problem text. finally { } always runs, whether there was an error or not (useful for "cleanup"). throw new Error("message") manually throws an error.',
            ),
            js(
              'function divide(a, b) {\n  if (b === 0) {\n    throw new Error("Cannot divide by zero");\n  }\n  return a / b;\n}\n\ntry {\n  divide(10, 0);\n} catch (error) {\n  console.log(error.message); // "Cannot divide by zero"\n} finally {\n  console.log("Attempt finished");\n}',
            ),
            text(
              'Task: complete dividirSeguro(a, b) so it returns a / b normally, but if b is 0, it catches the error internally with try/catch (throwing an Error inside the try) and returns null instead of propagating the error.',
            ),
          ],
          starterCode: 'function dividirSeguro(a, b) {\n  // tu código aquí, usa try/catch y throw\n}\n',
          assertions:
            'assert(typeof dividirSeguro === "function", "Debes definir dividirSeguro");\nassert(dividirSeguro(10, 2) === 5, "10/2 deberia ser 5");\nassert(dividirSeguro(9, 0) === null, "Dividir entre 0 deberia devolver null, no lanzar el error hacia afuera");\nassert(dividirSeguro(7, 7) === 1, "7/7 deberia ser 1");',
          experience: 20,
          coins: 10,
        }),
        codeExercise({
          title: { es: 'Errores personalizados', en: 'Custom errors' },
          description: {
            es: 'Crea tu propia clase de error extendiendo Error.',
            en: 'Create your own error class by extending Error.',
          },
          blocksEs: [
            text(
              'Puedes crear tipos de error específicos extendiendo la clase built-in Error. Esto te permite distinguir QUÉ tipo de problema ocurrió usando instanceof en el catch, en vez de tener que parsear el mensaje como texto.',
            ),
            js(
              'class ErrorDeValidacion extends Error {\n  constructor(mensaje) {\n    super(mensaje);\n    this.name = "ErrorDeValidacion";\n  }\n}\n\nfunction validarEdad(edad) {\n  if (edad < 0) throw new ErrorDeValidacion("La edad no puede ser negativa");\n  return edad;\n}\n\ntry {\n  validarEdad(-5);\n} catch (e) {\n  if (e instanceof ErrorDeValidacion) console.log("Error de validacion:", e.message);\n}',
            ),
            text(
              'Tarea: define la clase ErrorStockInsuficiente que extienda Error, guarde this.name = "ErrorStockInsuficiente" en el constructor. Luego completa comprar(stock, cantidad) que devuelva stock - cantidad si hay suficiente, o lance un new ErrorStockInsuficiente("Stock insuficiente") si cantidad > stock.',
            ),
          ],
          blocksEn: [
            text(
              'You can create specific error types by extending the built-in Error class. This lets you distinguish WHICH kind of problem happened using instanceof in the catch, instead of having to parse the message as text.',
            ),
            js(
              'class ValidationError extends Error {\n  constructor(message) {\n    super(message);\n    this.name = "ValidationError";\n  }\n}\n\nfunction validateAge(age) {\n  if (age < 0) throw new ValidationError("Age cannot be negative");\n  return age;\n}\n\ntry {\n  validateAge(-5);\n} catch (e) {\n  if (e instanceof ValidationError) console.log("Validation error:", e.message);\n}',
            ),
            text(
              'Task: define the class ErrorStockInsuficiente extending Error, storing this.name = "ErrorStockInsuficiente" in the constructor. Then complete comprar(stock, cantidad) so it returns stock - cantidad when there is enough, or throws a new ErrorStockInsuficiente("Stock insuficiente") if cantidad > stock.',
            ),
          ],
          starterCode:
            'class ErrorStockInsuficiente extends Error {\n  // tu código aquí\n}\n\nfunction comprar(stock, cantidad) {\n  // tu código aquí\n}\n',
          assertions:
            'assert(typeof ErrorStockInsuficiente === "function", "Debes definir ErrorStockInsuficiente");\nvar instanciaError = new ErrorStockInsuficiente("test");\nassert(instanciaError instanceof Error, "ErrorStockInsuficiente debe extender Error");\nassert(instanciaError.name === "ErrorStockInsuficiente", "El name deberia ser ErrorStockInsuficiente");\n\nassert(typeof comprar === "function", "Debes definir comprar");\nassert(comprar(10, 3) === 7, "10 - 3 = 7");\n\nvar lanzoErrorCorrecto = false;\ntry {\n  comprar(5, 10);\n} catch (e) {\n  lanzoErrorCorrecto = e instanceof ErrorStockInsuficiente;\n}\nassert(lanzoErrorCorrecto === true, "comprar deberia lanzar ErrorStockInsuficiente si cantidad > stock");',
          experience: 25,
          coins: 12,
        }),
        quizExercise({
          title: { es: 'Quiz: manejo de errores', en: 'Quiz: error handling' },
          description: { es: 'Repasa try/catch/finally y errores personalizados.', en: 'Review try/catch/finally and custom errors.' },
          questionsEs: [
            {
              question: '¿Cuándo se ejecuta el bloque finally?',
              options: [
                'Solo si hubo un error',
                'Solo si NO hubo error',
                'Siempre, haya habido error o no',
                'Nunca se ejecuta automáticamente',
              ],
              correct: [2],
              isMultiple: false,
              explanation: 'finally está diseñado para "limpieza" que debe pasar sin importar el resultado del try: siempre se ejecuta.',
            },
            {
              question: '¿Qué hace throw new Error("mensaje")?',
              options: [
                'Imprime el mensaje en consola y continúa normalmente',
                'Detiene la ejecución normal y busca el catch más cercano que lo capture',
                'Crea una variable llamada mensaje',
                'No hace nada si no hay un try alrededor',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'throw interrumpe el flujo normal inmediatamente y JavaScript busca el catch más cercano (si no hay ninguno, el programa termina con ese error).',
            },
            {
              question: '¿Por qué crear clases de error personalizadas (extends Error)?',
              options: [
                'Para que el código se vea más largo',
                'Para poder distinguir con instanceof qué tipo específico de problema ocurrió',
                'Es obligatorio, JavaScript no permite throw sin clases personalizadas',
                'Para que finally no se ejecute',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'Los errores personalizados permiten manejar cada tipo de problema de forma distinta en el catch, en vez de adivinar por el texto del mensaje.',
            },
            {
              question: 'Si un error se lanza DENTRO de un try y se captura con catch, ¿el programa se detiene?',
              options: [
                'Sí, siempre se detiene igual',
                'No, la ejecución continúa normalmente después del bloque try/catch/finally',
                'Solo si no hay finally',
                'Depende del tipo de error',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'Ese es justamente el propósito de try/catch: "atrapar" el error para que el programa pueda seguir ejecutándose en vez de crashear.',
            },
          ],
          questionsEn: [
            {
              question: 'When does the finally block run?',
              options: [
                'Only if there was an error',
                'Only if there was NO error',
                'Always, whether there was an error or not',
                'It never runs automatically',
              ],
              correct: [2],
              isMultiple: false,
              explanation: 'finally is designed for "cleanup" that must happen regardless of the try outcome: it always runs.',
            },
            {
              question: 'What does throw new Error("message") do?',
              options: [
                'Prints the message to the console and continues normally',
                'Stops normal execution and looks for the nearest catch that handles it',
                'Creates a variable called message',
                'Does nothing if there is no surrounding try',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'throw interrupts the normal flow immediately and JavaScript looks for the nearest catch (if none exists, the program terminates with that error).',
            },
            {
              question: 'Why create custom error classes (extends Error)?',
              options: [
                'To make the code look longer',
                'To be able to distinguish with instanceof which specific kind of problem occurred',
                'It is mandatory, JavaScript does not allow throw without custom classes',
                'So finally does not run',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'Custom errors let you handle each kind of problem differently in the catch, instead of guessing from the message text.',
            },
            {
              question: 'If an error is thrown INSIDE a try and caught with catch, does the program stop?',
              options: [
                'Yes, it always stops anyway',
                'No, execution continues normally after the try/catch/finally block',
                'Only if there is no finally',
                'It depends on the error type',
              ],
              correct: [1],
              isMultiple: false,
              explanation: "That is exactly the point of try/catch: to \"trap\" the error so the program can keep running instead of crashing.",
            },
          ],
          experience: 30,
          coins: 15,
        }),
      ],
    },

    // ------------------------------------------------------------------
    // Lección 9 — Asincronía: Promises, async/await + proyecto
    // ------------------------------------------------------------------
    {
      title: { es: 'Asincronía: Promises y async/await', en: 'Asynchrony: Promises and async/await' },
      description: {
        es: 'Cómo JavaScript maneja operaciones que toman tiempo, sin bloquear todo lo demás.',
        en: 'How JavaScript handles operations that take time, without blocking everything else.',
      },
      exercises: [
        codeExercise({
          title: { es: 'Crear y consumir Promises', en: 'Creating and consuming Promises' },
          description: {
            es: 'Una Promise representa un valor que estará disponible en el futuro.',
            en: 'A Promise represents a value that will be available in the future.',
          },
          blocksEs: [
            text(
              'JavaScript es de un solo hilo, pero puede manejar operaciones lentas (leer un archivo, pedir datos por red) sin congelarse gracias al event loop: esas operaciones se delegan y el resto del código sigue corriendo mientras tanto. Una Promise es un objeto que representa un valor que estará disponible más adelante: puede terminar en "resuelta" (resolve(valor)) o "rechazada" (reject(error)). .then(fn) reacciona cuando se resuelve; .catch(fn) cuando se rechaza.',
            ),
            js(
              'function esperar(ms, valor) {\n  return new Promise((resolve) => {\n    setTimeout(() => resolve(valor), ms);\n  });\n}\n\nesperar(100, "listo").then((resultado) => {\n  console.log(resultado); // "listo", pero despues de ~100ms\n});\n\n// tambien se puede consumir con await dentro de una funcion async',
            ),
            text(
              'Tarea: completa duplicarAsync(n) para que devuelva una Promise que se resuelva (usando resolve) con el valor n * 2 (puedes resolverla inmediatamente, no hace falta setTimeout).',
            ),
          ],
          blocksEn: [
            text(
              'JavaScript is single-threaded, but it can handle slow operations (reading a file, requesting data over the network) without freezing thanks to the event loop: those operations are delegated and the rest of the code keeps running meanwhile. A Promise is an object representing a value that will be available later: it can end up "resolved" (resolve(value)) or "rejected" (reject(error)). .then(fn) reacts when it resolves; .catch(fn) when it rejects.',
            ),
            js(
              'function wait(ms, value) {\n  return new Promise((resolve) => {\n    setTimeout(() => resolve(value), ms);\n  });\n}\n\nwait(100, "done").then((result) => {\n  console.log(result); // "done", but after ~100ms\n});\n\n// can also be consumed with await inside an async function',
            ),
            text(
              'Task: complete duplicarAsync(n) so it returns a Promise that resolves (using resolve) with the value n * 2 (you can resolve it immediately, no setTimeout needed).',
            ),
          ],
          starterCode: 'function duplicarAsync(n) {\n  // tu código aquí, devuelve una Promise\n}\n',
          assertions:
            'assert(typeof duplicarAsync === "function", "Debes definir duplicarAsync");\nvar resultado1 = await duplicarAsync(21);\nassert(resultado1 === 42, "duplicarAsync(21) deberia resolver en 42");\nvar resultado2 = await duplicarAsync(0);\nassert(resultado2 === 0, "duplicarAsync(0) deberia resolver en 0");',
          experience: 25,
          coins: 12,
        }),
        codeExercise({
          title: { es: 'async/await y errores asíncronos', en: 'async/await and asynchronous errors' },
          description: {
            es: 'La forma moderna de escribir código asíncrono como si fuera síncrono.',
            en: 'The modern way to write asynchronous code as if it were synchronous.',
          },
          blocksEs: [
            text(
              'async function marca una función como asíncrona: siempre devuelve una Promise, incluso si adentro usas return normal. Dentro de una función async, await pausa la ejecución de ESA función (sin bloquear el resto del programa) hasta que la Promise se resuelva, y te da directamente el valor resuelto. Si la Promise es rechazada, await lanza esa excepción, así que puedes capturarla con try/catch normal.',
            ),
            js(
              'function obtenerDatos(id) {\n  return new Promise((resolve, reject) => {\n    if (id > 0) resolve({ id, nombre: "Usuario" + id });\n    else reject(new Error("id invalido"));\n  });\n}\n\nasync function cargarUsuario(id) {\n  try {\n    const usuario = await obtenerDatos(id);\n    return usuario.nombre;\n  } catch (error) {\n    return "Error: " + error.message;\n  }\n}',
            ),
            text(
              'Tarea: completa la función async validarEdadAsync(edad) para que devuelva edad si edad >= 0, o lance (throw) un new Error("Edad invalida") si edad es negativa. Al usarse con await dentro de un try/catch, ese throw debe poder capturarse normalmente.',
            ),
          ],
          blocksEn: [
            text(
              'async function marks a function as asynchronous: it always returns a Promise, even if you use a normal return inside. Inside an async function, await pauses THAT function\'s execution (without blocking the rest of the program) until the Promise resolves, and gives you the resolved value directly. If the Promise is rejected, await throws that exception, so you can catch it with a normal try/catch.',
            ),
            js(
              'function fetchData(id) {\n  return new Promise((resolve, reject) => {\n    if (id > 0) resolve({ id, name: "User" + id });\n    else reject(new Error("invalid id"));\n  });\n}\n\nasync function loadUser(id) {\n  try {\n    const user = await fetchData(id);\n    return user.name;\n  } catch (error) {\n    return "Error: " + error.message;\n  }\n}',
            ),
            text(
              'Task: complete the async function validarEdadAsync(edad) so it returns edad if edad >= 0, or throws a new Error("Edad invalida") if edad is negative. When used with await inside a try/catch, that throw must be catchable normally.',
            ),
          ],
          starterCode: 'async function validarEdadAsync(edad) {\n  // tu código aquí\n}\n',
          assertions:
            'assert(typeof validarEdadAsync === "function", "Debes definir validarEdadAsync");\nvar edadOk = await validarEdadAsync(25);\nassert(edadOk === 25, "validarEdadAsync(25) deberia resolver en 25");\n\nvar seCapturo = false;\ntry {\n  await validarEdadAsync(-5);\n} catch (e) {\n  seCapturo = true;\n}\nassert(seCapturo === true, "validarEdadAsync(-5) deberia lanzar un error capturable con try/catch");',
          experience: 30,
          coins: 15,
        }),
        quizExercise({
          title: { es: 'Quiz final: Intermedio', en: 'Final quiz: Intermediate' },
          description: {
            es: 'Repaso integrador de todo el curso Intermedio.',
            en: 'Integrative review of the whole Intermediate course.',
          },
          questionsEs: [
            {
              question: '¿Por qué JavaScript no se "congela" al esperar una operación lenta como una petición de red?',
              options: [
                'Porque usa varios hilos al mismo tiempo, como otros lenguajes',
                'Porque el event loop delega esas operaciones y sigue ejecutando otro código mientras tanto',
                'Porque las operaciones lentas se cancelan automáticamente',
                'JavaScript sí se congela siempre en esos casos',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'JavaScript es single-threaded, pero el navegador/Node delegan las operaciones lentas y el event loop retoma el código de JS cuando el resultado está listo, sin bloquear el hilo principal mientras tanto.',
            },
            {
              question: '¿Qué devuelve SIEMPRE una función declarada con async?',
              options: ['Un booleano', 'Una Promise, incluso si adentro usas un return normal', 'undefined siempre', 'Un array'],
              correct: [1],
              isMultiple: false,
              explanation: 'Toda función async envuelve automáticamente su valor de retorno en una Promise resuelta (o rechazada si lanza un error).',
            },
            {
              question: '¿Qué pasa si el await de una Promise rechazada NO está dentro de un try/catch?',
              options: [
                'No pasa nada, se ignora silenciosamente',
                'El error se propaga como una excepción normal (puede "romper" la función si nadie la captura)',
                'JavaScript reintenta la operación automáticamente',
                'Se convierte en undefined',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'await relanza el motivo del rechazo como una excepción; si no hay try/catch alrededor (ni manejo en un nivel superior), esa excepción se propaga como cualquier error no capturado.',
            },
            {
              question: '¿Cuál de estas afirmaciones sobre closures + this + async combina correctamente conceptos del curso Intermedio?',
              options: [
                'Un closure nunca puede usarse dentro de una función async',
                'Una arrow function definida dentro de un método puede usar closures para acceder a variables externas, pero no tiene su propio this (hereda el del método)',
                'this siempre es undefined dentro de una clase',
                'Las Promises reemplazan por completo a las clases',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'Esa combinación (arrow function heredando this + closure sobre variables externas) es exactamente el patrón que hace tan útiles a las arrow functions dentro de métodos y callbacks.',
            },
          ],
          questionsEn: [
            {
              question: 'Why does JavaScript not "freeze" while waiting for a slow operation like a network request?',
              options: [
                'Because it uses multiple threads at once, like other languages',
                'Because the event loop delegates those operations and keeps running other code meanwhile',
                'Because slow operations are automatically cancelled',
                'JavaScript does always freeze in those cases',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'JavaScript is single-threaded, but the browser/Node delegate slow operations and the event loop resumes JS code once the result is ready, without blocking the main thread meanwhile.',
            },
            {
              question: 'What does a function declared with async ALWAYS return?',
              options: ['A boolean', 'A Promise, even if you use a normal return inside', 'Always undefined', 'An array'],
              correct: [1],
              isMultiple: false,
              explanation: 'Every async function automatically wraps its return value in a resolved Promise (or a rejected one if it throws).',
            },
            {
              question: 'What happens if the await of a rejected Promise is NOT inside a try/catch?',
              options: [
                'Nothing happens, it is silently ignored',
                'The error propagates as a normal exception (it can "break" the function if nobody catches it)',
                'JavaScript automatically retries the operation',
                'It turns into undefined',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'await re-throws the rejection reason as an exception; without a surrounding try/catch (or handling further up), that exception propagates like any uncaught error.',
            },
            {
              question: 'Which of these statements correctly combines closures + this + async concepts from the Intermediate course?',
              options: [
                'A closure can never be used inside an async function',
                'An arrow function defined inside a method can use closures to access outer variables, but has no own this (it inherits the method\'s)',
                'this is always undefined inside a class',
                'Promises completely replace classes',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'That combination (arrow function inheriting this + closure over outer variables) is exactly the pattern that makes arrow functions so useful inside methods and callbacks.',
            },
          ],
          experience: 35,
          coins: 18,
        }),
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// CURSO 3 — JavaScript Avanzado (HARD)
// ---------------------------------------------------------------------------

const course3: CourseSeed = {
  title: { es: 'JavaScript: Avanzado', en: 'JavaScript: Advanced' },
  description: {
    es: 'El motor de JS a fondo, programación funcional, Proxy/Reflect, generadores, patrones de diseño, estructuras de datos y algoritmos, asincronía avanzada, y un proyecto final.',
    en: 'The JS engine in depth, functional programming, Proxy/Reflect, generators, design patterns, data structures and algorithms, advanced asynchrony, and a final project.',
  },
  difficulty: Difficulty.HARD,
  lessons: [
    // ------------------------------------------------------------------
    // Lección 1 — Call stack y event loop a fondo
    // ------------------------------------------------------------------
    {
      title: { es: 'Call stack y event loop a fondo', en: 'The call stack and event loop in depth' },
      description: {
        es: 'Cómo ejecuta JavaScript el código realmente: pila de llamadas, microtasks y macrotasks.',
        en: 'How JavaScript really executes code: call stack, microtasks and macrotasks.',
      },
      exercises: [
        codeExercise({
          title: { es: 'La pila de llamadas y la recursión', en: 'The call stack and recursion' },
          description: {
            es: 'Cada llamada a función se apila; si se apilan demasiadas, se desborda.',
            en: 'Each function call is stacked; if too many stack up, it overflows.',
          },
          blocksEs: [
            text(
              'Cada vez que se llama una función, se agrega un "frame" a la call stack (pila de llamadas); cuando la función termina, su frame se retira. En la recursión (una función que se llama a sí misma), cada llamada agrega un frame nuevo — si nunca se llega a un caso base, la pila crece sin límite y el navegador lanza "RangeError: Maximum call stack size exceeded" (stack overflow).',
            ),
            js(
              'function factorial(n) {\n  if (n <= 1) return 1;       // caso base: detiene la recursion\n  return n * factorial(n - 1); // cada llamada se apila sobre la anterior\n}\n\nfactorial(5); // 120 (5 * 4 * 3 * 2 * 1)\n// factorial sin caso base recursaria para siempre -> stack overflow',
            ),
            text(
              'Tarea: completa sumaHasta(n) de forma recursiva (sin bucles) para que devuelva la suma de 1 + 2 + ... + n, con un caso base para n <= 0 que devuelva 0.',
            ),
          ],
          blocksEn: [
            text(
              'Every time a function is called, a "frame" is pushed onto the call stack; when the function finishes, its frame is popped. In recursion (a function calling itself), each call pushes a new frame — if a base case is never reached, the stack grows without bound and the browser throws "RangeError: Maximum call stack size exceeded" (stack overflow).',
            ),
            js(
              'function factorial(n) {\n  if (n <= 1) return 1;        // base case: stops the recursion\n  return n * factorial(n - 1); // each call stacks on top of the previous one\n}\n\nfactorial(5); // 120 (5 * 4 * 3 * 2 * 1)\n// factorial without a base case would recurse forever -> stack overflow',
            ),
            text(
              'Task: complete sumaHasta(n) recursively (no loops) so it returns the sum 1 + 2 + ... + n, with a base case for n <= 0 that returns 0.',
            ),
          ],
          starterCode: 'function sumaHasta(n) {\n  // tu código aquí, recursivo\n}\n',
          assertions:
            'assert(typeof sumaHasta === "function", "Debes definir sumaHasta");\nassert(sumaHasta(5) === 15, "1+2+3+4+5 = 15");\nassert(sumaHasta(0) === 0, "sumaHasta(0) deberia ser 0");\nassert(sumaHasta(1) === 1, "sumaHasta(1) deberia ser 1");\nassert(sumaHasta(-3) === 0, "n negativo deberia caer en el caso base y dar 0");',
          experience: 25,
          coins: 12,
        }),
        codeExercise({
          title: { es: 'Microtasks vs macrotasks', en: 'Microtasks vs macrotasks' },
          description: {
            es: 'El orden real en que se ejecutan Promises y setTimeout.',
            en: 'The real order in which Promises and setTimeout run.',
          },
          blocksEs: [
            text(
              'El event loop procesa 3 "colas" en orden: primero termina TODO el código síncrono actual, luego vacía COMPLETAMENTE la cola de microtasks (donde van los .then de Promises), y recién después toma UNA tarea de la cola de macrotasks (donde van setTimeout, eventos, etc.) antes de volver a revisar microtasks. Por eso un Promise.resolve().then() siempre se ejecuta antes que un setTimeout(fn, 0), aunque ambos parezcan "inmediatos".',
            ),
            js(
              'console.log("1: sync");\nsetTimeout(() => console.log("4: macrotask"), 0);\nPromise.resolve().then(() => console.log("3: microtask"));\nconsole.log("2: sync");\n\n// orden real impreso: 1, 2, 3, 4\n// (todo el sync primero, luego microtasks, recien despues macrotasks)',
            ),
            text(
              'Tarea: completa registrarOrden() para que devuelva un array orden donde: agregues "sync" de forma inmediata (síncrona), agregues "microtask" dentro de un .then() de un Promise ya resuelto, y agregues "macrotask" dentro de un setTimeout(fn, 0). La función debe devolver el array (aunque en el momento del return solo tenga "sync" adentro, eso es correcto).',
            ),
          ],
          blocksEn: [
            text(
              'The event loop processes 3 "queues" in order: first it finishes ALL of the current synchronous code, then it FULLY drains the microtask queue (where Promise .then callbacks go), and only then does it take ONE task from the macrotask queue (setTimeout, events, etc.) before checking microtasks again. That is why a Promise.resolve().then() always runs before a setTimeout(fn, 0), even though both seem "immediate".',
            ),
            js(
              'console.log("1: sync");\nsetTimeout(() => console.log("4: macrotask"), 0);\nPromise.resolve().then(() => console.log("3: microtask"));\nconsole.log("2: sync");\n\n// real printed order: 1, 2, 3, 4\n// (all sync code first, then microtasks, only then macrotasks)',
            ),
            text(
              'Task: complete registrarOrden() so it returns an array orden where you: push "sync" immediately (synchronously), push "microtask" inside a .then() of an already-resolved Promise, and push "macrotask" inside a setTimeout(fn, 0). The function must return the array (even though at return time it will only contain "sync" — that is correct).',
            ),
          ],
          starterCode: 'function registrarOrden() {\n  const orden = [];\n  // tu código aquí\n  return orden;\n}\n',
          assertions:
            'assert(typeof registrarOrden === "function", "Debes definir registrarOrden");\nvar orden = registrarOrden();\nassert(Array.isArray(orden), "registrarOrden debe devolver un array");\nassert(orden[0] === "sync", "sync deberia estar primero de forma inmediata");\nawait new Promise((r) => setTimeout(r, 50));\nassert(orden.includes("microtask"), "Falta agregar microtask via Promise.then");\nassert(orden.includes("macrotask"), "Falta agregar macrotask via setTimeout");\nassert(orden.indexOf("microtask") < orden.indexOf("macrotask"), "microtask deberia ejecutarse antes que macrotask");',
          experience: 30,
          coins: 15,
        }),
        quizExercise({
          title: { es: 'Quiz: call stack y event loop', en: 'Quiz: call stack and event loop' },
          description: { es: 'Confirma que entiendes el orden real de ejecución.', en: 'Confirm you understand the real execution order.' },
          questionsEs: [
            {
              question: '¿Qué causa un "Maximum call stack size exceeded"?',
              options: [
                'Un array demasiado grande',
                'Una recursión sin caso base (o con demasiada profundidad) que apila frames sin límite',
                'Usar demasiadas variables let',
                'Un error de sintaxis',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'Cada llamada recursiva agrega un frame a la pila; sin un caso base que la detenga, la pila crece hasta desbordar el límite del motor.',
            },
            {
              question: '¿Qué se ejecuta primero: un setTimeout(fn, 0) o un Promise.resolve().then(fn)?',
              options: [
                'setTimeout siempre gana porque tiene delay 0',
                'El Promise.then, porque las microtasks se vacían completamente antes de tomar la siguiente macrotask',
                'Se ejecutan exactamente al mismo tiempo',
                'Depende del navegador, no hay orden garantizado',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'Las microtasks (Promises) siempre se procesan antes de la siguiente macrotask (setTimeout), sin importar que el delay sea 0.',
            },
            {
              question: '¿Todo el código síncrono termina antes de que se procese cualquier microtask o macrotask?',
              options: [
                'Sí, siempre',
                'No, se intercalan aleatoriamente',
                'Solo si no hay Promises en el código',
                'Solo en Node.js, no en el navegador',
              ],
              correct: [0],
              isMultiple: false,
              explanation: 'El motor de JS termina de ejecutar todo el "script síncrono actual" antes de tocar la cola de microtasks o macrotasks.',
            },
            {
              question: 'Si hay varias microtasks encoladas (varios .then), ¿cuántas se procesan antes de pasar a la siguiente macrotask?',
              options: ['Solo una', 'Ninguna', 'TODAS las que estén encoladas en ese momento (la cola se vacía completamente)', 'La mitad'],
              correct: [2],
              isMultiple: false,
              explanation: 'A diferencia de las macrotasks (que se procesan de a una por vuelta del loop), la cola de microtasks se drena por completo antes de continuar.',
            },
          ],
          questionsEn: [
            {
              question: 'What causes a "Maximum call stack size exceeded"?',
              options: [
                'An array that is too large',
                'A recursion with no base case (or too much depth) stacking frames without limit',
                'Using too many let variables',
                'A syntax error',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'Each recursive call adds a frame to the stack; without a base case to stop it, the stack grows until it overflows the engine limit.',
            },
            {
              question: 'What runs first: a setTimeout(fn, 0) or a Promise.resolve().then(fn)?',
              options: [
                'setTimeout always wins because it has a 0 delay',
                'The Promise.then, because microtasks fully drain before the next macrotask is taken',
                'They run at exactly the same time',
                'It depends on the browser, there is no guaranteed order',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'Microtasks (Promises) are always processed before the next macrotask (setTimeout), regardless of the 0 delay.',
            },
            {
              question: 'Does all synchronous code finish before any microtask or macrotask is processed?',
              options: [
                'Yes, always',
                'No, they interleave randomly',
                'Only if there are no Promises in the code',
                'Only in Node.js, not in the browser',
              ],
              correct: [0],
              isMultiple: false,
              explanation: 'The JS engine finishes running the entire "current synchronous script" before touching the microtask or macrotask queue.',
            },
            {
              question: 'If several microtasks are queued (several .then), how many run before moving to the next macrotask?',
              options: ['Only one', 'None', 'ALL of them currently queued (the queue fully drains)', 'Half'],
              correct: [2],
              isMultiple: false,
              explanation: 'Unlike macrotasks (processed one per loop turn), the microtask queue is fully drained before continuing.',
            },
          ],
          experience: 35,
          coins: 18,
        }),
      ],
    },

    // ------------------------------------------------------------------
    // Lección 2 — Programación funcional
    // ------------------------------------------------------------------
    {
      title: { es: 'Programación funcional', en: 'Functional programming' },
      description: {
        es: 'Funciones puras, inmutabilidad, composición y currying.',
        en: 'Pure functions, immutability, composition and currying.',
      },
      exercises: [
        codeExercise({
          title: { es: 'Funciones puras e inmutabilidad', en: 'Pure functions and immutability' },
          description: {
            es: 'Escribe una función que nunca modifica sus argumentos.',
            en: 'Write a function that never modifies its arguments.',
          },
          blocksEs: [
            text(
              'Una función pura cumple dos reglas: dado el mismo input, siempre devuelve el mismo output, y no produce "efectos secundarios" (no modifica variables externas, no muta sus argumentos, no hace I/O). Preferir funciones puras hace el código más predecible y fácil de testear. Para "modificar" un array u objeto sin mutar el original, se copia con spread y se aplican los cambios sobre la copia.',
            ),
            js(
              '// impura: muta el array recibido\nfunction agregarImpuro(lista, item) {\n  lista.push(item);   // efecto secundario: modifica lista afuera de la funcion\n  return lista;\n}\n\n// pura: devuelve un array nuevo, no toca el original\nfunction agregarPuro(lista, item) {\n  return [...lista, item];\n}',
            ),
            text(
              'Tarea: completa actualizarPrecio(producto, nuevoPrecio) de forma PURA: debe devolver un objeto NUEVO igual a producto pero con precio = nuevoPrecio, sin modificar el objeto producto original.',
            ),
          ],
          blocksEn: [
            text(
              'A pure function follows two rules: given the same input, it always returns the same output, and it produces no "side effects" (it does not modify outer variables, does not mutate its arguments, does no I/O). Preferring pure functions makes code more predictable and easier to test. To "modify" an array or object without mutating the original, you copy it with spread and apply changes to the copy.',
            ),
            js(
              '// impure: mutates the received array\nfunction impureAdd(list, item) {\n  list.push(item);    // side effect: modifies list outside the function\n  return list;\n}\n\n// pure: returns a new array, does not touch the original\nfunction pureAdd(list, item) {\n  return [...list, item];\n}',
            ),
            text(
              'Task: complete actualizarPrecio(producto, nuevoPrecio) PURELY: it must return a NEW object equal to producto but with precio = nuevoPrecio, without modifying the original producto object.',
            ),
          ],
          starterCode: 'function actualizarPrecio(producto, nuevoPrecio) {\n  // tu código aquí, no mutes producto\n}\n',
          assertions:
            'assert(typeof actualizarPrecio === "function", "Debes definir actualizarPrecio");\nvar original = { nombre: "Mouse", precio: 20 };\nvar actualizado = actualizarPrecio(original, 35);\nassert(actualizado.precio === 35, "El objeto devuelto deberia tener precio 35");\nassert(actualizado.nombre === "Mouse", "El objeto devuelto deberia conservar nombre");\nassert(original.precio === 20, "El objeto ORIGINAL no deberia mutarse, deberia seguir en 20");\nassert(actualizado !== original, "Deberia ser un objeto NUEVO, no el mismo original modificado");',
          experience: 25,
          coins: 12,
        }),
        codeExercise({
          title: { es: 'Currying', en: 'Currying' },
          description: {
            es: 'Transforma una función de varios argumentos en una cadena de funciones de un argumento.',
            en: 'Transform a multi-argument function into a chain of single-argument functions.',
          },
          blocksEs: [
            text(
              'Currying es la técnica de convertir una función fn(a, b, c) en fn(a)(b)(c): cada llamada recibe un solo argumento y devuelve otra función, hasta que se tienen todos los argumentos necesarios y se calcula el resultado final. Es útil para crear versiones "pre-configuradas" de una función (similar a las fábricas de funciones que viste con closures).',
            ),
            js(
              'function sumarCurried(a) {\n  return function (b) {\n    return a + b;\n  };\n}\n\nsumarCurried(3)(4); // 7\nconst sumar3 = sumarCurried(3);\nsumar3(10); // 13  (reutiliza la funcion parcial)',
            ),
            text(
              'Tarea: completa multiplicarCurried(a) para que devuelva una función que reciba b y devuelva otra función que reciba c, y esa última devuelva a * b * c (es decir: multiplicarCurried(a)(b)(c) === a * b * c).',
            ),
          ],
          blocksEn: [
            text(
              'Currying is the technique of turning a function fn(a, b, c) into fn(a)(b)(c): each call receives a single argument and returns another function, until all needed arguments are collected and the final result is computed. It is useful for creating "pre-configured" versions of a function (similar to the function factories you saw with closures).',
            ),
            js(
              'function curriedAdd(a) {\n  return function (b) {\n    return a + b;\n  };\n}\n\ncurriedAdd(3)(4); // 7\nconst add3 = curriedAdd(3);\nadd3(10); // 13  (reuses the partial function)',
            ),
            text(
              'Task: complete multiplicarCurried(a) so it returns a function that receives b and returns another function that receives c, and that last one returns a * b * c (that is: multiplicarCurried(a)(b)(c) === a * b * c).',
            ),
          ],
          starterCode: 'function multiplicarCurried(a) {\n  // tu código aquí\n}\n',
          assertions:
            'assert(typeof multiplicarCurried === "function", "Debes definir multiplicarCurried");\nassert(multiplicarCurried(2)(3)(4) === 24, "2*3*4 = 24");\nassert(multiplicarCurried(1)(1)(1) === 1, "1*1*1 = 1");\nassert(multiplicarCurried(5)(0)(10) === 0, "5*0*10 = 0");\nvar porDos = multiplicarCurried(2);\nassert(typeof porDos === "function", "multiplicarCurried(a) deberia devolver una funcion");',
          experience: 30,
          coins: 15,
        }),
        quizExercise({
          title: { es: 'Quiz: programación funcional', en: 'Quiz: functional programming' },
          description: { es: 'Repasa pureza, inmutabilidad y currying.', en: 'Review purity, immutability and currying.' },
          questionsEs: [
            {
              question: '¿Qué NO debe hacer una función pura?',
              options: [
                'Recibir parámetros',
                'Producir efectos secundarios (mutar argumentos, tocar variables externas, hacer I/O)',
                'Devolver un valor',
                'Usar operadores aritméticos',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'La regla central de la pureza es "sin efectos secundarios": el único efecto observable debe ser el valor de retorno.',
            },
            {
              question: '¿Por qué [...lista, item] no muta lista?',
              options: [
                'Porque JavaScript lo prohíbe',
                'Porque el spread crea un array NUEVO copiando los elementos, en vez de modificar lista en su lugar',
                'Porque item siempre es undefined',
                'En realidad sí muta lista',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'El spread dentro de un array literal expande los elementos en una nueva estructura; lista original queda intacta.',
            },
            {
              question: '¿Qué es currying?',
              options: [
                'Un método para ordenar arrays',
                'Convertir una función de varios argumentos en una cadena de funciones que reciben un argumento cada una',
                'Una forma de manejar errores',
                'Un tipo de bucle',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'fn(a,b,c) currificada se convierte en fn(a)(b)(c): cada paso recibe un argumento y devuelve la siguiente función hasta completar todos.',
            },
            {
              question: 'multiplicarCurried(2) por sí solo (sin más paréntesis), ¿qué tipo de valor es?',
              options: ['Un número', 'Una función esperando el siguiente argumento', 'undefined', 'Un array'],
              correct: [1],
              isMultiple: false,
              explanation: 'Cada nivel del curry devuelve una función hasta que se completan todos los argumentos necesarios; con solo un argumento, el resultado sigue siendo una función.',
            },
          ],
          questionsEn: [
            {
              question: 'What should a pure function NOT do?',
              options: [
                'Receive parameters',
                'Produce side effects (mutate arguments, touch outer variables, do I/O)',
                'Return a value',
                'Use arithmetic operators',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'The core rule of purity is "no side effects": the only observable effect must be the return value.',
            },
            {
              question: 'Why does [...list, item] not mutate list?',
              options: [
                'Because JavaScript forbids it',
                'Because spread creates a NEW array copying the elements, instead of modifying list in place',
                'Because item is always undefined',
                'It actually does mutate list',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'Spread inside an array literal expands the elements into a new structure; the original list stays intact.',
            },
            {
              question: 'What is currying?',
              options: [
                'A method to sort arrays',
                'Turning a multi-argument function into a chain of functions each receiving one argument',
                'A way to handle errors',
                'A type of loop',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'Curried fn(a,b,c) becomes fn(a)(b)(c): each step receives one argument and returns the next function until all are collected.',
            },
            {
              question: 'What kind of value is multiplicarCurried(2) on its own (no more parentheses)?',
              options: ['A number', 'A function waiting for the next argument', 'undefined', 'An array'],
              correct: [1],
              isMultiple: false,
              explanation: 'Each level of the curry returns a function until all needed arguments are collected; with only one argument, the result is still a function.',
            },
          ],
          experience: 30,
          coins: 15,
        }),
      ],
    },

    // ------------------------------------------------------------------
    // Lección 3 — Object.create, Proxy y Reflect
    // ------------------------------------------------------------------
    {
      title: { es: 'Proxy y Reflect', en: 'Proxy and Reflect' },
      description: {
        es: 'Intercepta y personaliza el comportamiento fundamental de los objetos.',
        en: "Intercept and customize objects' fundamental behavior.",
      },
      exercises: [
        codeExercise({
          title: { es: 'Proxy: interceptar lecturas y escrituras', en: 'Proxy: intercepting reads and writes' },
          description: {
            es: 'Crea un objeto que valida sus propias asignaciones.',
            en: 'Create an object that validates its own assignments.',
          },
          blocksEs: [
            text(
              'new Proxy(objetoObjetivo, manejadores) crea un objeto "envoltorio" que intercepta operaciones básicas sobre objetoObjetivo. El manejador get(obj, prop) se dispara al LEER una propiedad; set(obj, prop, valor) se dispara al ESCRIBIRLA (debe devolver true si la asignación es válida). Esto permite validar, loguear o transformar el acceso a un objeto sin cambiar el código que lo usa.',
            ),
            js(
              'const persona = { edad: 30 };\n\nconst personaValidada = new Proxy(persona, {\n  set(obj, prop, valor) {\n    if (prop === "edad" && valor < 0) {\n      throw new Error("La edad no puede ser negativa");\n    }\n    obj[prop] = valor;\n    return true;\n  }\n});\n\npersonaValidada.edad = 31;   // funciona normal\n// personaValidada.edad = -5; // lanzaria el error',
            ),
            text(
              'Tarea: completa crearCuentaSegura(saldoInicial) para que devuelva un Proxy sobre { saldo: saldoInicial } cuyo trap set impida asignar un valor negativo a saldo (lanzando un Error), y permita cualquier otra asignación normalmente.',
            ),
          ],
          blocksEn: [
            text(
              'new Proxy(targetObject, handlers) creates a "wrapper" object that intercepts basic operations on targetObject. The get(obj, prop) handler fires when READING a property; set(obj, prop, value) fires when WRITING it (it must return true if the assignment is valid). This lets you validate, log or transform access to an object without changing the code that uses it.',
            ),
            js(
              'const person = { age: 30 };\n\nconst validatedPerson = new Proxy(person, {\n  set(obj, prop, value) {\n    if (prop === "age" && value < 0) {\n      throw new Error("Age cannot be negative");\n    }\n    obj[prop] = value;\n    return true;\n  }\n});\n\nvalidatedPerson.age = 31;    // works normally\n// validatedPerson.age = -5; // would throw the error',
            ),
            text(
              'Task: complete crearCuentaSegura(saldoInicial) so it returns a Proxy over { saldo: saldoInicial } whose set trap prevents assigning a negative value to saldo (throwing an Error), and allows any other assignment normally.',
            ),
          ],
          starterCode: 'function crearCuentaSegura(saldoInicial) {\n  // tu código aquí, devuelve un Proxy\n}\n',
          assertions:
            'assert(typeof crearCuentaSegura === "function", "Debes definir crearCuentaSegura");\nvar cuenta = crearCuentaSegura(100);\nassert(cuenta.saldo === 100, "El saldo inicial deberia ser 100");\ncuenta.saldo = 200;\nassert(cuenta.saldo === 200, "Deberia permitir asignar un saldo positivo");\n\nvar lanzoError = false;\ntry {\n  cuenta.saldo = -50;\n} catch (e) {\n  lanzoError = true;\n}\nassert(lanzoError === true, "Deberia lanzar un error al asignar un saldo negativo");\nassert(cuenta.saldo === 200, "El saldo no deberia haber cambiado tras el intento invalido");',
          experience: 30,
          coins: 15,
        }),
        codeExercise({
          title: { es: 'Reflect: operaciones reflexivas', en: 'Reflect: reflective operations' },
          description: {
            es: 'Usa Reflect para inspeccionar y operar sobre objetos de forma estándar.',
            en: 'Use Reflect to inspect and operate on objects in a standard way.',
          },
          blocksEs: [
            text(
              'Reflect es un objeto built-in con métodos que reflejan las operaciones internas de JavaScript sobre objetos (las mismas que Proxy puede interceptar): Reflect.get, Reflect.set, Reflect.has (equivalente a in), Reflect.ownKeys (todas las claves propias, incluso no enumerables). Es común usarlo DENTRO de los manejadores de un Proxy para ejecutar el comportamiento "por defecto" después de tu lógica personalizada.',
            ),
            js(
              'const obj = { a: 1, b: 2 };\nReflect.has(obj, "a");      // true (igual que "a" in obj)\nReflect.ownKeys(obj);       // ["a", "b"]\nReflect.get(obj, "a");      // 1 (igual que obj.a)\nReflect.set(obj, "c", 3);   // true, y ahora obj.c === 3',
            ),
            text(
              'Tarea: completa contarPropiedades(obj) usando Reflect.ownKeys para devolver la cantidad de propiedades propias que tiene obj (sin usar Object.keys).',
            ),
          ],
          blocksEn: [
            text(
              "Reflect is a built-in object with methods that mirror JavaScript's internal operations on objects (the same ones Proxy can intercept): Reflect.get, Reflect.set, Reflect.has (equivalent to in), Reflect.ownKeys (all own keys, even non-enumerable ones). It is commonly used INSIDE a Proxy's handlers to run the \"default\" behavior after your custom logic.",
            ),
            js(
              'const obj = { a: 1, b: 2 };\nReflect.has(obj, "a");      // true (same as "a" in obj)\nReflect.ownKeys(obj);       // ["a", "b"]\nReflect.get(obj, "a");      // 1 (same as obj.a)\nReflect.set(obj, "c", 3);   // true, and now obj.c === 3',
            ),
            text(
              'Task: complete contarPropiedades(obj) using Reflect.ownKeys to return the count of own properties obj has (without using Object.keys).',
            ),
          ],
          starterCode: 'function contarPropiedades(obj) {\n  // tu código aquí, usa Reflect.ownKeys\n}\n',
          assertions:
            'assert(typeof contarPropiedades === "function", "Debes definir contarPropiedades");\nassert(contarPropiedades({ a: 1, b: 2, c: 3 }) === 3, "Deberia contar 3 propiedades");\nassert(contarPropiedades({}) === 0, "Un objeto vacio deberia dar 0");\nassert(contarPropiedades({ x: 1 }) === 1, "Un objeto con una propiedad deberia dar 1");',
          experience: 25,
          coins: 12,
        }),
        quizExercise({
          title: { es: 'Quiz: Proxy y Reflect', en: 'Quiz: Proxy and Reflect' },
          description: { es: 'Confirma que entiendes la interceptación de objetos.', en: 'Confirm you understand object interception.' },
          questionsEs: [
            {
              question: '¿Cuándo se dispara el trap set de un Proxy?',
              options: [
                'Al leer una propiedad',
                'Al asignar/escribir una propiedad del objeto',
                'Al eliminar el objeto',
                'Nunca se dispara automáticamente',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'set intercepta específicamente las operaciones de escritura (obj.prop = valor).',
            },
            {
              question: '¿Qué debe devolver el trap set para indicar que la asignación fue exitosa?',
              options: ['El nuevo valor asignado', 'true', 'El objeto completo', 'No necesita devolver nada'],
              correct: [1],
              isMultiple: false,
              explanation: 'Los traps set deben devolver un booleano: true indica éxito; devolver false (o no devolver nada en modo estricto) puede lanzar un TypeError.',
            },
            {
              question: '¿Para qué se usa comúnmente Reflect dentro de un manejador de Proxy?',
              options: [
                'Para eliminar el Proxy',
                'Para ejecutar la operación "por defecto" (la que habría pasado sin el Proxy) después de tu lógica personalizada',
                'Reflect no tiene relación con Proxy',
                'Para crear nuevas clases',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'Reflect.set/get/etc. replican el comportamiento nativo, así que se usan típicamente para "completar" la operación tras la validación/lógica custom del Proxy.',
            },
            {
              question: '¿Qué devuelve Reflect.has(obj, "clave")?',
              options: [
                'El valor de obj.clave',
                'Un booleano indicando si obj tiene esa propiedad (propia o heredada)',
                'Un array con todas las claves',
                'undefined siempre',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'Reflect.has es el equivalente funcional del operador in: devuelve true/false según si la propiedad existe en la cadena del objeto.',
            },
          ],
          questionsEn: [
            {
              question: "When does a Proxy's set trap fire?",
              options: [
                'When reading a property',
                "When assigning/writing one of the object's properties",
                'When deleting the object',
                'It never fires automatically',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'set specifically intercepts write operations (obj.prop = value).',
            },
            {
              question: 'What must the set trap return to signal the assignment succeeded?',
              options: ['The newly assigned value', 'true', 'The whole object', 'It does not need to return anything'],
              correct: [1],
              isMultiple: false,
              explanation: 'set traps must return a boolean: true means success; returning false (or nothing in strict mode) can throw a TypeError.',
            },
            {
              question: "What is Reflect commonly used for inside a Proxy handler?",
              options: [
                'To delete the Proxy',
                'To run the "default" operation (the one that would have happened without the Proxy) after your custom logic',
                'Reflect has no relation to Proxy',
                'To create new classes',
              ],
              correct: [1],
              isMultiple: false,
              explanation: "Reflect.set/get/etc. replicate the native behavior, so they are typically used to \"complete\" the operation after the Proxy's custom validation/logic.",
            },
            {
              question: 'What does Reflect.has(obj, "key") return?',
              options: [
                'The value of obj.key',
                'A boolean indicating whether obj has that property (own or inherited)',
                'An array with all the keys',
                'Always undefined',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'Reflect.has is the functional equivalent of the in operator: it returns true/false depending on whether the property exists in the object chain.',
            },
          ],
          experience: 30,
          coins: 15,
        }),
      ],
    },

    // ------------------------------------------------------------------
    // Lección 4 — Iteradores y generadores
    // ------------------------------------------------------------------
    {
      title: { es: 'Iteradores y generadores', en: 'Iterators and generators' },
      description: {
        es: 'Cómo funciona for...of por dentro, y cómo pausar/reanudar funciones con yield.',
        en: 'How for...of works under the hood, and how to pause/resume functions with yield.',
      },
      exercises: [
        codeExercise({
          title: { es: 'Generadores: function*  y yield', en: 'Generators: function* and yield' },
          description: {
            es: 'Crea una función que se pausa y reanuda, devolviendo valores uno a la vez.',
            en: 'Create a function that pauses and resumes, yielding values one at a time.',
          },
          blocksEs: [
            text(
              'Una función generadora se declara con function* y usa yield para "pausar" su ejecución devolviendo un valor, hasta que se le pida el siguiente con .next(). Cada llamada a .next() devuelve un objeto { value, done }. Los generadores son perfectos para crear secuencias sin calcular todos los valores de antemano (evaluación perezosa).',
            ),
            js(
              'function* contarHasta3() {\n  yield 1;\n  yield 2;\n  yield 3;\n}\n\nconst gen = contarHasta3();\ngen.next(); // { value: 1, done: false }\ngen.next(); // { value: 2, done: false }\ngen.next(); // { value: 3, done: false }\ngen.next(); // { value: undefined, done: true }\n\n// tambien se pueden recorrer con for...of:\nfor (const n of contarHasta3()) { console.log(n); } // 1, 2, 3',
            ),
            text(
              'Tarea: completa la función generadora rango(inicio, fin) para que produzca (con yield) cada número entero desde inicio hasta fin, ambos inclusive.',
            ),
          ],
          blocksEn: [
            text(
              'A generator function is declared with function* and uses yield to "pause" its execution while returning a value, until the next one is requested with .next(). Each call to .next() returns an object { value, done }. Generators are perfect for creating sequences without computing all values upfront (lazy evaluation).',
            ),
            js(
              'function* countTo3() {\n  yield 1;\n  yield 2;\n  yield 3;\n}\n\nconst gen = countTo3();\ngen.next(); // { value: 1, done: false }\ngen.next(); // { value: 2, done: false }\ngen.next(); // { value: 3, done: false }\ngen.next(); // { value: undefined, done: true }\n\n// can also be iterated with for...of:\nfor (const n of countTo3()) { console.log(n); } // 1, 2, 3',
            ),
            text(
              'Task: complete the generator function rango(inicio, fin) so it yields every integer from inicio to fin, both inclusive.',
            ),
          ],
          starterCode: 'function* rango(inicio, fin) {\n  // tu código aquí, usa yield\n}\n',
          assertions:
            'assert(typeof rango === "function", "Debes definir rango");\nvar valores = Array.from(rango(1, 4));\nassert(JSON.stringify(valores) === JSON.stringify([1, 2, 3, 4]), "rango(1,4) deberia producir [1,2,3,4]");\nvar unSolo = Array.from(rango(5, 5));\nassert(JSON.stringify(unSolo) === JSON.stringify([5]), "rango(5,5) deberia producir [5]");\nvar iterador = rango(10, 12);\nassert(iterador.next().value === 10, "El primer next() deberia dar 10");\nassert(iterador.next().value === 11, "El segundo next() deberia dar 11");',
          experience: 30,
          coins: 15,
        }),
        codeExercise({
          title: { es: 'Iterables personalizados con Symbol.iterator', en: 'Custom iterables with Symbol.iterator' },
          description: {
            es: 'Haz que tu propio objeto funcione con for...of.',
            en: 'Make your own object work with for...of.',
          },
          blocksEs: [
            text(
              'for...of solo funciona sobre objetos "iterables": objetos que tienen un método en la clave especial Symbol.iterator, y ese método debe devolver un iterador (un objeto con .next()). La forma más simple de implementarlo es hacer que Symbol.iterator sea una función generadora.',
            ),
            js(
              'const coleccion = {\n  items: ["a", "b", "c"],\n  [Symbol.iterator]() {\n    let i = 0;\n    const items = this.items;\n    return {\n      next() {\n        return i < items.length\n          ? { value: items[i++], done: false }\n          : { value: undefined, done: true };\n      }\n    };\n  }\n};\n\nfor (const item of coleccion) { console.log(item); } // a, b, c',
            ),
            text(
              'Tarea: completa crearColeccionPar(numeros) para que devuelva un objeto iterable (con [Symbol.iterator] implementado como función generadora) que, al recorrerse con for...of o Array.from, produzca solo los números pares de numeros, en el mismo orden.',
            ),
          ],
          blocksEn: [
            text(
              'for...of only works on "iterable" objects: objects that have a method under the special key Symbol.iterator, and that method must return an iterator (an object with .next()). The simplest way to implement it is to make Symbol.iterator a generator function.',
            ),
            js(
              'const collection = {\n  items: ["a", "b", "c"],\n  [Symbol.iterator]() {\n    let i = 0;\n    const items = this.items;\n    return {\n      next() {\n        return i < items.length\n          ? { value: items[i++], done: false }\n          : { value: undefined, done: true };\n      }\n    };\n  }\n};\n\nfor (const item of collection) { console.log(item); } // a, b, c',
            ),
            text(
              'Task: complete crearColeccionPar(numeros) so it returns an iterable object (with [Symbol.iterator] implemented as a generator function) that, when iterated with for...of or Array.from, yields only the even numbers from numeros, in the same order.',
            ),
          ],
          starterCode:
            'function crearColeccionPar(numeros) {\n  return {\n    [Symbol.iterator]: function* () {\n      // tu código aquí, usa yield solo para los numeros pares\n    }\n  };\n}\n',
          assertions:
            'assert(typeof crearColeccionPar === "function", "Debes definir crearColeccionPar");\nvar resultado = Array.from(crearColeccionPar([1, 2, 3, 4, 5, 6]));\nassert(JSON.stringify(resultado) === JSON.stringify([2, 4, 6]), "Deberia producir solo los pares [2,4,6]");\nvar vacio = Array.from(crearColeccionPar([1, 3, 5]));\nassert(JSON.stringify(vacio) === JSON.stringify([]), "Sin pares deberia producir un array vacio");',
          experience: 30,
          coins: 15,
        }),
        quizExercise({
          title: { es: 'Quiz: iteradores y generadores', en: 'Quiz: iterators and generators' },
          description: { es: 'Repasa function*, yield y Symbol.iterator.', en: 'Review function*, yield and Symbol.iterator.' },
          questionsEs: [
            {
              question: '¿Qué hace yield dentro de una función generadora?',
              options: [
                'Termina la función por completo, como return',
                'Pausa la ejecución devolviendo un valor, hasta que se pida el siguiente con .next()',
                'Lanza un error',
                'Solo funciona dentro de un bucle',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'yield "congela" la función en ese punto exacto; su ejecución se reanuda justo ahí en la siguiente llamada a .next().',
            },
            {
              question: '¿Qué forma tiene el objeto que devuelve cada llamada a .next() de un generador?',
              options: ['Solo el valor directamente', '{ value, done }', 'Un array', 'Una Promise'],
              correct: [1],
              isMultiple: false,
              explanation: 'Cada .next() devuelve { value: elValorProducido, done: booleanIndicandoSiTermino }.',
            },
            {
              question: '¿Qué necesita tener un objeto para poder usarse con for...of?',
              options: [
                'Una propiedad length',
                'Un método bajo la clave Symbol.iterator que devuelva un iterador',
                'Debe ser un array obligatoriamente',
                'No hay ningún requisito, cualquier objeto funciona',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'for...of usa el protocolo de iterables: busca Symbol.iterator en el objeto y lo usa para recorrerlo paso a paso.',
            },
            {
              question: '¿Por qué usar una función generadora es una forma conveniente de implementar Symbol.iterator?',
              options: [
                'Porque es obligatorio hacerlo así',
                'Porque function* ya devuelve automáticamente un objeto con .next() correctamente implementado, sin escribirlo a mano',
                'Porque los generadores son más rápidos siempre',
                'No hay ninguna ventaja real',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'Un generador YA ES un iterador válido (tiene .next() con la forma correcta), así que ahorra tener que implementar ese objeto manualmente.',
            },
          ],
          questionsEn: [
            {
              question: 'What does yield do inside a generator function?',
              options: [
                'Ends the function completely, like return',
                'Pauses execution returning a value, until the next one is requested with .next()',
                'Throws an error',
                'It only works inside a loop',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'yield "freezes" the function at that exact point; execution resumes right there on the next call to .next().',
            },
            {
              question: 'What shape does the object returned by each call to a generator .next() have?',
              options: ['Just the value directly', '{ value, done }', 'An array', 'A Promise'],
              correct: [1],
              isMultiple: false,
              explanation: 'Each .next() returns { value: theProducedValue, done: booleanSayingIfItFinished }.',
            },
            {
              question: 'What does an object need to have to be usable with for...of?',
              options: [
                'A length property',
                'A method under the Symbol.iterator key that returns an iterator',
                'It must necessarily be an array',
                'There is no requirement, any object works',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'for...of uses the iterable protocol: it looks up Symbol.iterator on the object and uses it to walk through it step by step.',
            },
            {
              question: 'Why is a generator function a convenient way to implement Symbol.iterator?',
              options: [
                'Because it is mandatory to do it that way',
                'Because function* already automatically returns an object with a correctly implemented .next(), without writing it by hand',
                'Because generators are always faster',
                'There is no real advantage',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'A generator IS ALREADY a valid iterator (it has .next() with the right shape), so it saves you from implementing that object manually.',
            },
          ],
          experience: 30,
          coins: 15,
        }),
      ],
    },

    // ------------------------------------------------------------------
    // Lección 5 — Patrones de diseño en JS
    // ------------------------------------------------------------------
    {
      title: { es: 'Patrones de diseño en JS', en: 'Design patterns in JS' },
      description: {
        es: 'Singleton y Factory: soluciones reutilizables a problemas comunes de diseño.',
        en: 'Singleton and Factory: reusable solutions to common design problems.',
      },
      exercises: [
        codeExercise({
          title: { es: 'Patrón Singleton', en: 'Singleton pattern' },
          description: {
            es: 'Garantiza que solo exista una única instancia de algo en toda la app.',
            en: 'Guarantee that only a single instance of something exists in the whole app.',
          },
          blocksEs: [
            text(
              'El patrón Singleton garantiza que una clase (o módulo) tenga UNA SOLA instancia compartida en toda la aplicación, accesible desde cualquier parte (por ejemplo: una conexión a base de datos, una configuración global). Se implementa guardando la instancia ya creada en un closure o variable de módulo, y devolviendo siempre esa misma referencia.',
            ),
            js(
              'let instancia = null;\n\nfunction obtenerConfiguracion() {\n  if (instancia === null) {\n    instancia = { tema: "oscuro", version: "1.0" }; // se crea solo la primera vez\n  }\n  return instancia;\n}\n\nconst a = obtenerConfiguracion();\nconst b = obtenerConfiguracion();\na === b; // true, son literalmente el mismo objeto',
            ),
            text(
              'Tarea: completa crearSingletonDeContador() para que devuelva una función obtenerContador() que, sin importar cuántas veces se llame, siempre devuelva la MISMA instancia de un objeto { valor: 0 } (creada solo la primera vez que se llama).',
            ),
          ],
          blocksEn: [
            text(
              'The Singleton pattern guarantees that a class (or module) has ONE SINGLE shared instance across the whole application, accessible from anywhere (for example: a database connection, a global configuration). It is implemented by storing the already-created instance in a closure or module variable, and always returning that same reference.',
            ),
            js(
              'let instance = null;\n\nfunction getConfig() {\n  if (instance === null) {\n    instance = { theme: "dark", version: "1.0" }; // created only the first time\n  }\n  return instance;\n}\n\nconst a = getConfig();\nconst b = getConfig();\na === b; // true, they are literally the same object',
            ),
            text(
              'Task: complete crearSingletonDeContador() so it returns a function obtenerContador() that, no matter how many times it is called, always returns the SAME instance of a { valor: 0 } object (created only the first time it is called).',
            ),
          ],
          starterCode: 'function crearSingletonDeContador() {\n  // tu código aquí, usa un closure\n}\n\nconst obtenerContador = crearSingletonDeContador();\n',
          assertions:
            'assert(typeof crearSingletonDeContador === "function", "Debes definir crearSingletonDeContador");\nassert(typeof obtenerContador === "function", "crearSingletonDeContador() debe devolver una funcion");\nvar c1 = obtenerContador();\nvar c2 = obtenerContador();\nassert(c1 === c2, "Ambas llamadas deberian devolver la MISMA instancia");\nc1.valor = 99;\nassert(c2.valor === 99, "Como es la misma instancia, el cambio deberia verse reflejado en c2 tambien");',
          experience: 25,
          coins: 12,
        }),
        codeExercise({
          title: { es: 'Patrón Factory', en: 'Factory pattern' },
          description: {
            es: 'Centraliza la creación de objetos similares pero distintos según un tipo.',
            en: 'Centralize the creation of similar but distinct objects based on a type.',
          },
          blocksEs: [
            text(
              'El patrón Factory centraliza la lógica de creación de objetos en una sola función, que decide QUÉ crear según un parámetro (en vez de que el código que llama tenga que saber los detalles de cada tipo). Esto facilita agregar nuevos tipos sin tocar el código que consume la fábrica.',
            ),
            js(
              'function crearNotificacion(tipo, mensaje) {\n  if (tipo === "email") return { canal: "email", mensaje, icono: "✉️" };\n  if (tipo === "sms") return { canal: "sms", mensaje, icono: "📱" };\n  return { canal: "desconocido", mensaje, icono: "❓" };\n}\n\ncrearNotificacion("email", "Hola"); // { canal: "email", mensaje: "Hola", icono: "✉️" }',
            ),
            text(
              'Tarea: completa crearFigura(tipo, medida) que devuelva: para tipo "circulo" -> { tipo: "circulo", area: Math.PI * medida * medida }; para tipo "cuadrado" -> { tipo: "cuadrado", area: medida * medida }; para cualquier otro tipo -> { tipo: "desconocido", area: 0 }.',
            ),
          ],
          blocksEn: [
            text(
              'The Factory pattern centralizes object-creation logic in a single function, which decides WHAT to create based on a parameter (instead of the calling code needing to know each type\'s details). This makes it easy to add new types without touching the code that consumes the factory.',
            ),
            js(
              'function createNotification(type, message) {\n  if (type === "email") return { channel: "email", message, icon: "✉️" };\n  if (type === "sms") return { channel: "sms", message, icon: "📱" };\n  return { channel: "unknown", message, icon: "❓" };\n}\n\ncreateNotification("email", "Hi"); // { channel: "email", message: "Hi", icon: "✉️" }',
            ),
            text(
              'Task: complete crearFigura(tipo, medida) so it returns: for type "circulo" -> { tipo: "circulo", area: Math.PI * medida * medida }; for type "cuadrado" -> { tipo: "cuadrado", area: medida * medida }; for any other type -> { tipo: "desconocido", area: 0 }.',
            ),
          ],
          starterCode: 'function crearFigura(tipo, medida) {\n  // tu código aquí\n}\n',
          assertions:
            'assert(typeof crearFigura === "function", "Debes definir crearFigura");\nvar circulo = crearFigura("circulo", 2);\nassert(circulo.tipo === "circulo", "El tipo deberia ser circulo");\nassert(Math.abs(circulo.area - Math.PI * 4) < 0.001, "El area del circulo deberia ser PI*radio^2");\nvar cuadrado = crearFigura("cuadrado", 5);\nassert(cuadrado.area === 25, "El area del cuadrado deberia ser 25");\nvar otro = crearFigura("triangulo", 10);\nassert(otro.tipo === "desconocido" && otro.area === 0, "Un tipo no soportado deberia devolver desconocido con area 0");',
          experience: 25,
          coins: 12,
        }),
        quizExercise({
          title: { es: 'Quiz: patrones de diseño', en: 'Quiz: design patterns' },
          description: { es: 'Repasa Singleton y Factory.', en: 'Review Singleton and Factory.' },
          questionsEs: [
            {
              question: '¿Qué garantiza el patrón Singleton?',
              options: [
                'Que una función se ejecute muy rápido',
                'Que exista una única instancia compartida, accesible desde cualquier parte',
                'Que un objeto nunca pueda modificarse',
                'Que una clase tenga múltiples instancias independientes',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'El objetivo central de Singleton es "una sola instancia compartida", en contraste con crear una nueva cada vez que se necesita.',
            },
            {
              question: '¿Cómo se suele implementar un Singleton en JavaScript?',
              options: [
                'Con un bucle infinito',
                'Guardando la instancia ya creada en un closure/variable de módulo y devolviendo siempre esa misma referencia',
                'Creando una nueva instancia en cada llamada',
                'Solo es posible con clases, no con funciones',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'La clave es "recordar" (via closure) si ya se creó la instancia, y si es así, devolver esa misma referencia en vez de crear una nueva.',
            },
            {
              question: '¿Qué problema resuelve principalmente el patrón Factory?',
              options: [
                'Centraliza la lógica de creación de objetos similares según un tipo, evitando que el código llamador conozca los detalles internos',
                'Elimina la necesidad de funciones',
                'Hace que los objetos sean inmutables',
                'Solo sirve para crear arrays',
              ],
              correct: [0],
              isMultiple: false,
              explanation: 'Factory delega la decisión de "qué crear" a una función central, manteniendo el código consumidor simple y desacoplado de los detalles de cada tipo.',
            },
            {
              question: 'Si crearFigura("circulo", 2) === crearFigura("circulo", 2), ¿sería true?',
              options: [
                'Sí, siempre, porque los parámetros son iguales',
                'No necesariamente: cada llamada crea un objeto NUEVO (con === se compara referencia, no contenido)',
                'Solo si se usa Singleton en vez de Factory',
                'JavaScript siempre compara objetos por su contenido',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'A diferencia de Singleton, una Factory típica crea una instancia nueva en cada llamada; aunque el contenido sea igual, son objetos distintos en memoria, así que === da false.',
            },
          ],
          questionsEn: [
            {
              question: 'What does the Singleton pattern guarantee?',
              options: [
                'That a function runs very fast',
                'That a single shared instance exists, accessible from anywhere',
                'That an object can never be modified',
                'That a class has multiple independent instances',
              ],
              correct: [1],
              isMultiple: false,
              explanation: "Singleton's core goal is \"one single shared instance\", as opposed to creating a new one every time it is needed.",
            },
            {
              question: 'How is a Singleton usually implemented in JavaScript?',
              options: [
                'With an infinite loop',
                'By storing the already-created instance in a closure/module variable and always returning that same reference',
                'By creating a new instance on every call',
                'It is only possible with classes, not functions',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'The key is "remembering" (via closure) whether the instance was already created, and if so, returning that same reference instead of creating a new one.',
            },
            {
              question: 'What problem does the Factory pattern mainly solve?',
              options: [
                'It centralizes the creation logic of similar objects based on a type, keeping the calling code unaware of internal details',
                'It removes the need for functions',
                'It makes objects immutable',
                'It only serves to create arrays',
              ],
              correct: [0],
              isMultiple: false,
              explanation: 'Factory delegates the "what to create" decision to a central function, keeping the consuming code simple and decoupled from each type\'s details.',
            },
            {
              question: 'If crearFigura("circulo", 2) === crearFigura("circulo", 2), would that be true?',
              options: [
                'Yes, always, because the parameters are equal',
                'Not necessarily: each call creates a NEW object (=== compares reference, not content)',
                'Only if Singleton is used instead of Factory',
                'JavaScript always compares objects by content',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'Unlike Singleton, a typical Factory creates a new instance on every call; even if the content is equal, they are different objects in memory, so === is false.',
            },
          ],
          experience: 30,
          coins: 15,
        }),
      ],
    },

    // ------------------------------------------------------------------
    // Lección 6 — Estructuras de datos desde cero
    // ------------------------------------------------------------------
    {
      title: { es: 'Estructuras de datos desde cero', en: 'Data structures from scratch' },
      description: {
        es: 'Implementa Stack y Queue usando clases, entendiendo cuándo usar cada una.',
        en: 'Implement Stack and Queue using classes, understanding when to use each one.',
      },
      exercises: [
        codeExercise({
          title: { es: 'Stack (pila): LIFO', en: 'Stack: LIFO' },
          description: {
            es: 'Implementa una pila donde el último en entrar es el primero en salir.',
            en: 'Implement a stack where the last one in is the first one out.',
          },
          blocksEs: [
            text(
              'Un Stack (pila) sigue la regla LIFO (Last In, First Out): el último elemento agregado es el primero en salir — como una pila de platos. Se puede implementar con un array usando push (agregar arriba) y pop (quitar de arriba). Es la misma estructura que usa el call stack que viste antes: cada llamada se "apila" y se "desapila" en orden inverso.',
            ),
            js(
              'class Pila {\n  constructor() { this.items = []; }\n  apilar(item) { this.items.push(item); }\n  desapilar() { return this.items.pop(); }\n  espiar() { return this.items[this.items.length - 1]; }\n  estaVacia() { return this.items.length === 0; }\n}\n\nconst p = new Pila();\np.apilar(1);\np.apilar(2);\np.desapilar(); // 2 (el ultimo que entro)',
            ),
            text(
              'Tarea: completa la clase Pila con los métodos apilar(item) (agrega arriba), desapilar() (quita y devuelve el de arriba, o undefined si está vacía), espiar() (devuelve el de arriba sin quitarlo) y estaVacia() (booleano).',
            ),
          ],
          blocksEn: [
            text(
              'A Stack follows the LIFO rule (Last In, First Out): the last element added is the first one out — like a stack of plates. It can be implemented with an array using push (add on top) and pop (remove from top). It is the same structure the call stack you saw earlier uses: each call is "pushed" and "popped" in reverse order.',
            ),
            js(
              'class Stack {\n  constructor() { this.items = []; }\n  push(item) { this.items.push(item); }\n  pop() { return this.items.pop(); }\n  peek() { return this.items[this.items.length - 1]; }\n  isEmpty() { return this.items.length === 0; }\n}\n\nconst s = new Stack();\ns.push(1);\ns.push(2);\ns.pop(); // 2 (the last one in)',
            ),
            text(
              'Task: complete the class Pila with the methods apilar(item) (add on top), desapilar() (remove and return the top one, or undefined if empty), espiar() (return the top one without removing it) and estaVacia() (boolean).',
            ),
          ],
          starterCode:
            'class Pila {\n  constructor() {\n    this.items = [];\n  }\n\n  // tu código aquí: apilar, desapilar, espiar, estaVacia\n}\n',
          assertions:
            'assert(typeof Pila === "function", "Debes definir la clase Pila");\nvar pila = new Pila();\nassert(pila.estaVacia() === true, "Una pila nueva deberia estar vacia");\npila.apilar(1);\npila.apilar(2);\npila.apilar(3);\nassert(pila.estaVacia() === false, "Con elementos ya no deberia estar vacia");\nassert(pila.espiar() === 3, "espiar deberia mostrar el ultimo apilado (3) sin quitarlo");\nassert(pila.desapilar() === 3, "desapilar deberia devolver 3 (el ultimo en entrar)");\nassert(pila.desapilar() === 2, "el siguiente desapilar deberia devolver 2");\nassert(pila.espiar() === 1, "solo deberia quedar el 1");',
          experience: 30,
          coins: 15,
        }),
        codeExercise({
          title: { es: 'Queue (cola): FIFO', en: 'Queue: FIFO' },
          description: {
            es: 'Implementa una cola donde el primero en entrar es el primero en salir.',
            en: 'Implement a queue where the first one in is the first one out.',
          },
          blocksEs: [
            text(
              'Un Queue (cola) sigue la regla FIFO (First In, First Out): el primer elemento agregado es el primero en salir — como una fila para pagar en una tienda. Se implementa con un array usando push (agregar al final) y shift (quitar del principio). Se usa mucho para procesar tareas en el orden en que llegaron.',
            ),
            js(
              'class Cola {\n  constructor() { this.items = []; }\n  encolar(item) { this.items.push(item); }\n  desencolar() { return this.items.shift(); }\n  frente() { return this.items[0]; }\n  estaVacia() { return this.items.length === 0; }\n}\n\nconst c = new Cola();\nc.encolar("a");\nc.encolar("b");\nc.desencolar(); // "a" (el primero que entro)',
            ),
            text(
              'Tarea: completa la clase Cola con los métodos encolar(item) (agrega al final), desencolar() (quita y devuelve el del frente, o undefined si está vacía), frente() (devuelve el del frente sin quitarlo) y estaVacia() (booleano).',
            ),
          ],
          blocksEn: [
            text(
              'A Queue follows the FIFO rule (First In, First Out): the first element added is the first one out — like a line to pay at a store. It is implemented with an array using push (add to the end) and shift (remove from the front). It is heavily used to process tasks in the order they arrived.',
            ),
            js(
              'class Queue {\n  constructor() { this.items = []; }\n  enqueue(item) { this.items.push(item); }\n  dequeue() { return this.items.shift(); }\n  front() { return this.items[0]; }\n  isEmpty() { return this.items.length === 0; }\n}\n\nconst q = new Queue();\nq.enqueue("a");\nq.enqueue("b");\nq.dequeue(); // "a" (the first one in)',
            ),
            text(
              'Task: complete the class Cola with the methods encolar(item) (add to the end), desencolar() (remove and return the front one, or undefined if empty), frente() (return the front one without removing it) and estaVacia() (boolean).',
            ),
          ],
          starterCode:
            'class Cola {\n  constructor() {\n    this.items = [];\n  }\n\n  // tu código aquí: encolar, desencolar, frente, estaVacia\n}\n',
          assertions:
            'assert(typeof Cola === "function", "Debes definir la clase Cola");\nvar cola = new Cola();\nassert(cola.estaVacia() === true, "Una cola nueva deberia estar vacia");\ncola.encolar("a");\ncola.encolar("b");\ncola.encolar("c");\nassert(cola.frente() === "a", "frente deberia mostrar el primero en entrar (a)");\nassert(cola.desencolar() === "a", "desencolar deberia devolver a (el primero en entrar)");\nassert(cola.desencolar() === "b", "el siguiente desencolar deberia devolver b");\nassert(cola.frente() === "c", "solo deberia quedar c");',
          experience: 30,
          coins: 15,
        }),
        quizExercise({
          title: { es: 'Quiz: estructuras de datos', en: 'Quiz: data structures' },
          description: { es: 'Repasa Stack (LIFO) y Queue (FIFO).', en: 'Review Stack (LIFO) and Queue (FIFO).' },
          questionsEs: [
            {
              question: '¿Qué significa que un Stack es LIFO?',
              options: [
                'Last In, First Out: el último en entrar es el primero en salir',
                'Last In, First Out: el primero en entrar es el último en salir',
                'Es un acrónimo sin significado real',
                'Los elementos se ordenan alfabéticamente',
              ],
              correct: [0],
              isMultiple: false,
              explanation: 'LIFO describe exactamente el comportamiento de una pila: el elemento más reciente es el primero en retirarse.',
            },
            {
              question: '¿Qué método de array usarías para "desencolar" (quitar del frente) en una Queue?',
              options: ['pop()', 'shift()', 'push()', 'splice(-1)'],
              correct: [1],
              isMultiple: false,
              explanation: 'shift() remueve y devuelve el PRIMER elemento del array, exactamente el comportamiento FIFO que necesita una cola.',
            },
            {
              question: '¿Cuál es un buen caso de uso real para un Stack?',
              options: [
                'Procesar tickets de soporte en el orden en que llegaron',
                'El botón "deshacer" de un editor: la última acción hecha es la primera en deshacerse',
                'Una fila de impresión de documentos',
                'Ninguno, los Stacks no tienen uso práctico',
              ],
              correct: [1],
              isMultiple: false,
              explanation: '"Deshacer" es un ejemplo clásico de LIFO: la acción más reciente es la primera que se revierte, igual que desapilar.',
            },
            {
              question: '¿Cuál es la diferencia estructural clave entre Stack y Queue?',
              options: [
                'Stack quita del final (LIFO); Queue quita del principio (FIFO), aunque ambos agregan al final',
                'No hay ninguna diferencia',
                'Queue solo acepta números',
                'Stack no puede estar vacío nunca',
              ],
              correct: [0],
              isMultiple: false,
              explanation: 'Ambos agregan elementos de la misma forma (al final), pero difieren en DÓNDE quitan: Stack del final (pop), Queue del principio (shift).',
            },
          ],
          questionsEn: [
            {
              question: 'What does it mean that a Stack is LIFO?',
              options: [
                'Last In, First Out: the last one in is the first one out',
                'Last In, First Out: the first one in is the last one out',
                'It is an acronym with no real meaning',
                'Elements are sorted alphabetically',
              ],
              correct: [0],
              isMultiple: false,
              explanation: 'LIFO exactly describes a stack\'s behavior: the most recently added element is the first one removed.',
            },
            {
              question: 'Which array method would you use to "dequeue" (remove from the front) in a Queue?',
              options: ['pop()', 'shift()', 'push()', 'splice(-1)'],
              correct: [1],
              isMultiple: false,
              explanation: 'shift() removes and returns the FIRST element of the array, exactly the FIFO behavior a queue needs.',
            },
            {
              question: 'What is a good real use case for a Stack?',
              options: [
                'Processing support tickets in the order they arrived',
                "An editor's \"undo\" button: the last action done is the first one undone",
                'A document printing queue',
                'None, Stacks have no practical use',
              ],
              correct: [1],
              isMultiple: false,
              explanation: '"Undo" is a classic LIFO example: the most recent action is the first one reverted, just like popping a stack.',
            },
            {
              question: 'What is the key structural difference between Stack and Queue?',
              options: [
                'Stack removes from the end (LIFO); Queue removes from the front (FIFO), though both add to the end',
                'There is no difference',
                'Queue only accepts numbers',
                'A Stack can never be empty',
              ],
              correct: [0],
              isMultiple: false,
              explanation: 'Both add elements the same way (to the end), but they differ in WHERE they remove from: Stack from the end (pop), Queue from the front (shift).',
            },
          ],
          experience: 30,
          coins: 15,
        }),
      ],
    },

    // ------------------------------------------------------------------
    // Lección 7 — Algoritmos y complejidad
    // ------------------------------------------------------------------
    {
      title: { es: 'Algoritmos y complejidad', en: 'Algorithms and complexity' },
      description: {
        es: 'Big-O, búsqueda binaria y ordenamiento: cómo medir y mejorar la eficiencia.',
        en: 'Big-O, binary search and sorting: how to measure and improve efficiency.',
      },
      exercises: [
        codeExercise({
          title: { es: 'Búsqueda binaria: O(log n)', en: 'Binary search: O(log n)' },
          description: {
            es: 'Encuentra un elemento en un array ordenado descartando la mitad en cada paso.',
            en: 'Find an element in a sorted array by discarding half on each step.',
          },
          blocksEs: [
            text(
              'La notación Big-O describe cómo crece el tiempo de ejecución cuando crece el tamaño del input n. Una búsqueda lineal (recorrer uno por uno) es O(n): en el peor caso revisa todos los elementos. La búsqueda binaria, sobre un array YA ORDENADO, es O(log n): en cada paso compara con el elemento del medio y descarta la MITAD del array restante, muchísimo más rápida para arrays grandes.',
            ),
            js(
              'function busquedaBinaria(arr, objetivo) {\n  let inicio = 0;\n  let fin = arr.length - 1;\n\n  while (inicio <= fin) {\n    const medio = Math.floor((inicio + fin) / 2);\n    if (arr[medio] === objetivo) return medio;\n    if (arr[medio] < objetivo) inicio = medio + 1; // descarta la mitad izquierda\n    else fin = medio - 1;                          // descarta la mitad derecha\n  }\n  return -1; // no encontrado\n}\n\nbusquedaBinaria([1, 3, 5, 7, 9, 11], 7); // 3 (indice de 7)',
            ),
            text(
              'Tarea: completa busquedaBinaria(arr, objetivo) (arr ya viene ordenado ascendentemente) para que devuelva el índice de objetivo, o -1 si no está.',
            ),
          ],
          blocksEn: [
            text(
              'Big-O notation describes how execution time grows as the input size n grows. A linear search (checking one by one) is O(n): in the worst case it checks every element. Binary search, over an ALREADY SORTED array, is O(log n): on each step it compares against the middle element and discards HALF of the remaining array, much faster for large arrays.',
            ),
            js(
              'function binarySearch(arr, target) {\n  let start = 0;\n  let end = arr.length - 1;\n\n  while (start <= end) {\n    const mid = Math.floor((start + end) / 2);\n    if (arr[mid] === target) return mid;\n    if (arr[mid] < target) start = mid + 1;  // discard the left half\n    else end = mid - 1;                       // discard the right half\n  }\n  return -1; // not found\n}\n\nbinarySearch([1, 3, 5, 7, 9, 11], 7); // 3 (index of 7)',
            ),
            text(
              'Task: complete busquedaBinaria(arr, objetivo) (arr already comes sorted ascending) so it returns the index of objetivo, or -1 if not present.',
            ),
          ],
          starterCode: 'function busquedaBinaria(arr, objetivo) {\n  // tu código aquí\n}\n',
          assertions:
            'assert(typeof busquedaBinaria === "function", "Debes definir busquedaBinaria");\nassert(busquedaBinaria([1, 3, 5, 7, 9, 11], 7) === 3, "7 esta en el indice 3");\nassert(busquedaBinaria([1, 3, 5, 7, 9, 11], 1) === 0, "1 esta en el indice 0");\nassert(busquedaBinaria([1, 3, 5, 7, 9, 11], 11) === 5, "11 esta en el indice 5");\nassert(busquedaBinaria([1, 3, 5, 7, 9, 11], 4) === -1, "4 no esta en el array");\nassert(busquedaBinaria([], 1) === -1, "Un array vacio deberia dar -1");',
          experience: 30,
          coins: 15,
        }),
        codeExercise({
          title: { es: 'Ordenamiento burbuja: O(n²)', en: 'Bubble sort: O(n²)' },
          description: {
            es: 'Implementa un algoritmo de ordenamiento simple y entiende por qué es lento para arrays grandes.',
            en: 'Implement a simple sorting algorithm and understand why it is slow for large arrays.',
          },
          blocksEs: [
            text(
              'Bubble sort recorre el array repetidamente, comparando pares de elementos adyacentes e intercambiándolos si están en el orden incorrecto, hasta que no se necesitan más intercambios. Es O(n²): tiene un bucle dentro de otro bucle, ambos de tamaño ~n, así que el trabajo crece con el cuadrado del tamaño del input (para 10 elementos son ~100 comparaciones; para 1000, ~1,000,000). Es fácil de entender pero poco eficiente para arrays grandes — array.sort() del lenguaje usa algoritmos mucho mejores.',
            ),
            js(
              'function ordenamientoBurbuja(arr) {\n  const copia = [...arr]; // no mutar el original\n  for (let i = 0; i < copia.length; i++) {\n    for (let j = 0; j < copia.length - i - 1; j++) {\n      if (copia[j] > copia[j + 1]) {\n        [copia[j], copia[j + 1]] = [copia[j + 1], copia[j]]; // swap con destructuring\n      }\n    }\n  }\n  return copia;\n}\n\nordenamientoBurbuja([5, 2, 8, 1]); // [1, 2, 5, 8]',
            ),
            text(
              'Tarea: completa ordenamientoBurbuja(arr) para que devuelva un array NUEVO con los mismos números de arr pero ordenados de menor a mayor, sin mutar arr.',
            ),
          ],
          blocksEn: [
            text(
              'Bubble sort repeatedly walks the array, comparing adjacent pairs of elements and swapping them if they are in the wrong order, until no more swaps are needed. It is O(n²): it has a loop inside another loop, both of size ~n, so the work grows with the square of the input size (for 10 elements that is ~100 comparisons; for 1000, ~1,000,000). It is easy to understand but not efficient for large arrays — the language\'s array.sort() uses much better algorithms.',
            ),
            js(
              'function bubbleSort(arr) {\n  const copy = [...arr]; // do not mutate the original\n  for (let i = 0; i < copy.length; i++) {\n    for (let j = 0; j < copy.length - i - 1; j++) {\n      if (copy[j] > copy[j + 1]) {\n        [copy[j], copy[j + 1]] = [copy[j + 1], copy[j]]; // swap with destructuring\n      }\n    }\n  }\n  return copy;\n}\n\nbubbleSort([5, 2, 8, 1]); // [1, 2, 5, 8]',
            ),
            text(
              'Task: complete ordenamientoBurbuja(arr) so it returns a NEW array with the same numbers from arr but sorted ascending, without mutating arr.',
            ),
          ],
          starterCode: 'function ordenamientoBurbuja(arr) {\n  // tu código aquí, no mutes arr\n}\n',
          assertions:
            'assert(typeof ordenamientoBurbuja === "function", "Debes definir ordenamientoBurbuja");\nvar original = [5, 2, 8, 1, 9];\nvar resultado = ordenamientoBurbuja(original);\nassert(JSON.stringify(resultado) === JSON.stringify([1, 2, 5, 8, 9]), "Deberia devolver el array ordenado ascendente");\nassert(JSON.stringify(original) === JSON.stringify([5, 2, 8, 1, 9]), "El array original NO deberia mutarse");\nassert(JSON.stringify(ordenamientoBurbuja([])) === JSON.stringify([]), "Un array vacio deberia devolver vacio");\nassert(JSON.stringify(ordenamientoBurbuja([1])) === JSON.stringify([1]), "Un solo elemento deberia devolverse igual");',
          experience: 30,
          coins: 15,
        }),
        quizExercise({
          title: { es: 'Quiz: Big-O y algoritmos', en: 'Quiz: Big-O and algorithms' },
          description: { es: 'Repasa complejidad, búsqueda binaria y ordenamiento.', en: 'Review complexity, binary search and sorting.' },
          questionsEs: [
            {
              question: '¿Qué requisito necesita el array para poder aplicar búsqueda binaria?',
              options: [
                'Debe contener solo números',
                'Debe estar ordenado',
                'Debe tener un número par de elementos',
                'No hay ningún requisito',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'La búsqueda binaria depende de poder descartar la mitad "incorrecta" comparando con el medio, lo cual solo es válido si el array ya está ordenado.',
            },
            {
              question: '¿Por qué la búsqueda binaria es O(log n) en vez de O(n)?',
              options: [
                'Porque revisa todos los elementos igual que la búsqueda lineal',
                'Porque en cada paso descarta la mitad de los elementos restantes, reduciendo el problema exponencialmente rápido',
                'Porque usa más memoria',
                'No es más rápida realmente',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'Descartar la mitad en cada paso significa que el número de pasos necesarios crece muy lentamente (logarítmicamente) respecto al tamaño del array.',
            },
            {
              question: '¿Por qué bubble sort es O(n²)?',
              options: [
                'Porque usa recursión',
                'Porque tiene un bucle anidado dentro de otro, ambos de tamaño proporcional a n',
                'Porque siempre falla con arrays grandes',
                'Porque usa Promises',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'El bucle exterior recorre ~n elementos y por cada uno el bucle interior recorre ~n elementos también: n * n = n².',
            },
            {
              question: 'Para un array de 1,000,000 de elementos, ¿qué algoritmo sería drásticamente más rápido?',
              options: [
                'Bubble sort, siempre es mejor',
                'Búsqueda binaria O(log n) sobre búsqueda lineal O(n), para buscar un elemento en un array ordenado',
                'No hay diferencia práctica entre O(n) y O(log n)',
                'Todos los algoritmos tardan lo mismo sin importar el tamaño',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'Para 1,000,000 de elementos, O(n) puede significar hasta un millón de pasos, mientras que O(log n) apenas ronda los 20 pasos: una diferencia enorme en la práctica.',
            },
          ],
          questionsEn: [
            {
              question: 'What requirement does the array need to apply binary search?',
              options: [
                'It must contain only numbers',
                'It must be sorted',
                'It must have an even number of elements',
                'There is no requirement',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'Binary search relies on being able to discard the "wrong" half by comparing against the middle, which is only valid if the array is already sorted.',
            },
            {
              question: 'Why is binary search O(log n) instead of O(n)?',
              options: [
                'Because it checks every element just like linear search',
                'Because on each step it discards half of the remaining elements, shrinking the problem exponentially fast',
                'Because it uses more memory',
                'It is not actually faster',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'Discarding half on each step means the number of steps needed grows very slowly (logarithmically) relative to the array size.',
            },
            {
              question: 'Why is bubble sort O(n²)?',
              options: [
                'Because it uses recursion',
                'Because it has a loop nested inside another, both of size proportional to n',
                'Because it always fails on large arrays',
                'Because it uses Promises',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'The outer loop walks ~n elements and for each one the inner loop also walks ~n elements: n * n = n².',
            },
            {
              question: 'For an array of 1,000,000 elements, which algorithm would be drastically faster?',
              options: [
                'Bubble sort, it is always better',
                'Binary search O(log n) over linear search O(n), to find an element in a sorted array',
                'There is no practical difference between O(n) and O(log n)',
                'All algorithms take the same time regardless of size',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'For 1,000,000 elements, O(n) can mean up to a million steps, while O(log n) is only around 20 steps: a huge difference in practice.',
            },
          ],
          experience: 30,
          coins: 15,
        }),
      ],
    },

    // ------------------------------------------------------------------
    // Lección 8 — Asincronía avanzada
    // ------------------------------------------------------------------
    {
      title: { es: 'Asincronía avanzada', en: 'Advanced asynchrony' },
      description: {
        es: 'Promise.all, Promise.allSettled y control de concurrencia.',
        en: 'Promise.all, Promise.allSettled and concurrency control.',
      },
      exercises: [
        codeExercise({
          title: { es: 'Promise.all: esperar varias en paralelo', en: 'Promise.all: waiting for several in parallel' },
          description: {
            es: 'Ejecuta varias operaciones asíncronas a la vez y espera a que todas terminen.',
            en: 'Run several asynchronous operations at once and wait for all to finish.',
          },
          blocksEs: [
            text(
              'Promise.all(arrayDePromises) devuelve UNA Promise que se resuelve cuando TODAS las promises del array se resolvieron, con un array de sus resultados en el mismo orden. Es mucho más rápido que await-earlas una por una cuando son independientes entre sí, porque se ejecutan en paralelo. Si UNA sola se rechaza, Promise.all se rechaza inmediatamente con ese error (sin esperar a las demás).',
            ),
            js(
              'function obtener(id) {\n  return new Promise((resolve) => resolve({ id, valor: id * 10 }));\n}\n\nasync function obtenerTodos(ids) {\n  const promesas = ids.map((id) => obtener(id)); // se lanzan todas en paralelo\n  const resultados = await Promise.all(promesas); // espera a que todas terminen\n  return resultados;\n}\n\nawait obtenerTodos([1, 2, 3]); // [{id:1,valor:10}, {id:2,valor:20}, {id:3,valor:30}]',
            ),
            text(
              'Tarea: completa la función async obtenerVarios(ids) para que use .map() para crear un array de Promises (una por cada id, usando la función obtener ya dada arriba) y luego Promise.all para esperarlas todas, devolviendo el array de resultados en orden.',
            ),
          ],
          blocksEn: [
            text(
              'Promise.all(promisesArray) returns ONE Promise that resolves once ALL the promises in the array have resolved, with an array of their results in the same order. It is much faster than awaiting them one by one when they are independent of each other, because they run in parallel. If just ONE rejects, Promise.all rejects immediately with that error (without waiting for the rest).',
            ),
            js(
              'function fetchOne(id) {\n  return new Promise((resolve) => resolve({ id, value: id * 10 }));\n}\n\nasync function fetchAll(ids) {\n  const promises = ids.map((id) => fetchOne(id)); // all launched in parallel\n  const results = await Promise.all(promises);    // wait for all to finish\n  return results;\n}\n\nawait fetchAll([1, 2, 3]); // [{id:1,value:10}, {id:2,value:20}, {id:3,value:30}]',
            ),
            text(
              'Task: complete the async function obtenerVarios(ids) so it uses .map() to create an array of Promises (one per id, using the obtener function already given above) and then Promise.all to wait for all of them, returning the results array in order.',
            ),
          ],
          starterCode:
            'function obtener(id) {\n  return new Promise((resolve) => resolve({ id, valor: id * 10 }));\n}\n\nasync function obtenerVarios(ids) {\n  // tu código aquí, usa map + Promise.all\n}\n',
          assertions:
            'assert(typeof obtenerVarios === "function", "Debes definir obtenerVarios");\nvar resultados = await obtenerVarios([1, 2, 3]);\nassert(Array.isArray(resultados) && resultados.length === 3, "Deberia devolver un array de 3 resultados");\nassert(resultados[0].id === 1 && resultados[0].valor === 10, "El primer resultado deberia ser id 1, valor 10");\nassert(resultados[2].id === 3 && resultados[2].valor === 30, "El tercer resultado deberia ser id 3, valor 30");\nvar vacio = await obtenerVarios([]);\nassert(Array.isArray(vacio) && vacio.length === 0, "Con un array vacio deberia devolver un array vacio");',
          experience: 30,
          coins: 15,
        }),
        codeExercise({
          title: { es: 'Promise.allSettled: tolerar fallos parciales', en: 'Promise.allSettled: tolerating partial failures' },
          description: {
            es: 'Espera a todas las promises sin que un solo fallo cancele el resto.',
            en: 'Wait for all promises without a single failure canceling the rest.',
          },
          blocksEs: [
            text(
              'A diferencia de Promise.all (que se rechaza entero ante el primer error), Promise.allSettled(arrayDePromises) SIEMPRE espera a que todas terminen, sin importar si se resolvieron o rechazaron. Devuelve un array de objetos { status: "fulfilled", value } o { status: "rejected", reason }, uno por cada promise, en el mismo orden. Es ideal cuando quieres el resultado de TODAS las operaciones, exitosas o no.',
            ),
            js(
              'const resultados = await Promise.allSettled([\n  Promise.resolve(1),\n  Promise.reject(new Error("fallo")),\n  Promise.resolve(3)\n]);\n\n// [\n//   { status: "fulfilled", value: 1 },\n//   { status: "rejected", reason: Error("fallo") },\n//   { status: "fulfilled", value: 3 }\n// ]',
            ),
            text(
              'Tarea: completa contarExitosos(promesas) (una función async que recibe un array de Promises ya creadas) para que use Promise.allSettled y devuelva la CANTIDAD de promises que terminaron con status "fulfilled".',
            ),
          ],
          blocksEn: [
            text(
              'Unlike Promise.all (which rejects entirely on the first error), Promise.allSettled(promisesArray) ALWAYS waits for all of them to finish, whether they resolved or rejected. It returns an array of { status: "fulfilled", value } or { status: "rejected", reason } objects, one per promise, in the same order. It is ideal when you want the result of ALL operations, successful or not.',
            ),
            js(
              'const results = await Promise.allSettled([\n  Promise.resolve(1),\n  Promise.reject(new Error("failure")),\n  Promise.resolve(3)\n]);\n\n// [\n//   { status: "fulfilled", value: 1 },\n//   { status: "rejected", reason: Error("failure") },\n//   { status: "fulfilled", value: 3 }\n// ]',
            ),
            text(
              'Task: complete contarExitosos(promesas) (an async function that receives an array of already-created Promises) so it uses Promise.allSettled and returns the COUNT of promises that finished with status "fulfilled".',
            ),
          ],
          starterCode: 'async function contarExitosos(promesas) {\n  // tu código aquí, usa Promise.allSettled\n}\n',
          assertions:
            'assert(typeof contarExitosos === "function", "Debes definir contarExitosos");\nvar promesasMezcladas = [Promise.resolve(1), Promise.reject(new Error("x")), Promise.resolve(3), Promise.reject(new Error("y"))];\nvar cantidad = await contarExitosos(promesasMezcladas);\nassert(cantidad === 2, "Deberian contarse 2 exitosas de las 4 (las 2 que rechazan no cuentan)");\nvar todasExitosas = await contarExitosos([Promise.resolve(1), Promise.resolve(2)]);\nassert(todasExitosas === 2, "Si todas resuelven, deberia contar 2");\nvar ninguna = await contarExitosos([]);\nassert(ninguna === 0, "Un array vacio deberia contar 0");',
          experience: 30,
          coins: 15,
        }),
        quizExercise({
          title: { es: 'Quiz: asincronía avanzada', en: 'Quiz: advanced asynchrony' },
          description: { es: 'Repasa Promise.all, allSettled y concurrencia.', en: 'Review Promise.all, allSettled and concurrency.' },
          questionsEs: [
            {
              question: '¿Qué pasa con Promise.all si UNA sola de las promises se rechaza?',
              options: [
                'Ignora esa promise y continúa con las demás',
                'Toda la Promise.all se rechaza inmediatamente con ese error, sin esperar al resto',
                'Espera indefinidamente',
                'Devuelve un array con un hueco en esa posición',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'Promise.all es "todo o nada": el primer rechazo hace que la Promise combinada se rechace de inmediato.',
            },
            {
              question: '¿En qué se diferencia Promise.allSettled de Promise.all?',
              options: [
                'Son exactamente iguales',
                'allSettled siempre espera a TODAS, informando éxito o fallo de cada una, sin rechazar todo por un solo error',
                'allSettled es más rápido siempre',
                'allSettled no puede usarse con await',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'allSettled nunca se "rechaza" por culpa de una promise individual: siempre resuelve con el detalle de cada resultado (fulfilled o rejected).',
            },
            {
              question: '¿Por qué usar .map() + Promise.all es más rápido que un bucle con await uno por uno?',
              options: [
                'No es más rápido, es exactamente igual',
                'Porque las promises se lanzan todas casi al mismo tiempo (en paralelo) en vez de esperar a que cada una termine antes de lanzar la siguiente',
                'Porque .map() usa múltiples hilos',
                'Porque evita usar async/await',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'Con map creas todas las promises de inmediato (arrancan en paralelo); awaitearlas una por una en un bucle forzaría a esperar cada una antes de iniciar la siguiente (secuencial, más lento).',
            },
            {
              question: '¿Qué forma tiene cada elemento del array que devuelve Promise.allSettled?',
              options: [
                'Solo el valor resuelto directamente',
                '{ status: "fulfilled"|"rejected", value o reason }',
                'Un booleano',
                'Siempre un Error',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'Cada resultado es un objeto con status y, según el caso, value (si fulfilled) o reason (si rejected).',
            },
          ],
          questionsEn: [
            {
              question: 'What happens with Promise.all if just ONE of the promises rejects?',
              options: [
                'It ignores that promise and continues with the rest',
                'The whole Promise.all rejects immediately with that error, without waiting for the rest',
                'It waits indefinitely',
                'It returns an array with a gap at that position',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'Promise.all is "all or nothing": the first rejection makes the combined Promise reject immediately.',
            },
            {
              question: 'How does Promise.allSettled differ from Promise.all?',
              options: [
                'They are exactly the same',
                'allSettled always waits for ALL of them, reporting success or failure for each, without rejecting everything over a single error',
                'allSettled is always faster',
                'allSettled cannot be used with await',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'allSettled never "rejects" because of an individual promise: it always resolves with the detail of each outcome (fulfilled or rejected).',
            },
            {
              question: 'Why is using .map() + Promise.all faster than a loop awaiting one by one?',
              options: [
                'It is not faster, it is exactly the same',
                'Because the promises are all launched almost at the same time (in parallel) instead of waiting for each one to finish before launching the next',
                'Because .map() uses multiple threads',
                'Because it avoids using async/await',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'With map you create all the promises immediately (they start in parallel); awaiting them one by one in a loop would force waiting for each before starting the next (sequential, slower).',
            },
            {
              question: 'What shape does each element of the array returned by Promise.allSettled have?',
              options: [
                'Just the resolved value directly',
                '{ status: "fulfilled"|"rejected", value or reason }',
                'A boolean',
                'Always an Error',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'Each result is an object with status and, depending on the case, value (if fulfilled) or reason (if rejected).',
            },
          ],
          experience: 30,
          coins: 15,
        }),
      ],
    },

    // ------------------------------------------------------------------
    // Lección 9 — Debugging, testing mental y proyecto final
    // ------------------------------------------------------------------
    {
      title: { es: 'Debugging, testing mental y proyecto final', en: 'Debugging, mental testing and final project' },
      description: {
        es: 'Piensa en casos de prueba como un tester, y construye un EventEmitter integrando todo el curso.',
        en: 'Think in test cases like a tester, and build an EventEmitter integrating the whole course.',
      },
      exercises: [
        codeExercise({
          title: { es: 'Encuentra y arregla el bug', en: 'Find and fix the bug' },
          description: {
            es: 'Piensa como un tester: identifica el caso límite que rompe el código.',
            en: 'Think like a tester: identify the edge case that breaks the code.',
          },
          blocksEs: [
            text(
              'Pensar "como tester" significa, antes de dar por buena una función, preguntarte: ¿qué pasa con el array vacío? ¿con un solo elemento? ¿con números negativos o cero? ¿con el valor más grande o más chico posible? La mayoría de los bugs viven en esos casos límite, no en el camino feliz. El código de abajo tiene un bug clásico de "off-by-one" (un error de límite en un bucle).',
            ),
            js(
              '// version con bug: no incluye el ultimo elemento\nfunction sumaHastaConBug(numeros) {\n  let total = 0;\n  for (let i = 0; i < numeros.length - 1; i++) { // <- bug: deberia ser i < numeros.length\n    total += numeros[i];\n  }\n  return total;\n}\n\nsumaHastaConBug([1, 2, 3]); // da 3 (1+2) en vez de 6 (1+2+3) — el ultimo elemento se pierde',
            ),
            text(
              'Tarea: completa sumaArreglada(numeros) con la MISMA idea (sumar todos los números de un array) pero SIN el bug de off-by-one: debe sumar TODOS los elementos, incluido el último.',
            ),
          ],
          blocksEn: [
            text(
              'Thinking "like a tester" means, before considering a function done, asking yourself: what happens with an empty array? with a single element? with negative numbers or zero? with the largest or smallest possible value? Most bugs live in those edge cases, not in the happy path. The code below has a classic "off-by-one" bug (a loop boundary error).',
            ),
            js(
              '// buggy version: does not include the last element\nfunction buggySumUpTo(numbers) {\n  let total = 0;\n  for (let i = 0; i < numbers.length - 1; i++) { // <- bug: should be i < numbers.length\n    total += numbers[i];\n  }\n  return total;\n}\n\nbuggySumUpTo([1, 2, 3]); // gives 3 (1+2) instead of 6 (1+2+3) — the last element is lost',
            ),
            text(
              'Task: complete sumaArreglada(numeros) with the SAME idea (sum all the numbers in an array) but WITHOUT the off-by-one bug: it must sum ALL elements, including the last one.',
            ),
          ],
          starterCode: 'function sumaArreglada(numeros) {\n  // tu código aquí, sin el bug de off-by-one\n}\n',
          assertions:
            'assert(typeof sumaArreglada === "function", "Debes definir sumaArreglada");\nassert(sumaArreglada([1, 2, 3]) === 6, "1+2+3 = 6 (incluyendo el ultimo elemento)");\nassert(sumaArreglada([10]) === 10, "Un solo elemento deberia sumar 10, no 0");\nassert(sumaArreglada([]) === 0, "Un array vacio deberia sumar 0");\nassert(sumaArreglada([-5, 5]) === 0, "Numeros negativos y positivos deberian sumar correctamente");',
          experience: 25,
          coins: 12,
        }),
        codeExercise({
          title: { es: 'Proyecto final: EventEmitter', en: 'Final project: EventEmitter' },
          description: {
            es: 'Construye tu propio sistema de eventos, integrando clases, closures y arrays.',
            en: 'Build your own event system, integrating classes, closures and arrays.',
          },
          blocksEs: [
            text(
              'Este es el proyecto final del curso Avanzado (y de toda la ruta de JavaScript): un EventEmitter, el patrón detrás de sistemas de eventos en Node.js, el DOM, y muchas librerías. Combina prácticamente todo lo visto: clases, closures (guardar listeners en una estructura interna), arrays/objetos, funciones de orden superior, y el patrón Observer (varios "oyentes" reaccionan a un mismo evento).',
            ),
            js(
              '// Idea general (no es la solucion, es la forma de pensarlo):\n// - internamente, guardar un objeto { nombreEvento: [listener1, listener2, ...] }\n// - on(evento, listener) agrega el listener a esa lista\n// - emit(evento, ...datos) recorre la lista de ese evento y llama a cada listener con esos datos\n// - off(evento, listener) quita un listener especifico de la lista',
            ),
            text(
              'Tarea: implementa la clase EventEmitter con: on(evento, listener) (registra un listener para ese evento), off(evento, listener) (elimina ese listener específico de ese evento), y emit(evento, ...datos) (llama a TODOS los listeners registrados para ese evento, pasándoles datos como argumentos; si el evento no tiene listeners, simplemente no hace nada).',
            ),
          ],
          blocksEn: [
            text(
              'This is the final project of the Advanced course (and of the whole JavaScript path): an EventEmitter, the pattern behind event systems in Node.js, the DOM, and many libraries. It combines pretty much everything covered: classes, closures (storing listeners in an internal structure), arrays/objects, higher-order functions, and the Observer pattern (several "listeners" react to the same event).',
            ),
            js(
              '// General idea (not the solution, just how to think about it):\n// - internally, store an object { eventName: [listener1, listener2, ...] }\n// - on(event, listener) adds the listener to that list\n// - emit(event, ...data) walks that event\'s list and calls each listener with that data\n// - off(event, listener) removes a specific listener from the list',
            ),
            text(
              'Task: implement the EventEmitter class with: on(evento, listener) (registers a listener for that event), off(evento, listener) (removes that specific listener from that event), and emit(evento, ...datos) (calls ALL listeners registered for that event, passing datos as arguments; if the event has no listeners, it simply does nothing).',
            ),
          ],
          starterCode:
            'class EventEmitter {\n  constructor() {\n    this.listeners = {};\n  }\n\n  // tu código aquí: on, off, emit\n}\n',
          assertions:
            'assert(typeof EventEmitter === "function", "Debes definir la clase EventEmitter");\nvar emitter = new EventEmitter();\nvar llamadas = [];\n\nfunction listenerA(dato) { llamadas.push("A:" + dato); }\nfunction listenerB(dato) { llamadas.push("B:" + dato); }\n\nemitter.on("saludo", listenerA);\nemitter.on("saludo", listenerB);\nemitter.emit("saludo", "hola");\nassert(llamadas.length === 2, "Ambos listeners deberian haberse llamado");\nassert(llamadas.includes("A:hola") && llamadas.includes("B:hola"), "Ambos listeners deberian recibir el dato hola");\n\nemitter.off("saludo", listenerA);\nllamadas = [];\nemitter.emit("saludo", "chau");\nassert(llamadas.length === 1 && llamadas[0] === "B:chau", "Tras off, solo listenerB deberia seguir activo");\n\nemitter.emit("eventoSinListeners", "x");\nassert(true, "emit sobre un evento sin listeners no deberia lanzar error");',
          experience: 50,
          coins: 25,
        }),
        quizExercise({
          title: { es: 'Quiz final: Avanzado', en: 'Final quiz: Advanced' },
          description: {
            es: 'Repaso integrador de todo el curso Avanzado, y de toda la ruta de JavaScript.',
            en: 'Integrative review of the whole Advanced course, and of the entire JavaScript path.',
          },
          questionsEs: [
            {
              question: '¿Por qué es importante probar casos límite como el array vacío o un solo elemento?',
              options: [
                'No es importante, solo importa el caso general',
                'Porque la mayoría de los bugs reales aparecen exactamente en esos bordes, no en el camino feliz',
                'Solo importa para funciones matemáticas',
                'JavaScript maneja automáticamente todos los casos límite',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'Los casos límite (vacío, uno solo, negativos, el máximo) son donde la lógica "casi correcta" suele romperse; probarlos explícitamente atrapa esos bugs antes de que lleguen a producción.',
            },
            {
              question: 'En el EventEmitter, ¿qué estructura de datos es natural usar para guardar los listeners de cada evento?',
              options: [
                'Un solo número',
                'Un objeto donde cada clave es el nombre del evento y el valor es un array de funciones listener',
                'Una sola función global',
                'Un string con todos los nombres concatenados',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'Cada evento puede tener múltiples listeners, así que un array por evento (indexado por nombre en un objeto) es la estructura natural.',
            },
            {
              question: '¿Qué patrón de diseño describe mejor a un EventEmitter (varios listeners reaccionando al mismo evento)?',
              options: ['Singleton', 'Observer', 'Factory', 'Ninguno, no es un patrón reconocido'],
              correct: [1],
              isMultiple: false,
              explanation: 'El patrón Observer es exactamente esto: uno o varios "observadores" (listeners) reaccionan cuando ocurre un evento en el "sujeto" (el emitter).',
            },
            {
              question: '¿Cuál de estas combinaciones resume mejor lo que integra el proyecto final del curso Avanzado?',
              options: [
                'Solo bucles for',
                'Clases (estructura), closures/arrays internos (estado), funciones de orden superior (listeners como callbacks), y el patrón Observer (diseño)',
                'Únicamente Promises',
                'Solo la sintaxis de switch',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'El EventEmitter es un resumen práctico de gran parte del curso: estructura con class, estado interno con arrays/objetos, callbacks como funciones de orden superior, y el patrón Observer como diseño general.',
            },
          ],
          questionsEn: [
            {
              question: 'Why is it important to test edge cases like an empty array or a single element?',
              options: [
                'It is not important, only the general case matters',
                'Because most real bugs show up exactly at those edges, not on the happy path',
                'It only matters for mathematical functions',
                'JavaScript automatically handles all edge cases',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'Edge cases (empty, single, negative, the maximum) are where "almost correct" logic tends to break; testing them explicitly catches those bugs before they reach production.',
            },
            {
              question: "In the EventEmitter, what data structure is natural to use to store each event's listeners?",
              options: [
                'A single number',
                'An object where each key is the event name and the value is an array of listener functions',
                'A single global function',
                'A string with all the names concatenated',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'Each event can have multiple listeners, so an array per event (indexed by name in an object) is the natural structure.',
            },
            {
              question: 'Which design pattern best describes an EventEmitter (several listeners reacting to the same event)?',
              options: ['Singleton', 'Observer', 'Factory', 'None, it is not a recognized pattern'],
              correct: [1],
              isMultiple: false,
              explanation: 'The Observer pattern is exactly this: one or more "observers" (listeners) react when an event occurs on the "subject" (the emitter).',
            },
            {
              question: "Which of these combinations best summarizes what the Advanced course's final project integrates?",
              options: [
                'Only for loops',
                'Classes (structure), internal closures/arrays (state), higher-order functions (listeners as callbacks), and the Observer pattern (design)',
                'Only Promises',
                'Only switch syntax',
              ],
              correct: [1],
              isMultiple: false,
              explanation: 'The EventEmitter is a practical summary of much of the course: structure with class, internal state with arrays/objects, callbacks as higher-order functions, and the Observer pattern as overall design.',
            },
          ],
          experience: 40,
          coins: 20,
        }),
      ],
    },
  ],
};

const courses: CourseSeed[] = [course1, course2, course3];

// ---------------------------------------------------------------------------
// Motor de siembra
// ---------------------------------------------------------------------------

export async function seedJsCourse(prisma: PrismaClient) {
  console.log('Seed JS Course...');

  const languages = await prisma.language.findMany({
    where: { code: { in: ['es', 'en'] } },
  });

  const esLang = languages.find((l) => l.code === 'es');
  const enLang = languages.find((l) => l.code === 'en');

  if (!esLang || !enLang) {
    throw new Error(
      'Faltan los idiomas es/en en la BD. Corre el seed principal (languages) antes de seedJsCourse.',
    );
  }

  let jsModule = await prisma.module.findFirst({
    where: {
      translations: { some: { title: 'JavaScript', languageId: esLang.id } },
    },
  });

  if (!jsModule) {
    jsModule = await prisma.module.create({
      data: {
        translations: {
          create: [
            {
              languageId: esLang.id,
              title: 'JavaScript',
              description:
                'Ruta completa de JavaScript: de los fundamentos al dominio avanzado.',
            },
            {
              languageId: enLang.id,
              title: 'JavaScript',
              description:
                'Complete JavaScript path: from fundamentals to advanced mastery.',
            },
          ],
        },
      },
    });
    console.log('  Módulo "JavaScript" creado.');
  }

  for (const courseSeed of courses) {
    let course = await prisma.course.findFirst({
      where: {
        moduleId: jsModule.id,
        translations: { some: { title: courseSeed.title.es, languageId: esLang.id } },
      },
    });

    if (!course) {
      course = await prisma.course.create({
        data: {
          moduleId: jsModule.id,
          difficulty: courseSeed.difficulty,
          translations: {
            create: [
              {
                languageId: esLang.id,
                title: courseSeed.title.es,
                description: courseSeed.description.es,
              },
              {
                languageId: enLang.id,
                title: courseSeed.title.en,
                description: courseSeed.description.en,
              },
            ],
          },
        },
      });
      console.log(`  Curso creado: ${courseSeed.title.es}`);
    } else {
      console.log(`  Curso ya existía, se reutiliza: ${courseSeed.title.es}`);
    }

    for (const [lessonIndex, lessonSeed] of courseSeed.lessons.entries()) {
      const order = lessonIndex + 1;

      let lesson = await prisma.lesson.findFirst({
        where: { courseId: course.id, order },
      });

      if (!lesson) {
        lesson = await prisma.lesson.create({
          data: {
            courseId: course.id,
            order,
            type: 'CODE',
            translations: {
              create: [
                {
                  languageId: esLang.id,
                  title: lessonSeed.title.es,
                  description: lessonSeed.description.es,
                },
                {
                  languageId: enLang.id,
                  title: lessonSeed.title.en,
                  description: lessonSeed.description.en,
                },
              ],
            },
          },
        });
      }

      for (const [exIndex, exSeed] of lessonSeed.exercises.entries()) {
        const exOrder = exIndex + 1;

        const existingExercise = await prisma.exercise.findFirst({
          where: { lessonId: lesson.id, order: exOrder },
        });

        const scalarData =
          exSeed.kind === 'CODE'
            ? {
                type: ExerciseType.CODE,
                experience: exSeed.experience ?? 15,
                coins: exSeed.coins ?? 8,
                codes: [
                  {
                    language: 'javascript',
                    initialCode: exSeed.starterCode,
                    expectedCode: exSeed.assertions,
                  },
                ] as unknown as Prisma.InputJsonValue,
              }
            : {
                type: ExerciseType.QUIZ,
                experience: exSeed.experience ?? 20,
                coins: exSeed.coins ?? 10,
                codes: Prisma.JsonNull,
              };

        const translationsData =
          exSeed.kind === 'CODE'
            ? [
                {
                  languageId: esLang.id,
                  title: exSeed.title.es,
                  description: exSeed.description.es,
                  content: {
                    instructionElements: exSeed.blocksEs,
                  } as unknown as Prisma.InputJsonValue,
                },
                {
                  languageId: enLang.id,
                  title: exSeed.title.en,
                  description: exSeed.description.en,
                  content: {
                    instructionElements: exSeed.blocksEn,
                  } as unknown as Prisma.InputJsonValue,
                },
              ]
            : [
                {
                  languageId: esLang.id,
                  title: exSeed.title.es,
                  description: exSeed.description.es,
                  content: {
                    questions: exSeed.questionsEs,
                  } as unknown as Prisma.InputJsonValue,
                },
                {
                  languageId: enLang.id,
                  title: exSeed.title.en,
                  description: exSeed.description.en,
                  content: {
                    questions: exSeed.questionsEn,
                  } as unknown as Prisma.InputJsonValue,
                },
              ];

        if (existingExercise) {
          await prisma.exercise.update({
            where: { id: existingExercise.id },
            data: scalarData,
          });
          await prisma.exerciseTranslation.deleteMany({
            where: { exerciseId: existingExercise.id },
          });
          await prisma.exerciseTranslation.createMany({
            data: translationsData.map((t) => ({
              exerciseId: existingExercise.id,
              ...t,
            })),
          });
        } else {
          await prisma.exercise.create({
            data: {
              lessonId: lesson.id,
              order: exOrder,
              ...scalarData,
              translations: { create: translationsData },
            },
          });
        }
      }
    }

    console.log(
      `  Curso listo: ${courseSeed.title.es} (${courseSeed.lessons.length} lecciones)`,
    );
  }

  console.log('Seed JS Course completado.');
}
