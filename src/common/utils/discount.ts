import {User} from "@prisma/client";
import {PrismaService} from "@common/services/prisma.service";

const BASE_PRICE = 180;

const DISCOUNTS = {
    1: 1,
    3: 0.85,
    6: 0.80,
    12: 0.75,
};

export async function getPrice(months: number, user: User, prisma: PrismaService) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const referredCountThisMonth = await prisma.referral.count({
        where: {
            inviter: {
                id: user.id,
            },
            invited: {
                auraId: {not: null},
            },
            createdAt: {gte: startOfMonth}
        },
    });

    const referral = await prisma.referral.count({
        where: {
            invited: {
                id: user.id,
            },
        },
    });

    const referralBonus = Math.min(referredCountThisMonth * 5, 25);
    const baseDiscount = (user.discount ?? 0) + (referral ? 5 : 0);
    let maxDiscount = 100;
    let persistDiscount = 0;
    let note = "";

    switch (user.level) {
        case "ferrum":
            persistDiscount = 0;
            maxDiscount = 25;
            break;
        case "argentum":
            persistDiscount = 25;
            maxDiscount = 50;
            break;
        case "aurum":
            persistDiscount = 50;
            maxDiscount = 75;
            break;
        case "platinum":
            persistDiscount = 100;
            maxDiscount = 100;
            note = "(пожизненно)";
            break;
    }

    const firstDiscount = Math.min(baseDiscount + persistDiscount + referralBonus, maxDiscount);
    const totalDiscount = Math.min(baseDiscount + persistDiscount, maxDiscount);

    const base = BASE_PRICE * DISCOUNTS[months as keyof typeof DISCOUNTS];
    const firstMonthPrice = base * (1 - firstDiscount / 100);
    const totalMonthPrice = base * (months - 1) * (1 - totalDiscount / 100);

    const price = months === 1 ? firstMonthPrice : firstMonthPrice + totalMonthPrice;

    return {
        price,
        note,

        referredCountThisMonth,

        baseDiscount,       // Личная скидка пользователя
        maxDiscount,        // Максимально доступная скидка уровня
        persistDiscount,    // Постоянная скидка уровня

        firstDiscount,      // Скидка за 1 месяц
        totalDiscount,      // Скидка за последующие
        firstMonthPrice,    // Цена за 1 месяц
        totalMonthPrice,    // Цена за последующие
    };
}
