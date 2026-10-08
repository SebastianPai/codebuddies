import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { RegisterDto } from './dto/register.dto';
import { isDisposableEmail, isWeakPassword } from './auth-rules';

async function errorsFor(input: Partial<RegisterDto>) {
  const dto = plainToInstance(RegisterDto, {
    username: 'coder_01',
    email: 'coder@example.com',
    password: 'Segura#2026',
    acceptLegal: true,
    ...input,
  });
  const errors = await validate(dto);
  return errors.map((error) => error.property);
}

describe('reglas de registro', () => {
  it('acepta un registro válido y normaliza el correo', async () => {
    expect(await errorsFor({})).toEqual([]);
    const dto = plainToInstance(RegisterDto, { email: '  Coder@Example.COM ' });
    expect(dto.email).toBe('coder@example.com');
  });

  it.each([
    'corta1!',
    'sinmayuscula1!',
    'SINMINUSCULA1!',
    'SinNumero!!',
    'SinSimbolo12',
  ])('rechaza la contraseña débil %s', async (password) => {
    expect(await errorsFor({ password })).toContain('password');
  });

  it.each(['no-es-correo', 'a@b', 'user@localhost', 'user@@example.com'])(
    'rechaza el correo inválido %s',
    async (email) => {
      expect(await errorsFor({ email })).toContain('email');
    },
  );

  it.each([
    'ab',
    '.punto',
    'punto.',
    'dos..puntos',
    'con espacio',
    'más_de_veinte_caracteres',
  ])('rechaza el usuario inválido %s', async (username) => {
    expect(await errorsFor({ username })).toContain('username');
  });

  it('exige aceptar Términos y Privacidad (casilla obligatoria)', async () => {
    expect(await errorsFor({ acceptLegal: false })).toContain('acceptLegal');
  });

  it('detecta correos temporales y contraseñas obvias', () => {
    expect(isDisposableEmail('x@mailinator.com')).toBe(true);
    expect(isDisposableEmail('x@gmail.com')).toBe(false);
    expect(isWeakPassword('Password1!', {})).toBe(true);
    expect(isWeakPassword('Coder_01#Xy', { username: 'coder_01' })).toBe(true);
    expect(isWeakPassword('Segura#2026', { username: 'coder_01' })).toBe(false);
  });
});
