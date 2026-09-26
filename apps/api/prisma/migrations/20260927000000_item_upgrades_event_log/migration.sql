-- Mejoras desbloqueables de objetos del mundo (ItemUpgrade/UserItemUpgrade)
-- e historial completo para el admin (EventLog). Solo agrega tablas.

-- CreateTable
CREATE TABLE "ItemUpgrade" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceCoins" INTEGER NOT NULL,
    "unlockStates" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "requiresId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemUpgrade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserItemUpgrade" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "upgradeId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "pricePaid" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserItemUpgrade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "username" TEXT,
    "role" TEXT,
    "source" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "method" TEXT,
    "path" TEXT,
    "statusCode" INTEGER,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "durationMs" INTEGER,
    "ip" TEXT,
    "targetId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ItemUpgrade_itemId_active_idx" ON "ItemUpgrade"("itemId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "ItemUpgrade_itemId_key_key" ON "ItemUpgrade"("itemId", "key");

-- CreateIndex
CREATE INDEX "UserItemUpgrade_userId_itemId_idx" ON "UserItemUpgrade"("userId", "itemId");

-- CreateIndex
CREATE UNIQUE INDEX "UserItemUpgrade_userId_upgradeId_key" ON "UserItemUpgrade"("userId", "upgradeId");

-- CreateIndex
CREATE INDEX "EventLog_createdAt_idx" ON "EventLog"("createdAt");

-- CreateIndex
CREATE INDEX "EventLog_userId_createdAt_idx" ON "EventLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "EventLog_action_createdAt_idx" ON "EventLog"("action", "createdAt");

-- AddForeignKey
ALTER TABLE "ItemUpgrade" ADD CONSTRAINT "ItemUpgrade_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemUpgrade" ADD CONSTRAINT "ItemUpgrade_requiresId_fkey" FOREIGN KEY ("requiresId") REFERENCES "ItemUpgrade"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserItemUpgrade" ADD CONSTRAINT "UserItemUpgrade_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserItemUpgrade" ADD CONSTRAINT "UserItemUpgrade_upgradeId_fkey" FOREIGN KEY ("upgradeId") REFERENCES "ItemUpgrade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

