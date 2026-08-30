import {
  PET_ACTIONS,
  PET_MAX_DECAY_HOURS,
} from './pet.constants';
import {
  PetCooldownError,
  PetState,
  actionCooldownRemaining,
  applyAction,
  applyDecay,
  deriveMood,
} from './pet.logic';

const T0 = new Date('2026-08-30T12:00:00.000Z');
const hoursLater = (h: number) => new Date(T0.getTime() + h * 3_600_000);

function makePet(overrides: Partial<PetState> = {}): PetState {
  return {
    hunger: 80,
    thirst: 80,
    happiness: 80,
    energy: 80,
    health: 100,
    sick: false,
    lastTickAt: T0,
    lastFedAt: T0,
    lastWateredAt: T0,
    lastPlayedAt: T0,
    ...overrides,
  };
}

describe('applyDecay', () => {
  it('does nothing when no time has passed', () => {
    const pet = makePet();
    expect(applyDecay(pet, T0)).toBe(pet);
  });

  it('ignores a clock that went backwards', () => {
    const pet = makePet({ lastTickAt: hoursLater(5) });
    expect(applyDecay(pet, T0)).toBe(pet);
  });

  it('decays each stat at its hourly rate', () => {
    const pet = applyDecay(makePet(), hoursLater(1));
    expect(pet.hunger).toBe(72); // 80 - 8
    expect(pet.thirst).toBe(70); // 80 - 10
    expect(pet.happiness).toBe(76); // 80 - 4
    expect(pet.energy).toBe(74); // 80 - 6
    expect(pet.lastTickAt).toEqual(hoursLater(1));
  });

  it('never drops a stat below 0', () => {
    const pet = applyDecay(makePet({ hunger: 5, thirst: 2 }), hoursLater(10));
    expect(pet.hunger).toBe(0);
    expect(pet.thirst).toBe(0);
    expect(pet.hunger).toBeGreaterThanOrEqual(0);
  });

  it('caps processing at PET_MAX_DECAY_HOURS (no instant death after a long absence)', () => {
    const short = applyDecay(makePet(), hoursLater(PET_MAX_DECAY_HOURS));
    const long = applyDecay(makePet(), hoursLater(PET_MAX_DECAY_HOURS + 500));
    expect(long.hunger).toBe(short.hunger);
    expect(long.health).toBe(short.health);
  });

  it('recovers energy while sleeping instead of draining it', () => {
    const pet = applyDecay(makePet({ energy: 10 }), hoursLater(2));
    expect(pet.energy).toBeGreaterThan(10);
  });

  it('neglect drives health down and turns the pet sick', () => {
    const pet = applyDecay(
      makePet({ hunger: 10, thirst: 10, health: 100 }),
      hoursLater(12),
    );
    expect(pet.health).toBeLessThan(100);
    expect(pet.sick).toBe(true);
  });

  it('good care lets health recover and clears sickness', () => {
    // 3h: hunger 100->76, thirst 100->70, ambos siguen > 50 => salud sube.
    const pet = applyDecay(
      makePet({ hunger: 100, thirst: 100, health: 50, sick: true }),
      hoursLater(3),
    );
    expect(pet.health).toBeGreaterThan(50);
    expect(pet.sick).toBe(false);
  });
});

describe('deriveMood', () => {
  const base = { hunger: 80, thirst: 80, happiness: 80, energy: 80, health: 100 };

  it('sick wins over everything', () => {
    expect(deriveMood({ ...base, sick: true, energy: 5, happiness: 0 })).toBe('SICK');
  });
  it('sleeping when energy is very low', () => {
    expect(deriveMood({ ...base, sick: false, energy: 10 })).toBe('SLEEPING');
  });
  it('sad when a core need is low', () => {
    expect(deriveMood({ ...base, sick: false, hunger: 10 })).toBe('SAD');
  });
  it('happy when everything is high', () => {
    expect(deriveMood({ ...base, sick: false })).toBe('HAPPY');
  });
  it('content in between', () => {
    expect(
      deriveMood({ ...base, sick: false, happiness: 50, hunger: 55, thirst: 55 }),
    ).toBe('CONTENT');
  });
});

describe('applyAction', () => {
  it('feeding raises hunger and stamps lastFedAt', () => {
    const pet = applyAction(makePet({ hunger: 40 }), 'feed', hoursLater(1));
    expect(pet.hunger).toBe(80); // 40 + 40
    expect(pet.lastFedAt).toEqual(hoursLater(1));
  });

  it('clamps at 100 when already full', () => {
    const pet = applyAction(makePet({ hunger: 90 }), 'feed', hoursLater(1));
    expect(pet.hunger).toBe(100);
  });

  it('playing costs energy', () => {
    const pet = applyAction(makePet({ happiness: 50, energy: 50 }), 'play', hoursLater(1));
    expect(pet.happiness).toBe(80);
    expect(pet.energy).toBe(50 - PET_ACTIONS.play.energyCost);
  });

  it('throws PetCooldownError when repeated too fast', () => {
    const now = hoursLater(1);
    const once = applyAction(makePet(), 'feed', now);
    expect(() => applyAction(once, 'feed', new Date(now.getTime() + 1000))).toThrow(
      PetCooldownError,
    );
  });

  it('cooldown clears after the window', () => {
    const now = hoursLater(1);
    const once = applyAction(makePet(), 'feed', now);
    const after = new Date(now.getTime() + PET_ACTIONS.feed.cooldownMs + 1);
    expect(actionCooldownRemaining(once, 'feed', after)).toBe(0);
    expect(() => applyAction(once, 'feed', after)).not.toThrow();
  });
});
