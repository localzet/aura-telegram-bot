-- CreateEnum
CREATE TYPE "PromoCodeType" AS ENUM ('discount', 'level');

-- AlterTable
ALTER TABLE "PromoCode" ADD COLUMN     "level" "UserLevel",
ADD COLUMN     "type" "PromoCodeType" NOT NULL DEFAULT 'discount';
