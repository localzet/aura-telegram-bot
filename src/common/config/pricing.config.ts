import { ConfigService } from '@nestjs/config';

export interface PricingConfig {
    basePrice: number;
    discounts: {
        1: number;
        3: number;
        6: number;
        12: number;
    };
    levels: {
        ferrum: {
            persistDiscount: number;
            maxDiscount: number;
        };
        argentum: {
            persistDiscount: number;
            maxDiscount: number;
        };
        aurum: {
            persistDiscount: number;
            maxDiscount: number;
        };
        platinum: {
            persistDiscount: number;
            maxDiscount: number;
        };
    };
    referral: {
        bonusPercent: number;
        maxBonus: number;
    };
}

export function getPricingConfig(config: ConfigService): PricingConfig {
    return {
        basePrice: config.get<number>('BASE_PRICE', 180),
        discounts: {
            1: 1,
            3: config.get<number>('PRICE_DISCOUNT_3_MONTHS', 0.85),
            6: config.get<number>('PRICE_DISCOUNT_6_MONTHS', 0.80),
            12: config.get<number>('PRICE_DISCOUNT_12_MONTHS', 0.75),
        },
        levels: {
            ferrum: {
                persistDiscount: 0,
                maxDiscount: config.get<number>('LEVEL_FERRUM_MAX_DISCOUNT', 25),
            },
            argentum: {
                persistDiscount: config.get<number>('LEVEL_ARGENTUM_DISCOUNT', 25),
                maxDiscount: config.get<number>('LEVEL_ARGENTUM_MAX_DISCOUNT', 50),
            },
            aurum: {
                persistDiscount: config.get<number>('LEVEL_AURUM_DISCOUNT', 50),
                maxDiscount: config.get<number>('LEVEL_AURUM_MAX_DISCOUNT', 50),
            },
            platinum: {
                persistDiscount: config.get<number>('LEVEL_PLATINUM_DISCOUNT', 100),
                maxDiscount: 100,
            },
        },
        referral: {
            bonusPercent: config.get<number>('REFERRAL_BONUS_PERCENT', 5),
            maxBonus: config.get<number>('REFERRAL_MAX_BONUS', 25),
        },
    };
}

