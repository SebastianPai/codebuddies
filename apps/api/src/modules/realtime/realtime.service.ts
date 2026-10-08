import { Injectable, MessageEvent } from '@nestjs/common';
import { interval, map, merge, Observable, Subject } from 'rxjs';

// Heroku (y la mayoría de proxies) corta una conexión HTTP sin tráfico a los
// ~55 s. Sin latido el EventSource se reconectaba cada minuto, y cada
// reconexión emitía presencia offline/online a TODOS los usuarios.
const HEARTBEAT_MS = 25_000;

export type RealtimeEvent = {
  type:
    | 'presence:update'
    | 'friendship:request'
    | 'friendship:accepted'
    | 'message:new'
    | 'message:delivered'
    | 'message:seen'
    | 'message:typing'
    | 'message:reaction'
    | 'conversation:deleted'
    | 'notification:new';
  payload: Record<string, unknown>;
};

@Injectable()
export class RealtimeService {
  private readonly streams = new Map<string, Subject<MessageEvent>>();
  private readonly sessionsByUser = new Map<string, Set<string>>();

  connect(userId: string, sessionId: string): Observable<MessageEvent> {
    const stream = this.getStream(userId);
    this.setOnline(userId, sessionId);

    return new Observable<MessageEvent>((subscriber) => {
      const heartbeat = interval(HEARTBEAT_MS).pipe(
        map((): MessageEvent => ({ type: 'ping', data: '' })),
      );
      const subscription = merge(stream, heartbeat).subscribe(subscriber);
      subscriber.next({
        type: 'presence:update',
        data: { userId, online: true },
      });

      return () => {
        subscription.unsubscribe();
        this.setOffline(userId, sessionId);
        // Sin pestañas abiertas: soltar el stream (antes quedaba en el mapa
        // para siempre y emitToAll recorría a todos los usuarios que alguna
        // vez se conectaron).
        const current = this.streams.get(userId);
        if (current && !current.observed && !this.sessionsByUser.has(userId)) {
          this.streams.delete(userId);
        }
      };
    });
  }

  isOnline(userId: string) {
    return (this.sessionsByUser.get(userId)?.size ?? 0) > 0;
  }

  // Cuántos usuarios distintos tienen al menos una pestaña con el stream SSE
  // abierto ahora mismo — usado para el pulso de actividad global ("N
  // Buddies learning now"). En memoria del proceso: con más de un dyno de
  // api subestima el total real, igual que cualquier otro estado en
  // memoria de este servicio (ver RedisIoAdapter para el gateway de juego,
  // que sí es multi-dyno; este SSE de presencia no lo es todavía).
  getOnlineCount() {
    return this.sessionsByUser.size;
  }

  // Solo a quien tiene el stream abierto: antes se creaba un Subject nuevo
  // (que nadie escuchaba y nunca se borraba) por cada destinatario offline.
  emitToUser(userId: string, event: RealtimeEvent) {
    this.streams.get(userId)?.next({ type: event.type, data: event.payload });
  }

  emitToUsers(userIds: string[], event: RealtimeEvent) {
    [...new Set(userIds)].forEach((userId) => this.emitToUser(userId, event));
  }

  emitToAll(event: RealtimeEvent) {
    [...this.streams.keys()].forEach((userId) =>
      this.emitToUser(userId, event),
    );
  }

  forceOffline(userId: string, sessionId?: string) {
    if (!sessionId) {
      this.sessionsByUser.delete(userId);
      this.emitPresence(userId, false);
      return;
    }

    this.setOffline(userId, sessionId);
  }

  emitPresence(userId: string, online: boolean) {
    this.emitToAll({
      type: 'presence:update',
      payload: { userId, online },
    });
  }

  private getStream(userId: string) {
    let stream = this.streams.get(userId);
    if (!stream) {
      stream = new Subject<MessageEvent>();
      this.streams.set(userId, stream);
    }
    return stream;
  }

  private setOnline(userId: string, sessionId: string) {
    const sessions = this.sessionsByUser.get(userId) ?? new Set<string>();
    const wasOffline = sessions.size === 0;
    sessions.add(sessionId);
    this.sessionsByUser.set(userId, sessions);
    if (wasOffline) this.emitPresence(userId, true);
  }

  private setOffline(userId: string, sessionId: string) {
    const sessions = this.sessionsByUser.get(userId);
    if (!sessions) return;

    sessions.delete(sessionId);
    if (sessions.size > 0) {
      this.sessionsByUser.set(userId, sessions);
      return;
    }

    this.sessionsByUser.delete(userId);
    this.emitPresence(userId, false);
  }
}
