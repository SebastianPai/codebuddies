import { countOffice, officeFactors, officeLines, officePrice, officeSummary } from './office';

describe('oficina de CodeStudio', () => {
  it('cuenta puestos completos (escritorio + silla + PC) y comodidades', () => {
    const counts = countOffice([['office:desk'], ['office:desk'], ['office:chair'], ['office:chair'], ['office:pc'], ['office:snacks', 'office:basic']]);
    const summary = officeSummary(counts, 3);
    expect(summary.stations).toBe(1);
    expect(summary.unseated).toBe(2);
    expect(summary.amenities).toEqual(['snacks']);
    expect(summary.bonus).toBeCloseTo(0.05);
  });

  it('sin oficina no hay castigo ni bonus (trabajan desde casa)', () => {
    const summary = officeSummary(null, 4);
    expect(summary.hasOffice).toBe(false);
    expect(officeFactors(summary, ['a', 'b']).size).toBe(0);
  });

  it('quien no tiene puesto rinde 15% menos; las comodidades suman hasta 15%', () => {
    const counts = { desk: 1, chair: 1, pc: 1, snacks: 2, water: 1, coffee: 1 };
    const factors = officeFactors(officeSummary(counts, 2), ['mejor', 'peor']);
    expect(factors.get('mejor')).toBeCloseTo(1.15);
    expect(factors.get('peor')).toBeCloseTo(0.85 * 1.15);
  });

  it('el mapa más chico es gratis y los grandes cuestan monedas', () => {
    expect(officePrice(400, 400)).toBe(0);
    expect(officePrice(800, 400)).toBe(400);
    expect(officePrice(1600, 400)).toBe(1000);
    expect(officePrice(4000, 400)).toBe(2000);
  });

  it('los empleados comentan lo que pasa y dan consejos', () => {
    const base = { activeUsers: 1200, openBugs: 4, queued: 2, maxParallel: 1, utilization: 0.95, campaigns: 0, cash: 10, dailyCosts: 100, stageName: 'Tracción', fundingRaised: true, unseated: 1 };
    const text = officeLines(base).map((line) => line.es).join(' | ');
    expect(text).toContain('1.000 usuarios');
    expect(text).toContain('Tracción');
    expect(text).toContain('invirtieron');
    expect(text).toContain('contrataran a otro');
    expect(text).toContain('servidor');
  });
});
