// network/messages.ts — cliente REST de /messages (ver apps/api MessagesController)

import { apiGet, apiPatch, apiPost } from "./http";
import { PersonSummary } from "./friendships";

export type Conversation = {
  id: string;
  partner: PersonSummary;
  lastMessage?: { body: string; createdAt: string; senderId: string } | null;
  unreadCount: number;
};

export type MessageRequestItem = {
  id: string;
  sender: PersonSummary;
  body: string;
  createdAt: string;
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
  deliveredAt?: string | null;
  seenAt?: string | null;
};

export function getInbox() {
  return apiGet<Conversation[]>("/messages/conversations");
}

export function getMessageRequests() {
  return apiGet<MessageRequestItem[]>("/messages/requests");
}

export function createDirectConversation(userId: string) {
  return apiPost<
    | { id: string; partner: PersonSummary }
    | { messageRequest: MessageRequestItem; requiresApproval: true }
  >("/messages/conversations", { userId });
}

export function sendMessageRequest(username: string, body: string) {
  return apiPost("/messages/requests", { username, body });
}

export function acceptMessageRequest(id: string) {
  return apiPatch(`/messages/requests/${id}/accept`);
}

export function rejectMessageRequest(id: string) {
  return apiPatch(`/messages/requests/${id}/reject`);
}

export function getConversationMessages(conversationId: string) {
  return apiGet<ChatMessage[]>(`/messages/conversations/${conversationId}/messages`);
}

export function sendMessage(conversationId: string, body: string) {
  return apiPost<ChatMessage>(`/messages/conversations/${conversationId}/messages`, { body });
}

export function markConversationRead(conversationId: string) {
  return apiPatch(`/messages/conversations/${conversationId}/read`);
}

export function sendTyping(conversationId: string, isTyping: boolean) {
  return apiPost(`/messages/conversations/${conversationId}/typing`, { isTyping });
}

export function reactToMessage(conversationId: string, messageId: string, emoji: string) {
  return apiPost(`/messages/conversations/${conversationId}/messages/${messageId}/reactions`, {
    emoji,
  });
}
