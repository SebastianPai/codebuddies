import { EXIT_REWARDS, SERIAL_FOUNDER_CASH, SERIAL_FOUNDER_MAX_SALES, exitOf, isSold, serialFounderBonus } from './content/exit';

describe('CodeStudio: salida (vender o salir a bolsa)', () => {
  it('fundador en serie: caja extra por cada venta, con tope', () => {
    expect(serialFounderBonus(0)).toBe(0);
    expect(serialFounderBonus(2)).toBe(2 * SERIAL_FOUNDER_CASH);
    expect(serialFounderBonus(99)).toBe(SERIAL_FOUNDER_MAX_SALES * SERIAL_FOUNDER_CASH);
  });

  it('lee la salida guardada en metadata y detecta las vendidas', () => {
    expect(exitOf(null)).toBeNull();
    expect(exitOf({ exit: { type: 'otra' } })).toBeNull();
    expect(isSold({ exit: { type: 'sale', at: '', valuation: 1 } })).toBe(true);
    expect(isSold({ exit: { type: 'ipo', at: '', valuation: 1 } })).toBe(false);
    expect(isSold({ office: 'x' })).toBe(false);
  });

  it('repetir salidas paga menos que la primera (no se farmea)', () => {
    for (const reward of Object.values(EXIT_REWARDS)) expect(reward.repeatXp).toBeLessThan(reward.xp);
  });
});
