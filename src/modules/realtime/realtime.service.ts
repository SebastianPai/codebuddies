import { Injectable, MessageEvent } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';

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
      const subscription = stream.subscribe(subscriber);
      subscriber.next({
        type: 'presence:update',
        data: { userId, online: true },
      });

      return () => {
        subscription.unsubscribe();
        this.setOffline(userId, sessionId);
      };
    });
  }

  isOnline(userId: string) {
    return (this.sessionsByUser.get(userId)?.size ?? 0) > 0;
  }

  emitToUser(userId: string, event: RealtimeEvent) {
    this.getStream(userId).next({ type: event.type, data: event.payload });
  }

  emitToUsers(userIds: string[], event: RealtimeEvent) {
    [...new Set(userIds)].forEach((userId) => this.emitToUser(userId, event));
  }

  emitToAll(event: RealtimeEvent) {
    [...this.streams.keys()].forEach((userId) => this.emitToUser(userId, event));
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
