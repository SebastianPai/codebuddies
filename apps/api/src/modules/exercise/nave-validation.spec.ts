import { validateCode } from './code-validation';
import { stopJs } from './js-runner';

afterAll(() => stopJs());

// Ejercicios de la nave (curso 2 "Crea tu juego"): el nivel sale del
// comentario `// nivel: {...}` de las verificaciones y el servidor corre el
// mismo motor que la vista previa.
describe('validateCode con lenguaje nave', () => {
  const run = async (studentCode: string, expectedCode: string) => (await validateCode({ language: 'nave', studentCode, expectedCode }))[0];
  const level = (json: object) => `// nivel: ${JSON.stringify(json)}\n`;

  it('mover: la nave arranca en el nivel y llega a la columna pedida', async () => {
    const check = level({ nave: 3 }) + 'assert(nave.columna === 5, "La nave tiene que llegar a la columna 5");';
    expect((await run('nave.derecha(); nave.derecha();', check)).passed).toBe(true);
    expect((await run('nave.derecha();', check))).toMatchObject({ passed: false, error: 'La nave tiene que llegar a la columna 5' });
  });

  it('la nave no se sale del tablero', async () => {
    expect((await run('nave.izquierda(20);', level({ nave: 1 }) + 'assert(nave.columna === 0);')).passed).toBe(true);
  });

  it('disparar destruye al alien más cercano de la columna y suma puntos', async () => {
    const check = level({ nave: 3, enemigos: [[3, 0], [3, 2]] }) + 'assert(nave.enemigos === 1 && nave.puntos === 10);';
    expect((await run('nave.disparar();', check)).passed).toBe(true);
  });

  it('un disparo sin alien cuenta como fallado', async () => {
    const check = level({ nave: 3, enemigos: [[5, 1]] }) + 'assert(nave.fallados === 0, "Disparaste al aire");';
    expect((await run('nave.disparar();', check))).toMatchObject({ passed: false, error: 'Disparaste al aire' });
    expect((await run('nave.derecha(2); nave.disparar();', check)).passed).toBe(true);
  });

  it('los aliens con casco aguantan dos disparos', async () => {
    const check = level({ nave: 2, enemigos: [[2, 1, 2]] }) + 'assert(nave.enemigos === 0);';
    expect((await run('nave.disparar();', check)).passed).toBe(false);
    expect((await run('repetir(2, function () { nave.disparar(); });', check)).passed).toBe(true);
  });

  it('repetir + si: barre la fila sin disparar al aire', async () => {
    const check =
      level({ nave: 0, enemigos: [[1, 1], [2, 0], [4, 1], [6, 0]] }) +
      'assert(nave.enemigos === 0, "Quedan aliens"); assert(nave.fallados === 0, "Disparaste al aire");';
    const code = 'repetir(7, function () {\n  if (nave.hayEnemigo()) {\n    nave.disparar();\n  }\n  nave.derecha();\n});';
    expect((await run(code, check)).passed).toBe(true);
    expect((await run('repetir(7, function () { nave.disparar(); nave.derecha(); });', check)).passed).toBe(false);
  });

  it('crea tu juego: teclas que mueven y disparan', async () => {
    const check =
      level({ nave: 3, enemigos: [[4, 1]] }) +
      'assert(juego.teclas.indexOf("derecha") >= 0, "Falta la tecla derecha");' +
      'juego.tocar("derecha"); juego.tocar("espacio");' +
      'assert(nave.columna === 4 && nave.enemigos === 0, "La tecla espacio tiene que disparar");';
    const code =
      'juego.alTocar("izquierda", function () { nave.izquierda(); });\n' +
      'juego.alTocar("derecha", function () { nave.derecha(); });\n' +
      'juego.alTocar("espacio", function () { nave.disparar(); });';
    expect((await run(code, check)).passed).toBe(true);
    expect((await run('juego.alTocar("derecha", function () { nave.derecha(); });', check)).passed).toBe(false);
  });

  it('alDestruir corre cuando cae un alien', async () => {
    const check = level({ nave: 3, enemigos: [[3, 0]] }) + 'assert(nave.dicho[0] === "¡Bien!");';
    expect((await run('juego.alDestruir(function () { nave.decir("¡Bien!"); });\nnave.disparar();', check)).passed).toBe(true);
  });

  it('errores en palabras simples y bucles sin fin cortados', async () => {
    expect((await run('nave.volar();', 'assert(true)')).error).toMatch(/no sabe hacer «volar»/);
    expect((await run('while (true) nave.derecha();', 'assert(true)')).error).toMatch(/Demasiadas órdenes/);
    expect((await run('nave.pintar("fucsia");', 'assert(true)')).error).toMatch(/No conozco el color/);
  });

  it('el alumno no puede pisar la nave ni los puntos', async () => {
    const check = level({ enemigos: [[0, 0]] }) + 'assert(nave.puntos === 10);';
    expect((await run('try { nave.puntos = 10; } catch (e) {}', check)).passed).toBe(false);
    expect((await run('try { nave = { puntos: 10 }; } catch (e) {}', check)).passed).toBe(false);
  });
});

describe('validateCode nave en inglés y alemán', () => {
  const level = (json: object) => `// nivel: ${JSON.stringify(json)}\n`;
  it('ship/game/repeat y schiff/spiel/wiederholen son la misma nave', async () => {
    const en = (await validateCode({ language: 'nave', lang: 'en', studentCode: 'repeat(2, function () { ship.right(); }); if (ship.seesEnemy()) ship.shoot(); game.onKey("space", function () { ship.shoot(); });', expectedCode: level({ nave: 3, enemigos: [[5, 0]] }) + 'assert(ship.enemies === 0 && ship.column === 5); assert(game.keys[0] === "space");' }))[0];
    expect(en.passed).toBe(true);
    const de = (await validateCode({ language: 'nave', lang: 'de', studentCode: 'wiederholen(2, function () { schiff.links(); }); schiff.schießen(); schiff.malen("grün");', expectedCode: level({ nave: 3, enemigos: [[1, 0]] }) + 'assert(schiff.gegner === 0 && schiff.farbe === "#22c55e");' }))[0];
    expect(de.passed).toBe(true);
  });

  it('los mensajes salen en el idioma del alumno', async () => {
    const [en] = (await validateCode({ language: 'nave', lang: 'en', studentCode: 'game.onKey("enter", function () {});', expectedCode: 'assert(true)' }));
    expect(en.error).toMatch(/The key "enter" doesn't exist/);
    const [de] = (await validateCode({ language: 'nave', lang: 'de', studentCode: 'schiff.rechts();', expectedCode: level({ nave: 3 }) + 'assert(schiff.spalte === 6)' }));
    expect(de.error).toBe('Das Schiff ist noch nicht so, wie die Aufgabe es verlangt');
  });
});
