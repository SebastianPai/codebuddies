import { of, throwError, lastValueFrom } from 'rxjs';
import { pickTargetId, sanitizeForLog } from './event-log.sanitize';
import { HttpEventLogInterceptor, SocketEventLogInterceptor } from './event-log.interceptors';

describe('historial (EventLog)', () => {
  it('nunca guarda contraseñas ni tokens y recorta textos largos', () => {
    const clean = sanitizeForLog({
      email: 'a@b.com',
      password: 'Segura#2026',
      newPassword: 'x',
      token: 'jwt',
      nested: { apiSecret: 's', note: 'x'.repeat(500) },
    }) as Record<string, any>;
    expect(clean.password).toBe('[oculto]');
    expect(clean.newPassword).toBe('[oculto]');
    expect(clean.token).toBe('[oculto]');
    expect(clean.nested.apiSecret).toBe('[oculto]');
    expect(clean.nested.note.length).toBeLessThan(200);
    expect(clean.email).toBe('a@b.com');
  });

  it('toma como objetivo el primer parámetro de ruta o un id conocido del cuerpo', () => {
    expect(pickTargetId({ id: 'abc' }, undefined)).toBe('abc');
    expect(pickTargetId(undefined, { roomItemId: 'ri-1', x: 2 })).toBe('ri-1');
    expect(pickTargetId(undefined, { x: 2 })).toBeNull();
  });

  function httpContext(req: Record<string, unknown>, statusCode = 201) {
    return {
      getType: () => 'http',
      switchToHttp: () => ({ getRequest: () => req, getResponse: () => ({ statusCode }) }),
    } as any;
  }

  it('registra una petición que cambia algo, con usuario y resultado', async () => {
    const events = { record: jest.fn() };
    const interceptor = new HttpEventLogInterceptor(events as any);
    const req = {
      method: 'POST',
      originalUrl: '/item-upgrades/u1/buy',
      route: { path: '/item-upgrades/:id/buy' },
      params: { id: 'u1' },
      body: {},
      user: { userId: 'user-1', username: 'ana', role: 'STUDENT' },
      ip: '1.2.3.4',
    };
    await lastValueFrom(interceptor.intercept(httpContext(req), { handle: () => of({ ok: true }) }));
    expect(events.record).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        action: 'POST /item-upgrades/:id/buy',
        success: true,
        statusCode: 201,
        targetId: 'u1',
      }),
    );
  });

  it('registra también los fallos, y no registra lecturas', async () => {
    const events = { record: jest.fn() };
    const interceptor = new HttpEventLogInterceptor(events as any);
    const failing = { method: 'POST', originalUrl: '/x', params: {}, body: {} };
    await expect(
      lastValueFrom(
        interceptor.intercept(httpContext(failing), {
          handle: () => throwError(() => Object.assign(new Error('Coins insuficientes'), { status: 400 })),
        }),
      ),
    ).rejects.toThrow();
    expect(events.record).toHaveBeenCalledWith(expect.objectContaining({ success: false, statusCode: 400 }));

    events.record.mockClear();
    await lastValueFrom(
      interceptor.intercept(httpContext({ method: 'GET', originalUrl: '/courses' }), { handle: () => of(1) }),
    );
    expect(events.record).not.toHaveBeenCalled();
  });

  it('en el juego registra compras y muebles, no el chat ni el movimiento', async () => {
    const events = { record: jest.fn() };
    const interceptor = new SocketEventLogInterceptor(events as any);
    const ctx = (pattern: string) =>
      ({
        getType: () => 'ws',
        switchToWs: () => ({
          getPattern: () => pattern,
          getClient: () => ({ data: { user: { userId: 'u', username: 'ana' } }, handshake: {} }),
          getData: () => ({ itemId: 'tv-1' }),
        }),
      }) as any;
    await lastValueFrom(interceptor.intercept(ctx('shop:item:buy'), { handle: () => of(undefined) }));
    await lastValueFrom(interceptor.intercept(ctx('playerChat'), { handle: () => of(undefined) }));
    await lastValueFrom(interceptor.intercept(ctx('playerMove'), { handle: () => of(undefined) }));
    expect(events.record).toHaveBeenCalledTimes(1);
    expect(events.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'shop:item:buy', source: 'SOCKET', targetId: 'tv-1' }),
    );
  });
});
