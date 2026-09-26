-- CodeStudio: contadores de misiones diarias.

-- CreateTable
CREATE TABLE "CodeStudioDailyCounter" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "counter" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CodeStudioDailyCounter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CodeStudioDailyCounter_userId_day_counter_key" ON "CodeStudioDailyCounter"("userId", "day", "counter");

-- AddForeignKey
ALTER TABLE "CodeStudioDailyCounter" ADD CONSTRAINT "CodeStudioDailyCounter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
