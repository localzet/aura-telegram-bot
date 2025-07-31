import {CallbackQuery, Ctx, InjectBot, Update,} from '@localzet/grammy-nestjs'
import {UseFilters, UseInterceptors} from '@nestjs/common'
import debug from 'debug'
import {Bot, Context, InlineKeyboard} from 'grammy'

import {BotName} from "@modules/bot/bot.constants";
import {ResponseTimeInterceptor} from "@common/interceptors";
import {GrammyExceptionFilter} from "@common/filters";
import {PrismaService} from "@common/services/prisma.service";
import {prettyLevel} from "@common/utils";
import {User} from "@prisma/client";

const log = debug('bot:referral')

@Update()
@UseInterceptors(ResponseTimeInterceptor)
@UseFilters(GrammyExceptionFilter)
export class ReferralService {
    constructor(
        @InjectBot(BotName)
        private readonly bot: Bot<Context>,
        private prisma: PrismaService
    ) {
        log('ReferralService initialized');
    }

    @CallbackQuery('ref')
    async onRef(@Ctx() ctx: Context): Promise<any> {
        const telegramId = ctx.from?.id;
        if (!telegramId) {
            log('onRef: no telegramId');
            return;
        }

        const user = await this.prisma.user.findUnique({where: {telegramId}});
        if (!user) {
            log(`onRef: user not found: telegramId=${telegramId}`);
            return;
        }

        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const referredCountThisMonth = await this.prisma.referral.count({
            where: {
                inviterId: user.id,
                createdAt: {gte: startOfMonth},
            },
        });

        const monthlyReferralDiscount = Math.min(referredCountThisMonth * 5, 25);

        let totalDiscount = user.discount ?? 0;
        let note = '';

        switch (user.level) {
            case 'ferrum':
                totalDiscount = Math.min(totalDiscount + monthlyReferralDiscount, 25);
                break;
            case 'argentum':
                totalDiscount = Math.min(totalDiscount + 25 + monthlyReferralDiscount, 50);
                break;
            case 'aurum':
                totalDiscount = Math.min(totalDiscount + 50, 100);
                note = '(фиксированная)';
                break;
            case 'platinum':
                totalDiscount = 100;
                note = '(пожизненно)';
                break;
        }

        const refLink = `https://t.me/${this.bot.botInfo.username}?start=ref_${telegramId}`;

        const kb = new InlineKeyboard()
            .text('📈 Мои приглашённые', 'my_refs');

        if (['aurum', 'platinum'].includes(user.level)) {
            kb.text('🧭 Управление доступом', 'ref_manage');
        }

        await ctx.answerCallbackQuery();
        await ctx.editMessageText(`👥 Пригласите друзей и получите бонус:

🔗 Ваша ссылка: <code>${refLink}</code>
🎁 За каждого друга — по 5% скидки (до 25%)
👤 Приглашено в этом месяце: <code>${referredCountThisMonth}</code>
📉 Текущая скидка: <code>${totalDiscount}%</code> ${note}

<i>Скидка по приглашениям учитывается только за текущий месяц</i>
`, {
            reply_markup: kb,
            parse_mode: 'HTML'
        });

        log(`onRef: user ${telegramId} viewed referral info`);
    }

    @CallbackQuery('my_refs')
    async onMyRefs(@Ctx() ctx: Context): Promise<any> {
        const telegramId = ctx.from?.id;
        if (!telegramId) {
            log('onMyRefs: no telegramId');
            return;
        }

        const user = await this.prisma.user.findUnique({where: {telegramId}});
        if (!user) {
            log(`onMyRefs: user not found: telegramId=${telegramId}`);
            return;
        }

        const referrals = await this.prisma.referral.findMany({
            where: {inviterId: user.id},
            include: {invited: true},
            orderBy: {createdAt: 'desc'},
            take: 20,
        });

        if (!referrals.length) {
            await ctx.answerCallbackQuery('У вас нет приглашённых пользователей.');
            log(`onMyRefs: user ${telegramId} has no referrals`);
            return;
        }

        let text = `📋 Ваши приглашённые:\n\n`;
        for (const ref of referrals) {
            const i = ref.invited;
            text += `• ${i.fullName || i.username || i.telegramId} (${prettyLevel(i.level)})\n`;
        }

        await ctx.answerCallbackQuery();
        await ctx.editMessageText(text);
        log(`onMyRefs: listed referrals for user ${telegramId}`);
    }

    @CallbackQuery('ref_manage')
    async onRefManage(@Ctx() ctx: Context): Promise<any> {
        const telegramId = ctx.from?.id;
        if (!telegramId) {
            log('onRefManage: no telegramId');
            return;
        }

        const user = await this.prisma.user.findUnique({where: {telegramId}});
        if (!user || !['aurum', 'platinum'].includes(user.level)) {
            await ctx.answerCallbackQuery({text: 'Недоступно для вашего уровня'});
            log(`onRefManage: access denied for user ${telegramId}`);
            return;
        }

        const referrals = await this.prisma.referral.findMany({
            where: {inviterId: user.id},
            include: {invited: true},
            orderBy: {createdAt: 'desc'},
            take: 20,
        });

        const kb = new InlineKeyboard();

        for (const ref of referrals) {
            const invited = ref.invited;
            kb.text(`🎓 ${invited.fullName || invited.username || invited.telegramId}`, `promote_${invited.telegramId}`).row();
        }

        const remainingArgentum = 10 - (user.grantedArgentum ?? 0);
        const remainingAurum = user.level === 'platinum' ? 5 - (user.grantedAurum ?? 0) : 10;

        let limits = '';
        if (user.level === 'platinum') {
            limits = `🥇 Золотые: ${remainingAurum} / 5\n🥈 Серебряные: ${remainingArgentum} / 10`;
        } else {
            limits = `🥈 Серебряные: ${remainingArgentum} / 10`;
        }

        await ctx.answerCallbackQuery();
        await ctx.editMessageText(
            `🧭 Управление рефералами:

Вы можете изменить уровень доступа для своих приглашённых.

${limits}

🎓 Для изменения нажмите на имя реферала ниже:
`,
            {reply_markup: kb},
        );
        log(`onRefManage: management panel shown for user ${telegramId}`);
    }

    @CallbackQuery(/^promote_(\d+)$/)
    async onPromote(@Ctx() ctx: Context): Promise<any> {
        const inviterTelegramId = ctx.from?.id;
        if (!inviterTelegramId) return;

        const match = ctx.callbackQuery?.data?.match(/^promote_(\d+)$/);
        const targetTelegramId = match?.[1] ? Number(match[1]) : null;
        if (!targetTelegramId) return;

        log(`@promote — inviter: ${inviterTelegramId}, target: ${targetTelegramId}`);

        const [inviter, target] = await this.prisma.$transaction([
            this.prisma.user.findUnique({where: {telegramId: inviterTelegramId}}),
            this.prisma.user.findUnique({where: {telegramId: targetTelegramId}}),
        ]);

        if (!inviter || !target || !['aurum', 'platinum'].includes(inviter.level)) {
            return ctx.answerCallbackQuery({
                text: 'Недоступно для вашего уровня',
                show_alert: true,
            });
        }

        const referral = await this.prisma.referral.findUnique({
            where: {
                inviterId_invitedId: {
                    inviterId: inviter.id,
                    invitedId: target.id,
                },
            },
        });
        if (!referral) {
            return ctx.answerCallbackQuery({
                text: 'Этот пользователь не является вашим приглашённым',
                show_alert: true,
            });
        }

        if (inviter.level === 'platinum') {
            return ctx.editMessageText(
                `Выберите уровень, который хотите назначить пользователю <b>${target.fullName || target.username || target.telegramId}</b>:`,
                {
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: [
                            [{text: '🥇 Золотой', callback_data: `grant_${targetTelegramId}_aurum`}],
                            [{text: '🥈 Серебряный', callback_data: `grant_${targetTelegramId}_argentum`}],
                            [{text: '🥉 Базовый', callback_data: `grant_${targetTelegramId}_ferrum`}],
                        ],
                    },
                }
            );
        }

        if (inviter.level === 'aurum') {
            return ctx.editMessageText(
                `Выберите уровень, который хотите назначить пользователю <b>${target.fullName || target.username || target.telegramId}</b>:`,
                {
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: [
                            [{text: '🥈 Серебряный', callback_data: `grant_${targetTelegramId}_argentum`}],
                            [{text: '🥉 Базовый', callback_data: `grant_${targetTelegramId}_ferrum`}],
                        ],
                    },
                }
            );
        }
    }

    @CallbackQuery(/^grant_(\d+)_(\w+)$/)
    async onGrantLevel(@Ctx() ctx: Context): Promise<any> {
        const inviterTelegramId = ctx.from?.id;
        if (!inviterTelegramId) return;

        const [, rawTargetId, newLevel] = ctx.callbackQuery?.data?.split('_') || [];
        const targetTelegramId = Number(rawTargetId);

        log(`@grantLevel — inviter: ${inviterTelegramId}, target: ${targetTelegramId}, level: ${newLevel}`);

        const [inviter, target] = await this.prisma.$transaction([
            this.prisma.user.findUnique({where: {telegramId: inviterTelegramId}}),
            this.prisma.user.findUnique({where: {telegramId: targetTelegramId}}),
        ]);

        if (!inviter || !target || !['aurum', 'platinum'].includes(inviter.level)) {
            return ctx.answerCallbackQuery({
                text: 'Недоступно для вашего уровня',
                show_alert: true,
            });
        }

        const referral = await this.prisma.referral.findUnique({
            where: {
                inviterId_invitedId: {
                    inviterId: inviter.id,
                    invitedId: target.id,
                },
            },
        });

        if (!referral) {
            return ctx.answerCallbackQuery({
                text: 'Этот пользователь не является вашим приглашённым',
                show_alert: true
            });
        }

        return this.changeUserLevel(ctx, inviter, target, newLevel as any);
    }

    private async changeUserLevel(
        ctx: Context,
        inviter: User,
        target: User,
        targetLevel: 'ferrum' | 'argentum' | 'aurum'
    ): Promise<any> {
        const previousLevel = target.level;
        const validLevels = ['ferrum', 'argentum', 'aurum', 'platinum'] as const;

        if (previousLevel === targetLevel) {
            return ctx.answerCallbackQuery({text: 'Пользователь уже на этом уровне', show_alert: true});
        }

        if (!validLevels.includes(targetLevel)) {
            return ctx.answerCallbackQuery({text: 'Недопустимый уровень', show_alert: true});
        }

        const isPromote = validLevels.indexOf(targetLevel) > validLevels.indexOf(previousLevel);
        const isDemote = !isPromote;

        const levelField = targetLevel === 'aurum' ? 'grantedAurum'
            : targetLevel === 'argentum' ? 'grantedArgentum'
                : null;

        const previousField = previousLevel === 'aurum' ? 'grantedAurum'
            : previousLevel === 'argentum' ? 'grantedArgentum'
                : null;

        const updates: any[] = [];

        if (isPromote && levelField) {
            const limits = {grantedAurum: 5, grantedArgentum: 10};
            const granted = inviter[levelField] ?? 0;
            const limit = limits[levelField];
            if (granted >= limit) {
                return ctx.answerCallbackQuery({
                    text: `Вы достигли лимита (${limit}) по ${prettyLevel(targetLevel)}`,
                    show_alert: true,
                });
            }
            updates.push(this.prisma.user.update({
                where: {id: inviter.id},
                data: {[levelField]: {increment: 1}},
            }));

            if (previousField) {
                updates.push(this.prisma.user.update({
                    where: {id: inviter.id},
                    data: {[previousField]: {decrement: 1}},
                }));
            }
        }

        if (isDemote && previousField) {
            if (levelField) {
                const limits = {grantedAurum: 5, grantedArgentum: 10};
                const granted = inviter[levelField] ?? 0;
                const limit = limits[levelField];
                if (granted >= limit) {
                    return ctx.answerCallbackQuery({
                        text: `Вы достигли лимита (${limit}) по ${prettyLevel(targetLevel)}`,
                        show_alert: true,
                    });
                }
                updates.push(this.prisma.user.update({
                    where: {id: inviter.id},
                    data: {[levelField]: {increment: 1}},
                }));
            }
            updates.push(this.prisma.user.update({
                where: {id: inviter.id},
                data: {[previousField]: {decrement: 1}},
            }));
        }

        updates.push(this.prisma.user.update({
            where: {id: target.id},
            data: {level: targetLevel},
        }));

        await this.prisma.$transaction(updates);

        log(`@changeUserLevel — ${target.telegramId} ${previousLevel} → ${targetLevel}`);

        await this.bot.api.sendMessage(
            target.telegramId,
            `🔔 Ваш уровень изменён на <b>${prettyLevel(targetLevel)}</b>`,
            {parse_mode: 'HTML'}
        );

        await ctx.editMessageText(
            `✅ Уровень пользователя <b>${target.fullName || target.username || target.telegramId}</b> изменён на <b>${prettyLevel(targetLevel)}</b>.`,
            {parse_mode: 'HTML'}
        );
    }
}