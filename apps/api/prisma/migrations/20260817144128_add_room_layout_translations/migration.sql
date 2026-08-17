-- CreateTable
CREATE TABLE "RoomLayoutTranslation" (
    "id" TEXT NOT NULL,
    "roomLayoutId" TEXT NOT NULL,
    "languageId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "RoomLayoutTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RoomLayoutTranslation_roomLayoutId_languageId_key" ON "RoomLayoutTranslation"("roomLayoutId", "languageId");

-- AddForeignKey
ALTER TABLE "RoomLayoutTranslation" ADD CONSTRAINT "RoomLayoutTranslation_roomLayoutId_fkey" FOREIGN KEY ("roomLayoutId") REFERENCES "RoomLayout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomLayoutTranslation" ADD CONSTRAINT "RoomLayoutTranslation_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "Language"("id") ON DELETE CASCADE ON UPDATE CASCADE;
