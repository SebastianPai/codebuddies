import { sanitizeLightConfig } from './light-config.util';

describe('sanitizeLightConfig', () => {
  it('sin config = null (luz redonda de siempre)', () => {
    expect(sanitizeLightConfig(null)).toBeNull();
    expect(sanitizeLightConfig('cono')).toBeNull();
  });

  it('reconstruye un cono con rangos fijos', () => {
    expect(
      sanitizeLightConfig({ shape: 'CONE', originX: 12.4, originY: -40, direction: -90, spread: 500, hack: 1 }),
    ).toEqual({ shape: 'CONE', originX: 12, originY: -40, direction: 270, spread: 180 });
  });

  it('forma desconocida cae a círculo y números raros a sus defaults', () => {
    expect(sanitizeLightConfig({ shape: 'STAR', originX: 'x', spread: 2 })).toEqual({
      shape: 'CIRCLE', originX: 0, originY: 0, direction: 90, spread: 10,
    });
  });
});
