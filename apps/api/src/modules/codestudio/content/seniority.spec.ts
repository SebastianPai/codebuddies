import { candidateImpact, candidatesFor, promotionFor, SENIORITY, seniorityOf, type TeamContext } from './seniority';
import { applyDeal, marketingDeal } from './marketing-deal';

const ctx: TeamContext = {
  cash: 20000,
  dailyRevenue: 0,
  supportGap: 0,
  openBugs: 0,
  utilization: 0.3,
  activeUsers: 50,
  campaigns: 1,
  founderPower: 0.6,
};

describe('seniority', () => {
  it('sin dato es Semi-senior (los empleados de antes no cambian)', () => {
    expect(seniorityOf({ metadata: {} }).key).toBe('mid');
  });

  it('asciende al juntar trabajo', () => {
    expect(promotionFor({ metadata: { seniority: 'junior', stats: { featuresShipped: 3, bugsFixed: 2 } } })).toBeNull();
    expect(promotionFor({ metadata: { seniority: 'junior', stats: { featuresShipped: 4, bugsFixed: 2 } } })?.key).toBe('mid');
    expect(promotionFor({ metadata: { seniority: 'lead', stats: { featuresShipped: 999 } } })).toBeNull();
  });
});

describe('candidatos', () => {
  const role = { slug: 'backend', salary: 1000 };
  const now = Date.UTC(2026, 9, 3, 12);

  it('son los mismos al verlos y al contratarlos, y uno de cada nivel', () => {
    const first = candidatesFor('c1', role, 0.5, now);
    const again = candidatesFor('c1', role, 0.5, now + 60_000);
    expect(again.map((candidate) => candidate.name)).toEqual(first.map((candidate) => candidate.name));
    expect(first.map((candidate) => candidate.seniority.key)).toEqual(['junior', 'mid', 'senior']);
    expect(first[0].salary).toBe(700);
    expect(first[2].salary).toBe(1500);
  });

  it('un programador sin equipo suma mucha velocidad y encaja', () => {
    const impact = candidateImpact([], { roleSlug: 'backend', power: 1, bugRisk: 1, salary: 1000, trait: 'steady', seniority: SENIORITY.mid }, ctx);
    expect(impact.speed.delta).toBeGreaterThan(100);
    expect(impact.fit).toBeGreaterThanOrEqual(70);
  });

  it('un descuidado sube los bugs del equipo y lo dice', () => {
    const team = [{ roleSlug: 'backend', power: 1, bugRisk: 1, salary: 1000 }];
    const impact = candidateImpact(team, { roleSlug: 'frontend', power: 1, bugRisk: 1.8, salary: 900, trait: 'sloppy', seniority: SENIORITY.mid }, ctx);
    expect(impact.bugs).toBeGreaterThan(0);
    expect(impact.reasons.some((reason) => reason.tone === 'bad')).toBe(true);
  });
});

describe('oferta de marketing', () => {
  it('solo con alguien de marketing, y es la misma en la ventana', () => {
    const now = Date.UTC(2026, 9, 3, 12, 1);
    expect(marketingDeal('c1', ['tiktok', 'instagram'], false, now)).toBeNull();
    const deal = marketingDeal('c1', ['tiktok', 'instagram'], true, now);
    expect(deal).toEqual(marketingDeal('c1', ['instagram', 'tiktok'], true, now + 60_000));
    expect(deal!.discount).toBeGreaterThanOrEqual(0.2);
    expect(deal!.discount).toBeLessThanOrEqual(0.35);
  });

  it('misma gente por menos plata', () => {
    expect(applyDeal({ cost: 1000, cac: 5, users: 200 }, 0.25)).toEqual({ cost: 750, cac: 3.75, users: 200 });
  });
});
