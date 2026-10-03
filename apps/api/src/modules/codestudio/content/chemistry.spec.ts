import { chemistryFactor, chemistryScore } from './chemistry';

const member = (roleSlug: string, extra: Partial<{ seniority: string; traitKey: string; traitTone: string }> = {}) => ({
  roleSlug,
  seniority: 'mid',
  traitKey: 'steady',
  traitTone: 'neutral',
  ...extra,
});

describe('chemistryScore', () => {
  it('un PM ordenando programadores sube la química; sin PM baja', () => {
    const devs = [member('frontend'), member('backend')];
    expect(chemistryScore([...devs, member('product-manager')])).toBeGreaterThan(chemistryScore(devs));
  });

  it('juniors sin un senior bajan la química', () => {
    expect(chemistryScore([member('backend', { seniority: 'junior' }), member('frontend', { seniority: 'senior' })])).toBeGreaterThan(
      chemistryScore([member('backend', { seniority: 'junior' }), member('frontend', { seniority: 'junior' })]),
    );
  });

  it('el efecto va de -10% a +10%', () => {
    expect(chemistryFactor(0)).toBeCloseTo(0.9);
    expect(chemistryFactor(50)).toBe(1);
    expect(chemistryFactor(100)).toBeCloseTo(1.1);
  });
});
