import { crossedMilestone, missingPiece, officeLines } from './office';
import { officeConversations } from './office-talk';

// Oficina más inteligente: dicen qué mueble falta, festejan récords solo
// cuando pasan y comentan lanzamientos, contrataciones y despidos.
describe('oficina de CodeStudio: lo que dicen', () => {
  const counts = { desk: 3, chair: 0, pc: 3, snacks: 0, water: 0, coffee: 0 };

  it('si hay computadores pero no sillas, se quejan de las sillas', () => {
    expect(missingPiece(counts, 2)).toBe('chair');
    expect(missingPiece({ ...counts, chair: 3, pc: 1 }, 2)).toBe('pc');
    expect(missingPiece({ ...counts, chair: 3 }, 2)).toBeNull();
    const base = { activeUsers: 50, openBugs: 0, queued: 0, maxParallel: 1, utilization: 0.2, campaigns: 1, cash: 9999, dailyCosts: 10, stageName: null, fundingRaised: false, unseated: 2, missing: 'chair' as const, hasOffice: true, amenities: [] };
    const text = officeLines(base).map((line) => line.es).join(' | ');
    expect(text).toContain('no sillas');
    expect(text).toContain('cafetera');
  });

  it('el récord se festeja solo al cruzarlo, no para siempre', () => {
    expect(crossedMilestone(950, 1020)).toBe(1000);
    expect(crossedMilestone(1020, 1100)).toBeNull();
    const base = { activeUsers: 5000, openBugs: 0, queued: 0, maxParallel: 1, utilization: 0.2, campaigns: 1, cash: 9999, dailyCosts: 10, stageName: null, fundingRaised: false, unseated: 0 };
    expect(officeLines(base).map((line) => line.es).join(' ')).not.toContain('usuarios');
  });

  it('comentan un lanzamiento, una contratación y un despido', () => {
    const employees = [
      { id: 'a', name: 'Ana Ruiz', roleSlug: 'frontend', traitKey: 'steady' },
      { id: 'b', name: 'Beto Paz', roleSlug: 'marketing', traitKey: 'steady' },
      { id: 'c', name: 'Caro Gil', roleSlug: 'support', traitKey: 'star' },
    ];
    const talk = officeConversations({
      employees,
      openBugs: [],
      recentFixes: [],
      deal: null,
      unseatedIds: [],
      events: [
        { event: 'release', name: 'Login con Google' },
        { event: 'hire', name: 'Caro Gil', employeeId: 'c', auto: true },
        { event: 'fire', name: 'Dani Sol', trait: 'sloppy' },
      ],
    })
      .flat()
      .map((line) => line.text.es)
      .join(' | ');
    expect(talk).toContain('Login con Google');
    expect(talk).toContain('Bienvenida al equipo, Caro');
    expect(talk).toContain('hacía falta gente');
    expect(talk).toContain('Desde que se fue Dani');
  });
});
