import { compareCss, compareHtml, looksLikeAssertions, normalizeText, parseHtml, validateCode } from './code-validation';

// QA de la validación de ejercicios de código. El primer bloque reproduce el
// ejercicio real de producción ("Tu primer elemento HTML") que fallaba con
// "Unexpected token '<'" aunque el alumno escribiera bien la respuesta.

const firstHtmlExercise = { language: 'html', expectedCode: '<h1>Hello, CodeBuddies!</h1>' };
const passes = (studentCode: string, extra: Partial<Parameters<typeof validateCode>[0]> = {}) =>
  validateCode({ ...firstHtmlExercise, studentCode, ...extra }).every((result) => result.passed);
const firstError = (studentCode: string, lang = 'es', exercise = firstHtmlExercise) =>
  validateCode({ ...exercise, studentCode, lang }).find((result) => !result.passed)?.error;

describe('Ejercicio real: <h1>Hello, CodeBuddies!</h1>', () => {
  it.each([
    '<h1>Hello, CodeBuddies!</h1>',
    '<h1>hello codebuddies</h1>',
    '  <h1>  Hello,   CodeBuddies!  </h1>\n',
    '<H1>Hello, CodeBuddies!</H1>',
    '<h1 class="title">Hello, CodeBuddies!</h1>',
    '<!DOCTYPE html><html><body><h1>Hello, CodeBuddies!</h1></body></html>',
    '<h1>Hello, CodeBuddies</h1>',
  ])('acepta %p', (code) => {
    expect(passes(code)).toBe(true);
  });

  it('nunca vuelve a mostrar "Unexpected token"', () => {
    for (const code of ['<h1>Hello, CodeBuddies!</h1>', '<h1>Hola</h1>', 'hola', '']) {
      const error = firstError(code) ?? '';
      expect(error).not.toMatch(/Unexpected token/);
    }
  });

  it('rechaza con un mensaje claro cuando falta el <h1>', () => {
    expect(passes('<p>Hello, CodeBuddies!</p>')).toBe(false);
    expect(firstError('<p>Hello, CodeBuddies!</p>')).toBe('Falta el elemento <h1>.');
    expect(firstError('<p>Hello, CodeBuddies!</p>', 'en')).toBe('The <h1> element is missing.');
    expect(firstError('<p>Hello, CodeBuddies!</p>', 'de')).toBe('Das Element <h1> fehlt.');
  });

  it('rechaza si el texto es otro y dice cuál debe ser', () => {
    expect(passes('<h1>Hola CodeBuddies</h1>')).toBe(false);
    expect(firstError('<h1>Hola CodeBuddies</h1>')).toContain('«Hello, CodeBuddies!»');
  });

  it('rechaza el <h1> vacío o sin cerrar', () => {
    expect(firstError('<h1></h1>')).toContain('está vacío');
    expect(firstError('<h1>Hello, CodeBuddies!')).toContain('</h1>');
  });

  it('pide código si el editor está vacío', () => {
    expect(firstError('   ')).toBe('Escribe tu código en el editor.');
  });
});

describe('HTML en general', () => {
  it('compara varios elementos en orden y respeta repeticiones', () => {
    const expected = '<ul><li>Uno</li><li>Dos</li></ul>';
    expect(compareHtml('<ul><li>uno</li><li>dos</li></ul>', expected, 'es')[0].passed).toBe(true);
    expect(compareHtml('<ul><li>uno</li></ul>', expected, 'es')[0].error).toBe('Falta el elemento <li>.');
  });

  it('ignora comentarios, scripts, estilos y etiquetas vacías como <br>', () => {
    const parsed = parseHtml('<!-- x --><style>h1{}</style><h1>Hi<br>there</h1><script>alert(1)</script>');
    expect(parsed.nodes.map((node) => node.tag)).toEqual(['h1', 'br']);
    expect(parsed.unclosed).toEqual([]);
  });

  it('normaliza tildes, mayúsculas y signos', () => {
    expect(normalizeText('¡Hola, Él!')).toBe('hola el');
  });
});

describe('CSS', () => {
  const expected = 'h1 { color: red; font-size: 24px; }';
  it('acepta las mismas reglas aunque cambie el formato o el orden', () => {
    expect(compareCss('h1{font-size:24px;color:RED}', expected, 'es')[0].passed).toBe(true);
  });
  it('dice qué propiedad falta o tiene otro valor', () => {
    expect(compareCss('h1 { color: red; }', expected, 'es')[0].error).toContain('font-size');
    expect(compareCss('h1 { color: blue; font-size: 24px }', expected, 'es')[0].error).toContain('«red»');
  });
  it('se usa desde validateCode', () => {
    expect(validateCode({ language: 'css', expectedCode: expected, studentCode: 'h1{color:red;font-size:24px}' })[0].passed).toBe(true);
  });
});

describe('JavaScript', () => {
  it('con verificaciones assert(): las corre como antes', () => {
    const exercise = { language: 'js', expectedCode: 'assert(sumar(2, 3) === 5, "sumar debe devolver 5");' };
    expect(looksLikeAssertions(exercise.expectedCode)).toBe(true);
    expect(validateCode({ ...exercise, studentCode: 'function sumar(a, b) { return a + b; }' })[0].passed).toBe(true);
    expect(validateCode({ ...exercise, studentCode: 'function sumar(a, b) { return a - b; }' })[0].error).toBe('sumar debe devolver 5');
  });

  it('con respuesta modelo: compara lo que imprime la consola', () => {
    const exercise = { language: 'js', expectedCode: 'console.log("Hola mundo")' };
    expect(validateCode({ ...exercise, studentCode: 'const saludo = "Hola mundo"; console.log(saludo);' })[0].passed).toBe(true);
    expect(validateCode({ ...exercise, studentCode: 'console.log("Chao")', lang: 'es' })[0].error).toContain('«Hola mundo»');
  });

  it('el código del alumno no puede tocar Node (require/process)', () => {
    const exercise = { language: 'js', expectedCode: 'console.log(1)' };
    const result = validateCode({ ...exercise, studentCode: 'require("fs")' })[0];
    expect(result.passed).toBe(false);
  });

  it('un bucle infinito se corta por timeout', () => {
    const result = validateCode({ language: 'js', expectedCode: 'console.log(1)', studentCode: 'while(true){}' })[0];
    expect(result.passed).toBe(false);
  });

  it('con tests nombrados sigue funcionando', () => {
    const result = validateCode({
      language: 'js',
      studentCode: 'const x = 2;',
      tests: [{ description: 'x vale 2', assertCode: 'x === 2' }],
    });
    expect(result).toEqual([{ description: 'x vale 2', passed: true }]);
  });

  it('sin código esperado acepta cualquier código no vacío', () => {
    expect(validateCode({ language: 'js', studentCode: 'let a = 1' })[0].passed).toBe(true);
    expect(validateCode({ language: 'js', studentCode: '  ' })[0].passed).toBe(false);
  });
});

describe('HTML con verificaciones de DOM (assert)', () => {
  it('no las ejecuta como JS en el servidor (no hay página): exige código', () => {
    const exercise = { language: 'html', expectedCode: 'assert(document.querySelector("h1"), "falta h1")' };
    expect(validateCode({ ...exercise, studentCode: '<h1>x</h1>' })[0].passed).toBe(true);
    expect(validateCode({ ...exercise, studentCode: '' })[0].passed).toBe(false);
  });
});
