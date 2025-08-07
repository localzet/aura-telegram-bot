/*
  Warnings:

  - You are about to drop the column `expireAt` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `subscription` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[auraId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "expireAt",
DROP COLUMN "subscription",
ADD COLUMN     "auraId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_auraId_key" ON "User"("auraId");
