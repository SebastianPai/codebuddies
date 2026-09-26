import { TV_BEHAVIOR } from './examples';
import { resolveTrigger } from './machine';
import { validateBehavior } from './behavior';
import { applyLockedStates, lockedStatesFor, upgradeableStates } from './upgrades';

describe('mejoras desbloqueables', () => {
  const encendido = { id: 'u-on', unlockStates: ['ON'] };

  it('ofrece como mejora todos los estados menos el inicial', () => {
    expect(upgradeableStates(TV_BEHAVIOR)).toEqual(['ON']);
  });

  it('sin la mejora, la TV no puede encenderse', () => {
    const locked = lockedStatesFor([encendido], new Set());
    expect(locked).toEqual(['ON']);
    const effective = applyLockedStates(TV_BEHAVIOR, locked);
    expect(resolveTrigger(effective, 'OFF', 'CLICK')).toBeNull();
    expect(resolveTrigger(TV_BEHAVIOR, 'OFF', 'CLICK')).not.toBeNull();
  });

  it('con la mejora comprada funciona igual que el behavior completo', () => {
    const locked = lockedStatesFor([encendido], new Set(['u-on']));
    expect(locked).toEqual([]);
    expect(applyLockedStates(TV_BEHAVIOR, locked)).toBe(TV_BEHAVIOR);
  });

  it('el behavior efectivo sigue siendo válido', () => {
    const effective = applyLockedStates(TV_BEHAVIOR, ['ON']);
    expect(validateBehavior(effective).ok).toBe(true);
  });

  it('nunca bloquea el estado inicial', () => {
    expect(applyLockedStates(TV_BEHAVIOR, ['OFF'])).toBe(TV_BEHAVIOR);
  });

  it('un estado que desbloquean dos mejoras queda libre con cualquiera', () => {
    const a = { id: 'a', unlockStates: ['ON'] };
    const b = { id: 'b', unlockStates: ['ON'] };
    expect(lockedStatesFor([a, b], new Set(['b']))).toEqual([]);
  });
});
