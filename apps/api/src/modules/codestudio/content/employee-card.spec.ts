import { cardStats, employeeName, genderOf, resolveSkin } from './employee-card';

const npc = (key: string, kind: string, gender: string | null) => ({ key, kind, gender, spriteSheetUrl: `https://x/${key}.png`, frameWidth: 128, frameHeight: 224 });

describe('empleados como cartas', () => {
  it('el nombre corresponde al género', () => {
    const name = employeeName('FEMALE', () => 0);
    expect(genderOf({ name, metadata: null })).toBe('FEMALE');
    expect(genderOf({ name: 'Nico Byte', metadata: null })).toBe('MALE');
    expect(genderOf({ name: 'Nico Byte', metadata: { gender: 'FEMALE' } })).toBe('FEMALE');
  });

  it('usa la skin guardada; si no, una del admin de su género; si no hay, el mayordomo', () => {
    const butler = npc('butler-main', 'BUTLER', null);
    const woman = npc('dev-mujer', 'EMPLOYEE', 'FEMALE');
    const man = npc('dev-hombre', 'EMPLOYEE', 'MALE');
    const emp = { id: 'e1', name: 'Luna Byte', avatar: 'avatar-frontend', metadata: { gender: 'FEMALE' } };
    // El mayordomo nunca se usa para empleados.
    expect(resolveSkin(emp, [butler])).toBeNull();
    expect(resolveSkin(emp, [butler, woman, man])?.key).toBe('dev-mujer');
    expect(resolveSkin({ ...emp, avatar: 'dev-hombre' }, [butler, woman, man])?.key).toBe('dev-hombre');
  });

  it('las estadísticas van de 0 a 99 y una Estrella supera a alguien Lento', () => {
    const base = { speed: 1, quality: 1, creativity: 1, productivity: 1, motivation: 80, level: 1, hiredAt: new Date() };
    const star = cardStats({ ...base, id: 'a', metadata: { trait: 'star' } });
    const slow = cardStats({ ...base, id: 'b', metadata: { trait: 'slow' } });
    for (const value of Object.values(star)) expect(value).toBeLessThanOrEqual(99);
    expect(star.vel).toBeGreaterThan(slow.vel);
    expect(star.overall).toBeGreaterThan(slow.overall);
  });
});
