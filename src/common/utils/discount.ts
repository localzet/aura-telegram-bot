import { User } from "@prisma/client";
import { PrismaService } from "@common/services/prisma.service";

const BASE_PRICE = 180;

const DISCOUNTS = {
  1: 1,
  3: 0.85,
  6: 0.8,
  12: 0.75,
};

export function price(months: number): number {
  const discount = DISCOUNTS[months as keyof typeof DISCOUNTS] ?? 1;
  return BASE_PRICE * months * discount;
}

export async function getPrise(
  months: number,
  user: User,
  prisma: PrismaService,
) {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const referredCountThisMonth = await prisma.referral.count({
    where: {
      inviter: {
        id: user.id,
        auraId: { not: null },
      },
      createdAt: { gte: startOfMonth },
    },
  });

  const referralBonus = Math.min(referredCountThisMonth * 5, 25);
  const baseDiscount = user.discount ?? 0;

  let maxDiscount = 0;
  let firstDiscount = 0;
  let persistDiscount = 0;

  switch (user.level) {
    case "ferrum":
      maxDiscount = 25;
      break;
    case "argentum":
      maxDiscount = 50;
      persistDiscount = maxDiscount / 2;
      break;
    case "aurum":
      maxDiscount = 100;
      persistDiscount = maxDiscount / 2;
      break;
    case "platinum":
      maxDiscount = 100;
      persistDiscount = maxDiscount;
      break;
  }

  firstDiscount = Math.min(baseDiscount + referralBonus, maxDiscount);
  const totalDiscount = Math.min(baseDiscount + persistDiscount, maxDiscount);

  const base = BASE_PRICE * DISCOUNTS[months as keyof typeof DISCOUNTS];
  const firstMonthPrice = base * (1 - firstDiscount / 100);
  const recurringMonthsPrice = base * (months - 1) * (1 - totalDiscount / 100);

  return months === 1
    ? firstMonthPrice
    : firstMonthPrice + recurringMonthsPrice;
}
