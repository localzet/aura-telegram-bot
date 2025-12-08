import { Injectable } from '@nestjs/common';
import { PrismaService } from '@common/services/prisma.service';
import { getPricingConfig, PricingConfig } from '@common/config/pricing.config';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AdminConfigService {
    constructor(
        private prisma: PrismaService,
        private config: ConfigService,
    ) {}

    async getConfig(): Promise<Record<string, any>> {
        // Получаем конфигурацию из БД, если есть, иначе из env
        const dbConfig = await this.prisma.config.findMany();
        const configMap: Record<string, string> = {};
        
        dbConfig.forEach((item) => {
            configMap[item.key] = item.value;
        });

        // Получаем ценовую конфигурацию
        const pricingConfig = getPricingConfig(this.config);

        return {
            pricing: pricingConfig,
            closedMode: dbConfig.find((c) => c.key === 'CLOSED_MODE_ENABLED')?.value === 'true' || 
                       this.config.get<boolean>('CLOSED_MODE_ENABLED', false),
            // Можно добавить другие настройки
        };
    }

    async updateConfig(key: string, value: string, description?: string, updatedBy?: string): Promise<void> {
        await this.prisma.config.upsert({
            where: { key },
            create: {
                key,
                value,
                description,
                updatedBy,
            },
            update: {
                value,
                description,
                updatedBy,
            },
        });
    }

    async updatePricingConfig(config: Partial<PricingConfig>, updatedBy?: string): Promise<void> {
        if (config.basePrice !== undefined) {
            await this.updateConfig('BASE_PRICE', String(config.basePrice), 'Base price per month', updatedBy);
        }
        if (config.discounts) {
            if (config.discounts[3] !== undefined) {
                await this.updateConfig('PRICE_DISCOUNT_3_MONTHS', String(config.discounts[3]), 'Discount for 3 months', updatedBy);
            }
            if (config.discounts[6] !== undefined) {
                await this.updateConfig('PRICE_DISCOUNT_6_MONTHS', String(config.discounts[6]), 'Discount for 6 months', updatedBy);
            }
            if (config.discounts[12] !== undefined) {
                await this.updateConfig('PRICE_DISCOUNT_12_MONTHS', String(config.discounts[12]), 'Discount for 12 months', updatedBy);
            }
        }
        if (config.levels) {
            Object.entries(config.levels).forEach(([level, levelConfig]) => {
                if (levelConfig.persistDiscount !== undefined) {
                    await this.updateConfig(
                        `LEVEL_${level.toUpperCase()}_DISCOUNT`,
                        String(levelConfig.persistDiscount),
                        `Persistent discount for ${level} level`,
                        updatedBy,
                    );
                }
                if (levelConfig.maxDiscount !== undefined) {
                    await this.updateConfig(
                        `LEVEL_${level.toUpperCase()}_MAX_DISCOUNT`,
                        String(levelConfig.maxDiscount),
                        `Max discount for ${level} level`,
                        updatedBy,
                    );
                }
            });
        }
        if (config.referral) {
            if (config.referral.bonusPercent !== undefined) {
                await this.updateConfig('REFERRAL_BONUS_PERCENT', String(config.referral.bonusPercent), 'Referral bonus percent per user', updatedBy);
            }
            if (config.referral.maxBonus !== undefined) {
                await this.updateConfig('REFERRAL_MAX_BONUS', String(config.referral.maxBonus), 'Max referral bonus percent', updatedBy);
            }
        }
    }

    async updateClosedMode(enabled: boolean, updatedBy?: string): Promise<void> {
        await this.updateConfig('CLOSED_MODE_ENABLED', enabled ? 'true' : 'false', 'Enable/disable closed mode (invitation only)', updatedBy);
    }

    async getConfigValue(key: string): Promise<string | null> {
        const config = await this.prisma.config.findUnique({
            where: { key },
        });
        return config?.value || null;
    }
}

