/*
  Warnings:

  - You are about to drop the column `eyeColor` on the `Avatar` table. All the data in the column will be lost.
  - You are about to drop the column `hairColor` on the `Avatar` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ItemAccessType" AS ENUM ('FREE', 'PREMIUM', 'EVENT', 'VIP');

-- CreateEnum
CREATE TYPE "SubscriptionType" AS ENUM ('FREE', 'PREMIUM', 'VIP');

-- AlterTable
ALTER TABLE "Avatar" DROP COLUMN "eyeColor",
DROP COLUMN "hairColor";

-- AlterTable
ALTER TABLE "AvatarSlot" ADD COLUMN     "color" INTEGER;

-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "accessType" "ItemAccessType" NOT NULL DEFAULT 'FREE';

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "type" "SubscriptionType" NOT NULL DEFAULT 'FREE';
