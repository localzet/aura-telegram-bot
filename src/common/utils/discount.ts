import { User } from "@prisma/client";
import { PrismaService } from "@common/services/prisma.service";
import { ConfigService } from "@nestjs/config";
import { getPricingConfig, PricingConfig } from "@common/config/pricing.config";

async function getPricingFromDB(
  prisma: PrismaService,
  config: ConfigService,
): Promise<PricingConfig> {
  // Получаем конфигурацию из БД
  // Используем try-catch на случай если таблица Config еще не создана
  let configMap: Record<string, string> = {};
  try {
    const dbConfig = (await (prisma as any).config?.findMany?.()) || [];
    dbConfig.forEach((item: { key: string; value: string }) => {
      configMap[item.key] = item.value;
    });
  } catch (error) {
    // Если таблица Config не существует, используем только env
  }

  // Создаем конфигурацию с приоритетом БД над env
  const getValue = (key: string, defaultValue: any) => {
    return configMap[key] !== undefined
      ? parseFloat(configMap[key])
      : config.get(key, defaultValue);
  };

  return {
    basePrice: getValue("BASE_PRICE", 180),
    discounts: {
      1: 1,
      3: getValue("PRICE_DISCOUNT_3_MONTHS", 0.85),
      6: getValue("PRICE_DISCOUNT_6_MONTHS", 0.8),
      12: getValue("PRICE_DISCOUNT_12_MONTHS", 0.75),
    },
    levels: {
      ferrum: {
        persistDiscount: 0,
        maxDiscount: getValue("LEVEL_FERRUM_MAX_DISCOUNT", 25),
      },
      argentum: {
        persistDiscount: getValue("LEVEL_ARGENTUM_DISCOUNT", 25),
        maxDiscount: getValue("LEVEL_ARGENTUM_MAX_DISCOUNT", 50),
      },
      aurum: {
        persistDiscount: getValue("LEVEL_AURUM_DISCOUNT", 50),
        maxDiscount: getValue("LEVEL_AURUM_MAX_DISCOUNT", 50),
      },
      platinum: {
        persistDiscount: getValue("LEVEL_PLATINUM_DISCOUNT", 100),
        maxDiscount: 100,
      },
    },
    referral: {
      bonusPercent: getValue("REFERRAL_BONUS_PERCENT", 5),
      maxBonus: getValue("REFERRAL_MAX_BONUS", 25),
    },
  };
}

export async function getPrice(
  months: number,
  user: User,
  prisma: PrismaService,
  config?: ConfigService,
  pricingConfig?: PricingConfig,
) {
  // Используем переданную конфигурацию, или получаем из БД, или создаем дефолтную
  let pricing: PricingConfig;
  if (pricingConfig) {
    pricing = pricingConfig;
  } else if (config) {
    pricing = await getPricingFromDB(prisma, config);
  } else {
    pricing = {
      basePrice: 180,
      discounts: { 1: 1, 3: 0.85, 6: 0.8, 12: 0.75 },
      levels: {
        ferrum: { persistDiscount: 0, maxDiscount: 25 },
        argentum: { persistDiscount: 25, maxDiscount: 50 },
        aurum: { persistDiscount: 50, maxDiscount: 50 },
        platinum: { persistDiscount: 100, maxDiscount: 100 },
      },
      referral: { bonusPercent: 5, maxBonus: 25 },
    };
  }
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  // Оптимизация: выполняем оба запроса параллельно
  const [referredCountThisMonth, referral] = await Promise.all([
    prisma.referral.count({
      where: {
        inviter: {
          id: user.id,
        },
        invited: {
          auraId: { not: null },
        },
        createdAt: { gte: startOfMonth },
      },
    }),
    prisma.referral.count({
      where: {
        invited: {
          id: user.id,
        },
      },
    }),
  ]);

  const referralBonus = Math.min(
    referredCountThisMonth * pricing.referral.bonusPercent,
    pricing.referral.maxBonus,
  );
  const baseDiscount = user.discount ?? 0;

  const levelConfig = pricing.levels[user.level];
  const persistDiscount = levelConfig.persistDiscount;
  const maxDiscount = levelConfig.maxDiscount;
  const note = user.level === "platinum" ? "(пожизненно)" : "";

  const firstDiscount = Math.min(
    baseDiscount + persistDiscount + referralBonus,
    maxDiscount,
  );
  const totalDiscount = Math.min(baseDiscount + persistDiscount, maxDiscount);

  const base =
    pricing.basePrice *
    pricing.discounts[months as keyof typeof pricing.discounts];
  const firstMonthPrice = base * (1 - firstDiscount / 100);
  const totalMonthPrice = base * (months - 1) * (1 - totalDiscount / 100);

  const price =
    months === 1 ? firstMonthPrice : firstMonthPrice + totalMonthPrice;

  // console.log(typeof price, price)
  return {
    price,
    note,

    referredCountThisMonth,

    baseDiscount, // Личная скидка пользователя
    maxDiscount, // Максимально доступная скидка уровня
    persistDiscount, // Постоянная скидка уровня

    firstDiscount, // Скидка за 1 месяц
    totalDiscount, // Скидка за последующие
    firstMonthPrice, // Цена за 1 месяц
    totalMonthPrice, // Цена за последующие
  };
}
