-- CreateTable
CREATE TABLE "UserGamificationBadge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserGamificationBadge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserGamificationTitle" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "titleId" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserGamificationTitle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserGamificationBadge_userId_unlockedAt_idx" ON "UserGamificationBadge"("userId", "unlockedAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserGamificationBadge_userId_badgeId_key" ON "UserGamificationBadge"("userId", "badgeId");

-- CreateIndex
CREATE INDEX "UserGamificationTitle_userId_unlockedAt_idx" ON "UserGamificationTitle"("userId", "unlockedAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserGamificationTitle_userId_titleId_key" ON "UserGamificationTitle"("userId", "titleId");

-- AddForeignKey
ALTER TABLE "UserGamificationBadge" ADD CONSTRAINT "UserGamificationBadge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserGamificationBadge" ADD CONSTRAINT "UserGamificationBadge_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "GamificationBadge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserGamificationTitle" ADD CONSTRAINT "UserGamificationTitle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserGamificationTitle" ADD CONSTRAINT "UserGamificationTitle_titleId_fkey" FOREIGN KEY ("titleId") REFERENCES "GamificationTitle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
