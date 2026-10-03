import { officeConversations, type TalkEmployee } from './office-talk';

const pm: TalkEmployee = { id: 'pm', name: 'Valentina Ríos', roleSlug: 'product-manager', traitKey: 'steady' };
const dev: TalkEmployee = { id: 'dev', name: 'Mateo Herrera', roleSlug: 'backend', traitKey: 'steady' };
const qa: TalkEmployee = { id: 'qa', name: 'Sofía Mejía', roleSlug: 'qa', traitKey: 'steady' };

const base = { recentFixes: [], deal: null, unseatedIds: [] };

describe('officeConversations', () => {
  it('el PM pasa el bug y quien lo toma responde según lo difícil', () => {
    const easy = officeConversations({ ...base, employees: [pm, dev], openBugs: [{ id: 'b1', title: 'Login roto', severity: 'LOW', assignedEmployeeId: 'dev' }] });
    expect(easy[0][0]).toMatchObject({ employeeId: 'pm' });
    expect(easy[0][0].text.es).toContain('Mateo, ¿te encargas de «Login roto»?');
    expect(easy[0][1].employeeId).toBe('dev');

    const hard = officeConversations({ ...base, employees: [pm, dev], openBugs: [{ id: 'b1', title: 'Caída total', severity: 'CRITICAL', assignedEmployeeId: 'dev' }] });
    expect(['Uf', 'costar'].some((word) => hard[0][1].text.es.includes(word))).toBe(true);
  });

  it('QA avisa de un bug que nadie tomó', () => {
    const talks = officeConversations({ ...base, employees: [qa, dev], openBugs: [{ id: 'b2', title: 'Pago falla', severity: 'MEDIUM', assignedEmployeeId: null }] });
    expect(talks[0][0]).toMatchObject({ employeeId: 'qa' });
    expect(talks[0][1]).toMatchObject({ employeeId: 'dev' });
  });

  it('sin al menos dos personas no hay charla', () => {
    expect(officeConversations({ ...base, employees: [dev], openBugs: [{ id: 'b1', title: 'x', severity: 'LOW', assignedEmployeeId: 'dev' }] })).toEqual([]);
  });
});
