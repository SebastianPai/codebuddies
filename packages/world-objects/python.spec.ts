import { PYTHON_SUSPICIOUS, parsePythonChecks, pythonFriendlyError, pythonResultMessage } from './python';

describe('python: errores en palabras simples', () => {
  it('explica los errores más comunes', () => {
    expect(pythonFriendlyError('NameError', "name 'Print' is not defined")).toContain('minúscula');
    expect(pythonFriendlyError('NameError', "name 'nombre' is not defined")).toContain('«nombre»');
    expect(pythonFriendlyError('SyntaxError', "'(' was never closed")).toContain('paréntesis');
    expect(pythonFriendlyError('SyntaxError', 'unterminated string literal (detected at line 1)')).toContain('comillas');
    expect(pythonFriendlyError('IndentationError', "expected an indented block after 'if' statement on line 1")).toContain('sangría');
    expect(pythonFriendlyError('TypeError', 'can only concatenate str (not "int") to str')).toContain('str(');
    expect(pythonFriendlyError('ValueError', "invalid literal for int() with base 10: 'hola'")).toContain('«hola»');
    expect(pythonFriendlyError('KeyError', "'edad'")).toContain('«edad»');
    expect(pythonFriendlyError('ZeroDivisionError', 'division by zero')).toContain('cero');
  });
  it('una regla del curso (código bloqueado) se muestra tal cual, sin prefijo', () => {
    expect(pythonFriendlyError('Regla', '__cb_regla:clases')).toBe('En este curso no se usan clases (class).');
    expect(pythonFriendlyError('Regla', '__cb_regla:nombre:eval', 'en')).toBe('This course doesn’t use “eval”.'.replace('’', "'"));
    expect(pythonResultMessage({ ok: false, salida: '', tipo: 'ZeroDivisionError', mensaje: 'division by zero', linea: 2 }, 'de')).toBe('Zeile 2: Man kann nicht durch null teilen.');
    expect(pythonResultMessage({ ok: true, salida: '', paso: false, motivo: '' }, 'en')).toBe("That's not what the exercise asks for yet.");
  });
  it('un error desconocido se muestra tal cual', () => {
    expect(pythonFriendlyError('RareError', 'algo raro')).toBe('RareError: algo raro');
  });
  it('arma el mensaje con la línea', () => {
    expect(pythonResultMessage({ ok: false, salida: '', tipo: 'NameError', mensaje: "name 'x' is not defined", linea: 3 })).toMatch(/^Línea 3: /);
    expect(pythonResultMessage({ ok: true, salida: 'hola', paso: true })).toBeNull();
    expect(pythonResultMessage({ ok: true, salida: '', paso: false, motivo: 'Saluda' })).toBe('Saluda');
  });
});

describe('python: formato de las pruebas', () => {
  it('lee los datos de input()', () => {
    expect(parsePythonChecks('# entradas: ["Ana", 12]\nassert True').entradas).toEqual(['Ana', '12']);
    expect(parsePythonChecks('assert True').entradas).toEqual([]);
    expect(parsePythonChecks('# entradas: [roto\nassert True').entradas).toEqual([]);
  });
});

describe('python: código sospechoso', () => {
  it('detecta intentos de tocar el interior de Python', () => {
    for (const c of ['input.__globals__', 'import sys', 'from os import path', 'getattr(x, "y")', 'eval("1")', 'import builtins']) {
      expect(PYTHON_SUSPICIOUS.test(c)).toBe(true);
    }
  });
  it('deja pasar el código normal del curso', () => {
    for (const c of ['print("Hola")', 'import random\nprint(random.randint(1, 6))', 'import math\nprint(math.sqrt(9))', 'nombre = input("Nombre: ")', 'def sumar(a, b):\n    return a + b']) {
      expect(PYTHON_SUSPICIOUS.test(c)).toBe(false);
    }
  });
});
