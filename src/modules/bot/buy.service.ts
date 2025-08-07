import {CallbackQuery, Ctx, InjectBot, On, Update,} from '@localzet/grammy-nestjs'
import {UseFilters, UseInterceptors} from '@nestjs/common'
import {Bot, Context, InlineKeyboard} from 'grammy'

import {BotName} from "@modules/bot/bot.constants";
import {ResponseTimeInterceptor} from "@common/interceptors";
import {GrammyExceptionFilter} from "@common/filters";
import {PrismaService} from "@common/services/prisma.service";
import {getPrise} from "@common/utils/discount";
import {ConfigService} from "@nestjs/config";
import {UserService} from "@common/services/user.service";

@Update()
@UseInterceptors(ResponseTimeInterceptor)
@UseFilters(GrammyExceptionFilter)
export class BuyService {
    constructor(
        @InjectBot(BotName)
        private readonly bot: Bot<Context>,
        private config: ConfigService,
        private prisma: PrismaService,
        private user: UserService,
    ) {
    }

    @CallbackQuery('buy')
    async onBuy(@Ctx() ctx: Context): Promise<any> {
        const {tg: user} = await this.user.getUser(ctx)

        function price(months: number): number {
            const base = 180;
            const discount =
                months >= 12 ? 0.75 :
                    months >= 6 ? 0.8 :
                        months >= 3 ? 0.85 :
                            1;

            return (base * months) * discount;
        }

        await ctx.answerCallbackQuery()
        await ctx.editMessageText(`📦 Выберите тариф для покупки:
        <code>
        1 месяц     ${price(1)}р
        3 месяца    ${price(3)}р (-15%)
        6 месяцев   ${price(6)}р (-20%)
        12 месяцев  ${price(12)}р (-25%)
        </code>
        🎁 Ваша скидка: ${user.discount}%
        
        `, {
            reply_markup: new InlineKeyboard()
                .text('1 месяц', 'buy_plan_1')
                .text('3 месяца', 'buy_plan_3')
                .row()
                .text('6 месяцев', 'buy_plan_6')
                .text('12 месяцев', 'buy_plan_12')
                .row()
                .text('Назад', 'back_to_main'),
            parse_mode: 'HTML',
        })
    }

    @CallbackQuery(/^buy_plan_(\d+)$/)
    async onPlanSelect(@Ctx() ctx: Context): Promise<any> {
        const months = Number(ctx.match?.[1]);
        if (!months) return;

        const {tg: user} = await this.user.getUser(ctx)
        const price = await getPrise(months, user, this.prisma);

        await ctx.answerCallbackQuery();

        const purchase = await this.prisma.purchase.create({
            data: {
                userId: user.id,
                type: 'yookasa',
                status: 'new',
                amount: price,
                currency: 'RUB',
                month: months,
            }
        });

        await this.bot.api.sendInvoice(
            user.telegramId,
            `Подписка на ${months} мес`,
            `Защита интернет-соединения`,
            purchase.id,
            'RUB',
            [{
                label: `Подписка на ${months} мес`,
                amount: price * 100
            }],
            {
                provider_token: this.config.getOrThrow<string>('YOOKASSA_TOKEN'),
                protect_content: true,
            }
        )
    }

    @On('pre_checkout_query')
    async checkout(@Ctx() ctx: Context): Promise<any> {
        await this.user.getUser(ctx)

        const payload = ctx.preCheckoutQuery?.invoice_payload;
        const purchase = await this.prisma.purchase.findUnique({where: {id: payload}});
        if (!purchase || purchase.status !== 'new') {
            await ctx.answerPreCheckoutQuery(false, {error_message: 'Платёж не найден или уже обработан'});
            return;
        }

        await ctx.answerPreCheckoutQuery(true);
        await this.prisma.purchase.update({
            where: {id: purchase.id},
            data: {
                status: 'pending',
            },
        });
    }

    @On('message:successful_payment')
    async successful_payment(@Ctx() ctx: Context): Promise<any> {
        const {aura: auraUser} = await this.user.getUser(ctx)
        const payment = ctx.message?.successful_payment;

        await this.prisma.purchase.update({
            where: {id: payment?.invoice_payload},
            data: {
                status: 'paid',

                telegramId: payment?.telegram_payment_charge_id,
                yookasaId: payment?.provider_payment_charge_id,

                paidAt: new Date(),
            }
        });

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const purchase = await this.prisma.purchase.findUnique({
            where: {id: payment?.invoice_payload},
            select: {month: true}
        });
        const months = purchase?.month ?? null;
        if (!months) return;

        if (auraUser) {
            const current = new Date(auraUser.expireAt || today);
            const base = current > today ? current : today;

            const ends = new Date(base);
            ends.setMonth(ends.getMonth() + months);

            const updateResult = await this.user.updateAuraUser(ctx, ends);

            if (updateResult) {
                await ctx.reply(`✅ Подписка продлена до ${ends.toLocaleDateString('ru-RU')}`);
                return;
            } else {
                await ctx.reply('⚠️ Ошибка продления подписки в системе Aura Continental');
                return;
            }
        } else {
            const ends = new Date(today);
            ends.setMonth(ends.getMonth() + months);

            const createResult = await this.user.createAuraUser(ctx, ends);

            if (createResult) {
                await ctx.reply(`✅ Подписка активирована до ${ends.toLocaleDateString('ru-RU')}`);
                return;
            } else {
                await ctx.reply('⚠️ Ошибка создания пользователя в системе Aura Continental');
                return;
            }
        }
    }
}