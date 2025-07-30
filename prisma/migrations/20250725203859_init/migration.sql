-- CreateEnum
CREATE TYPE "UserLevel" AS ENUM ('ferrum', 'argentum', 'aurum', 'platinum');

-- CreateEnum
CREATE TYPE "PurchaseType" AS ENUM ('crypto', 'yookasa', 'telegram');

-- CreateEnum
CREATE TYPE "PurchaseStatus" AS ENUM ('new', 'pending', 'paid', 'cancel');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "telegramId" BIGINT NOT NULL,
    "username" TEXT,
    "fullName" TEXT,
    "language" TEXT NOT NULL,
    "level" "UserLevel" NOT NULL DEFAULT 'ferrum',
    "discount" INTEGER NOT NULL DEFAULT 0,
    "referralFromId" INTEGER,
    "aurumGiven" INTEGER NOT NULL DEFAULT 0,
    "subscriptionLink" TEXT,
    "expireAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Purchase" (
    "id" SERIAL NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" "PurchaseType" NOT NULL,
    "status" "PurchaseStatus" NOT NULL,
    "month" INTEGER NOT NULL,
    "yookasaURL" TEXT,
    "yookasaId" TEXT,
    "currency" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3),
    "expireAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Purchase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_referralFromId_fkey" FOREIGN KEY ("referralFromId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
