ALTER TABLE "Conversation" ADD COLUMN "directKey" TEXT;
ALTER TABLE "Message" ADD COLUMN "deliveredAt" TIMESTAMP(3);
ALTER TABLE "Message" ADD COLUMN "seenAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "Conversation_directKey_key" ON "Conversation"("directKey");
CREATE INDEX "Message_conversationId_seenAt_idx" ON "Message"("conversationId", "seenAt");
