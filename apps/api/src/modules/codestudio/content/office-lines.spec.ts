import { employeeLines, moodOf, type EmployeeLineContext, type EmployeeLineInput } from './office-lines';

const ctx: EmployeeLineContext = {
  activeUsers: 120,
  openBugs: 3,
  queued: 0,
  maxParallel: 1,
  utilization: 0.5,
  campaigns: 1,
  cash: 5000,
  dailyCosts: 100,
  stageName: null,
  fundingRaised: false,
  unseated: 0,
  rating: 4,
  hasCoffee: true,
};

const base: EmployeeLineInput = {
  id: 'e1',
  roleSlug: 'qa',
  traitKey: 'steady',
  motivation: 80,
  stress: 5,
  minutesInTeam: 100,
  seated: true,
  bugsCaused: 0,
  fixedBug: null,
  fixingBug: null,
};

describe('employeeLines', () => {
  it('quien arregló un bug lo cuenta primero', () => {
    const lines = employeeLines({ ...base, fixedBug: 'Login roto' }, ctx);
    expect(lines[0].es).toContain('Login roto');
  });

  it('cada rol habla de lo suyo', () => {
    const qa = employeeLines(base, ctx).map((line) => line.es).join(' ');
    const backend = employeeLines({ ...base, roleSlug: 'backend' }, { ...ctx, utilization: 0.95 }).map((line) => line.es).join(' ');
    expect(qa).toContain('3 bug');
    expect(backend).toContain('base de datos');
  });

  it('sin escritorio se queja', () => {
    expect(employeeLines({ ...base, seated: false }, ctx).some((line) => line.es.includes('escritorio'))).toBe(true);
  });

  it('el descuidado admite sus bugs', () => {
    expect(employeeLines({ ...base, traitKey: 'sloppy', bugsCaused: 2 }, ctx).some((line) => line.es.includes('culpa mía'))).toBe(true);
  });

  it('sin puesto ni plata, se enoja más seguido', () => {
    const now = Date.UTC(2026, 9, 3);
    const count = (input: EmployeeLineInput, context: EmployeeLineContext) =>
      Array.from({ length: 300 }, (_, i) => moodOf({ ...input, id: `e${i}` }, context, now)).filter((mood) => mood === 'angry').length;
    expect(count({ ...base, seated: false }, { ...ctx, cash: 0 })).toBeGreaterThan(count(base, ctx));
  });

  it('el ánimo es el mismo para todos en la misma ventana de tiempo', () => {
    const now = Date.UTC(2026, 9, 3, 12, 1);
    expect(moodOf(base, ctx, now)).toBe(moodOf(base, ctx, now + 60_000));
  });
});
