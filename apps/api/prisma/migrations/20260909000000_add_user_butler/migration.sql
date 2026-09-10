-- CreateTable
CREATE TABLE "UserButler" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "npcKey" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "activeRoomId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserButler_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserButler_userId_key" ON "UserButler"("userId");

-- CreateIndex
CREATE INDEX "UserButler_activeRoomId_idx" ON "UserButler"("activeRoomId");

-- AddForeignKey
ALTER TABLE "UserButler" ADD CONSTRAINT "UserButler_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
