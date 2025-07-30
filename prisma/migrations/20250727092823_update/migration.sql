/*
  Warnings:

  - You are about to drop the column `aurumGiven` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `promotedReferralsCount` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `referredById` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `subscriptionLink` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[invitedById]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_referredById_fkey";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "aurumGiven",
DROP COLUMN "promotedReferralsCount",
DROP COLUMN "referredById",
DROP COLUMN "subscriptionLink",
ADD COLUMN     "discountExpiresAt" TIMESTAMP(3),
ADD COLUMN     "grantedArgentum" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "grantedAurum" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "grantedPlatinum" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "invitedById" TEXT,
ADD COLUMN     "subscription" TEXT;

-- CreateTable
CREATE TABLE "Referral" (
    "id" TEXT NOT NULL,
    "inviterId" TEXT NOT NULL,
    "invitedId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Referral_invitedId_key" ON "Referral"("invitedId");

-- CreateIndex
CREATE UNIQUE INDEX "Referral_inviterId_invitedId_key" ON "Referral"("inviterId", "invitedId");

-- CreateIndex
CREATE UNIQUE INDEX "User_invitedById_key" ON "User"("invitedById");

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_invitedId_fkey" FOREIGN KEY ("invitedId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
