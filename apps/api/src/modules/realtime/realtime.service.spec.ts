import { RealtimeService } from './realtime.service';

describe('RealtimeService', () => {
  it('no crea streams para usuarios desconectados', () => {
    const service = new RealtimeService();
    service.emitToUser('offline-user', { type: 'message:new', payload: {} });
    expect((service as any).streams.size).toBe(0);
  });

  it('entrega eventos al conectado y suelta el stream al desconectarse', () => {
    const service = new RealtimeService();
    const received: string[] = [];
    const subscription = service
      .connect('u1', 'tab-1')
      .subscribe((event) => received.push(String(event.type)));

    service.emitToUser('u1', { type: 'message:new', payload: { a: 1 } });
    expect(received).toContain('message:new');
    expect(service.isOnline('u1')).toBe(true);

    subscription.unsubscribe();
    expect(service.isOnline('u1')).toBe(false);
    expect((service as any).streams.has('u1')).toBe(false);
  });
});
