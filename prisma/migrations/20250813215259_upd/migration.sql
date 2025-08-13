/*
  Warnings:

  - You are about to drop the column `userEmail` on the `Purchase` table. All the data in the column will be lost.
  - You are about to drop the column `userName` on the `Purchase` table. All the data in the column will be lost.
  - You are about to drop the column `userPhone` on the `Purchase` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Purchase" DROP COLUMN "userEmail",
DROP COLUMN "userName",
DROP COLUMN "userPhone";

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "telegramId" SET DATA TYPE BIGINT;
