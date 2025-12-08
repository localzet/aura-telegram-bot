import { Command, Ctx, InjectBot, Update } from "@localzet/grammy-nestjs";
import { Logger, UseFilters, UseInterceptors } from "@nestjs/common";
import { Bot, Context } from "grammy";
import { BotName } from "@modules/bot/bot.constants";
import { ResponseTimeInterceptor } from "@common/interceptors";
import { GrammyExceptionFilter } from "@common/filters";
import { PrismaService } from "@common/services/prisma.service";
import { UserService } from "@common/services/user.service";
import { AdminPromoCodesService } from "@modules/admin/admin-promocodes.service";
import { I18nService } from "@common/i18n";
import { prettyLevel } from "@common/utils";
import { UserLevel } from "@prisma/client";

@Update()
@UseInterceptors(ResponseTimeInterceptor)
@UseFilters(GrammyExceptionFilter)
export class PromoService {
    private readonly logger = new Logger(PromoService.name);

    constructor(
        @InjectBot(BotName)
        private readonly bot: Bot<Context>,
        private readonly prisma: PrismaService,
        private readonly userService: UserService,
        private readonly promoCodesService: AdminPromoCodesService,
        private readonly i18n: I18nService,
    ) {}

    @Command("promo")
    async onPromo(@Ctx() ctx: Context): Promise<void> {
        try {
            const msg = ctx.message?.text ?? "";
            const args = msg.split(" ").slice(1).join(" ").trim();
            
            if (!args) {
                await ctx.reply(this.i18n.t(ctx, "promo_usage"));
                return;
            }

            const code = args.toUpperCase().trim();
            let user;
            try {
                const result = await this.userService.getUser(ctx);
                user = result.tg;
            } catch (error: any) {
                if (error.message === "BLACKLISTED") {
                    await ctx.reply(this.i18n.t(ctx, "blacklisted"));
                    return;
                }
                throw error;
            }

            // Валидация промокода
            const validation = await this.promoCodesService.validatePromoCode(code);
            
            if (!validation.valid) {
                let message = this.i18n.t(ctx, "promo_not_found");
                if (validation.message) {
                    if (validation.message.includes("expired")) {
                        message = this.i18n.t(ctx, "promo_expired");
                    } else if (validation.message.includes("inactive")) {
                        message = this.i18n.t(ctx, "promo_inactive");
                    } else if (validation.message.includes("limit")) {
                        message = this.i18n.t(ctx, "promo_limit_reached");
                    }
                }
                await ctx.reply(message);
                return;
            }

            // Применение промокода
            if (validation.type === "level" && validation.level) {
                // Назначение уровня
                const assignedLevel = validation.level as UserLevel;
                await this.prisma.user.update({
                    where: { id: user.id },
                    data: { level: assignedLevel },
                });

                // Обновление счетчика использования
                const promoCode = await this.prisma.promoCode.findUnique({
                    where: { code },
                });

                if (promoCode) {
                    await this.prisma.promoCode.update({
                        where: { id: promoCode.id },
                        data: { usedCount: promoCode.usedCount + 1 },
                    });
                }

                const levelText = prettyLevel(assignedLevel);
                await ctx.reply(
                    this.i18n.t(ctx, "promo_level_granted", {
                        level: levelText || assignedLevel,
                    }),
                );
            } else if (validation.type === "discount" && validation.discount) {
                // Применение скидки
                const currentDiscount = user.discount || 0;
                const newDiscount = Math.min(currentDiscount + validation.discount, 100);

                await this.prisma.user.update({
                    where: { id: user.id },
                    data: { discount: newDiscount },
                });

                // Обновление счетчика использования
                const promoCode = await this.prisma.promoCode.findUnique({
                    where: { code },
                });

                if (promoCode) {
                    await this.prisma.promoCode.update({
                        where: { id: promoCode.id },
                        data: { usedCount: promoCode.usedCount + 1 },
                    });
                }

                await ctx.reply(
                    this.i18n.t(ctx, "promo_discount_applied", {
                        discount: validation.discount,
                    }),
                );
            } else {
                await ctx.reply(this.i18n.t(ctx, "promo_not_found"));
            }
        } catch (err: any) {
            this.logger.error(`Ошибка при активации промокода: ${err.message}`, err.stack);
            await ctx.reply(this.i18n.t(ctx, "error_occurred"));
        }
    }
}

