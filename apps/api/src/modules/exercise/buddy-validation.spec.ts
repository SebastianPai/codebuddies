import { validateCode } from './code-validation';

// Ejercicios de Buddy (cursos para niños): el servidor corre el mismo motor
// que la vista previa y revisa el estado final con assert().
describe('validateCode con lenguaje buddy', () => {
  const laugh = 'assert(buddy.animo === "riendo", "Buddy todavía no se ríe a carcajadas")';

  it('aprueba cuando Buddy termina como pide el ejercicio', () => {
    const [result] = validateCode({ language: 'buddy', studentCode: 'for (let i = 0; i < 3; i++) buddy.contarChiste();', expectedCode: laugh });
    expect(result.passed).toBe(true);
  });

  it('rechaza con el mensaje del ejercicio si no llega', () => {
    const [result] = validateCode({ language: 'buddy', studentCode: 'buddy.contarChiste();', expectedCode: laugh });
    expect(result.passed).toBe(false);
    expect(result.error).toBe('Buddy todavía no se ríe a carcajadas');
  });

  it('Buddy dormido no hace caso hasta que lo despiertan', () => {
    const asleep = validateCode({ language: 'buddy', studentCode: 'buddy.dormir(); buddy.decir("hola");', expectedCode: 'assert(buddy.dicho.length === 1)' });
    expect(asleep[0].passed).toBe(false);
    const awake = validateCode({ language: 'buddy', studentCode: 'buddy.dormir(); buddy.despertar(); buddy.decir("hola");', expectedCode: 'assert(buddy.dicho[0] === "hola")' });
    expect(awake[0].passed).toBe(true);
  });

  it('console.log también hace hablar a Buddy', () => {
    const [result] = validateCode({ language: 'buddy', studentCode: 'console.log("Hola", "mundo")', expectedCode: 'assert(buddy.dicho[0] === "Hola mundo")' });
    expect(result.passed).toBe(true);
  });

  it('un bucle infinito de órdenes se corta con un mensaje claro', () => {
    const [result] = validateCode({ language: 'buddy', studentCode: 'while (true) buddy.saltar();', expectedCode: 'assert(true)' });
    expect(result.passed).toBe(false);
    expect(result.error).toMatch(/demasiadas órdenes/);
  });

  it('el alumno no puede pisar el estado de Buddy', () => {
    const [result] = validateCode({ language: 'buddy', studentCode: 'try { buddy.animo = "riendo"; } catch (e) {}', expectedCode: laugh });
    expect(result.passed).toBe(false);
  });
});

describe('validateCode buddy: sin atajos', () => {
  it('no se puede cambiar el estado interno ni reemplazar a Buddy', () => {
    const laugh = 'assert(buddy.animo === "riendo")';
    for (const cheat of ['try { __buddyState.animo = "riendo"; } catch (e) {}', 'try { buddy = { animo: "riendo" }; } catch (e) {}']) {
      expect(validateCode({ language: 'buddy', studentCode: cheat, expectedCode: laugh })[0].passed).toBe(false);
    }
  });
});
