export type UserLite = {
  id: string;
  username: string;
  avatarUrl: string | null;
  online?: boolean;
};

export type Message = {
  id: string;
  body: string;
  senderId: string;
  deliveredAt?: string | null;
  seenAt?: string | null;
  createdAt: string;
  sender: UserLite;
};

export type Conversation = {
  id: string;
  partner: UserLite | null;
  participants: Array<{ userId: string; user: UserLite; lastReadAt?: string | null }>;
  lastMessage?: Message | null;
  unreadCount: number;
};

export type Reaction = { userId: string; emoji: string };
