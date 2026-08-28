import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UpdateProfileDto } from './update-profile.dto';

// El locale chino (zh-Hans) fue reemplazado por alemán (de). Estos tests
// blindan ese cambio: `de` debe aceptarse y `zh-Hans` debe rechazarse.
describe('UpdateProfileDto uiLanguage', () => {
  async function errorsFor(uiLanguage: string) {
    const dto = plainToInstance(UpdateProfileDto, { uiLanguage });
    return validate(dto);
  }

  it('accepts the three supported UI languages', async () => {
    for (const lang of ['es', 'en-us', 'de']) {
      expect(await errorsFor(lang)).toHaveLength(0);
    }
  });

  it('rejects the retired Chinese locale', async () => {
    const errors = await errorsFor('zh-Hans');
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('uiLanguage');
  });

  it('rejects any other unknown locale', async () => {
    expect(await errorsFor('fr')).toHaveLength(1);
  });
});
