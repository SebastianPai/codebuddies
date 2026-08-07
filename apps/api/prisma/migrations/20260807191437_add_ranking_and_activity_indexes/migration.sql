-- CreateIndex
CREATE INDEX "Activity_userId_createdAt_idx" ON "Activity"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Ranking_type_period_score_idx" ON "Ranking"("type", "period", "score");
