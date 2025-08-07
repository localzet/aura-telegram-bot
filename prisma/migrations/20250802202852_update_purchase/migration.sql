/*
  Warnings:

  - You are about to drop the column `expireAt` on the `Purchase` table. All the data in the column will be lost.
  - You are about to drop the column `yookasaURL` on the `Purchase` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Purchase" DROP COLUMN "expireAt",
DROP COLUMN "yookasaURL",
ADD COLUMN     "telegramId" TEXT,
ADD COLUMN     "userEmail" TEXT,
ADD COLUMN     "userName" TEXT,
ADD COLUMN     "userPhone" TEXT;
