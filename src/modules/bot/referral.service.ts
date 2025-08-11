import {CallbackQuery, Ctx, InjectBot, Update} from "@localzet/grammy-nestjs";
import {UseFilters, UseInterceptors} from "@nestjs/common";
import debug from "debug";
import {Bot, Context, InlineKeyboard} from "grammy";

import {BotName} from "@modules/bot/bot.constants";
import {ResponseTimeInterceptor} from "@common/interceptors";
import {GrammyExceptionFilter} from "@common/filters";
import {PrismaService} from "@common/services/prisma.service";
import {prettyLevel} from "@common/utils";
import {User, UserLevel} from "@prisma/client";
import {UserService} from "@common/services/user.service";

const log = debug("bot:referral");
const logError = debug("bot:referral:error");

@Update()
@UseInterceptors(ResponseTimeInterceptor)
@UseFilters(GrammyExceptionFilter)
export class ReferralService {
    constructor(
        @InjectBot(BotName)
        private readonly bot: Bot<Context>,
        private readonly prisma: PrismaService,
        private readonly userService: UserService,
    ) {
        log("ReferralService initialized");
    }

    private async getUserSafe(ctx: Context): Promise<User | null> {
        try {
            const {tg: user} = await this.userService.getUser(ctx);
            return user;
        } catch (error) {
            logError("Failed to get user from context:", error);
            return null;
        }
    }

    @CallbackQuery("ref")
    async onRef(@Ctx() ctx: Context): Promise<void> {
        try {
            const user = await this.getUserSafe(ctx);
            if (!user) {
                await ctx.answerCallbackQuery({
                    text: "Не удалось получить данные пользователя",
                    show_alert: true,
                });
                return;
            }

            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);

            const referredCountThisMonth = await this.prisma.referral.count({
                where: {inviterId: user.id, createdAt: {gte: startOfMonth}},
            });

            const monthlyReferralDiscount = Math.min(referredCountThisMonth * 5, 25);

            let totalDiscount = user.discount ?? 0;
            let note = "";

            switch (user.level) {
                case "ferrum":
                    totalDiscount = Math.min(totalDiscount + monthlyReferralDiscount, 25);
                    break;
                case "argentum":
                    totalDiscount = Math.min(
                        totalDiscount + 25 + monthlyReferralDiscount,
                        50,
                    );
                    break;
                case "aurum":
                    totalDiscount = Math.min(totalDiscount + 50, 100);
                    note = "(фиксированная)";
                    break;
                case "platinum":
                    totalDiscount = 100;
                    note = "(пожизненно)";
                    break;
            }

            const refLink = `https://t.me/${this.bot.botInfo.username}?start=ref_${user.telegramId}`;
            const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent(
                'Присоединяйся! Получи бонусы по моей ссылке'
            )}`;

            const kb = new InlineKeyboard()
                .text('📈 Приглашённые', 'my_refs')
                .url('📤 Пригласить', shareUrl)
                .row()

            if (['aurum', 'platinum'].includes(user.level)) {
                kb.text('🧭 Управление', 'ref_manage');
            }
            kb.text('📜 Об уровнях', 'ref_levels');

            const persistDiscount: Record<UserLevel, string> = {
                platinum: 'Поздравляем! Это значит, что сервис для вас абсолютно бесплатен, навсегда 🥳\n\n<i>Платинум - особый уровень, который назначается исключительно разработчиками. Можно сказать, что вы - часть закрытого сообщества 😎\nВы также можете пригласить до 5 друзей в "Золотой" уровень, до 10 - в "Серебряный". </i>',
                aurum: 'Поздравляем! Это значит, что ваша постоянная скидка - 50% 🥳',
                argentum: 'Поздравляем! Это значит, что ваша постоянная скидка - 25% 🥳\n И вы можете увеличить свою скидку до 50%, приглашая друзей (по 5% за друга)',
                ferrum: 'Это базовый уровень, но вы можете увеличить свою скидку до 25%, приглашая друзей (по 5% за друга)',
            };

            await ctx.answerCallbackQuery();
            await ctx.editMessageText(
                `👥 Пригласите друзей и получите бонус:

Ваш уровень: <b>${prettyLevel(user.level)}</b>
${persistDiscount[user.level]}

🔗 Ваша ссылка: <code>${refLink}</code>
👤 Приглашено в этом месяце: <code>${referredCountThisMonth}</code>
📉 Текущая скидка: <code>${totalDiscount}%</code> ${note}

<i>Важно! Скидка даётся только за друзей, приглашенных в текущем месяце (каждый месяц счетчик сбрасывается)</i>`,
                {reply_markup: kb, parse_mode: 'HTML'},
            );

            log(`onRef: user ${user.telegramId} viewed referral info`);
        } catch (error) {
            logError("onRef error:", error);
            await ctx.answerCallbackQuery({
                text: "Произошла ошибка при получении реферальной информации",
                show_alert: true,
            });
        }
    }

    @CallbackQuery("ref_levels")
    async onRefLevels(@Ctx() ctx: Context): Promise<void> {
        const description =
            "\nВ Aura Network мы разработали прогрессивную реферальную систему. " +
            "Пользователи делятся на несколько уровней, от этого зависит ваша скидка и не только.\n";

        const levels = `
<b>Золотой:</b>
- Скидка 50% навсегда
- Возможность пригласить до 10 друзей в "Серебряный" уровень
ℹ️ Можно выиграть в конкурсах и соревнованиях в виде промокода

<b>Серебряный:</b>
- Скидка 25% навсегда
- +5% скидки за каждого приглашенного друга, до 25% (суммируется с постоянной скидкой)
ℹ️ Может назначаться за активность или иные достижения

<b>Базовый:</b>
- +5% скидки за каждого приглашенного друга, до 25%
ℹ️ Начальный уровень каждого пользователя
`;

        const kb = new InlineKeyboard().text("⬅️ Назад", "ref");

        await ctx.answerCallbackQuery();
        await ctx.editMessageText(`${description}\n${levels}`, {
            reply_markup: kb,
            parse_mode: "HTML",
        });
    }

    @CallbackQuery("my_refs")
    async onMyRefs(@Ctx() ctx: Context): Promise<void> {
        try {
            const user = await this.getUserSafe(ctx);
            if (!user) {
                await ctx.answerCallbackQuery({
                    text: "Не удалось получить данные пользователя",
                    show_alert: true,
                });
                return;
            }

            const referrals = await this.prisma.referral.findMany({
                where: {inviterId: user.id},
                include: {invited: true},
                orderBy: {createdAt: "desc"},
                take: 20,
            });

            if (!referrals.length) {
                await ctx.answerCallbackQuery("У вас нет приглашённых пользователей.");
                log(`onMyRefs: user ${user.telegramId} has no referrals`);
                return;
            }

            const text =
                "📋 Ваши приглашённые:\n\n" +
                referrals
                    .map((ref) => {
                        const i = ref.invited;
                        return `• ${i.fullName || i.username || i.telegramId} (${prettyLevel(i.level)})`;
                    })
                    .join("\n");

            await ctx.answerCallbackQuery();
            await ctx.editMessageText(text);

            log(`onMyRefs: listed referrals for user ${user.telegramId}`);
        } catch (error) {
            logError("onMyRefs error:", error);
            await ctx.answerCallbackQuery({
                text: "Ошибка при получении списка приглашённых",
                show_alert: true,
            });
        }
    }

    @CallbackQuery("ref_manage")
    async onRefManage(@Ctx() ctx: Context): Promise<void> {
        try {
            const user = await this.getUserSafe(ctx);
            if (!user) {
                await ctx.answerCallbackQuery({
                    text: "Не удалось получить данные пользователя",
                    show_alert: true,
                });
                return;
            }

            if (!["aurum", "platinum"].includes(user.level)) {
                await ctx.answerCallbackQuery({text: "Недоступно для вашего уровня"});
                log(`onRefManage: access denied for user ${user.telegramId}`);
                return;
            }

            const referrals = await this.prisma.referral.findMany({
                where: {inviterId: user.id},
                include: {invited: true},
                orderBy: {createdAt: "desc"},
                take: 20,
            });

            const kb = new InlineKeyboard();

            for (const ref of referrals) {
                const invited = ref.invited;
                kb.text(
                    `🎓 ${invited.fullName || invited.username || invited.telegramId}`,
                    `promote_${invited.telegramId}`,
                ).row();
            }

            const remainingArgentum = 10 - (user.grantedArgentum ?? 0);
            const remainingAurum =
                user.level === "platinum" ? 5 - (user.grantedAurum ?? 0) : 10;

            const limits =
                user.level === "platinum"
                    ? `🥇 Золотые: ${remainingAurum} / 5\n🥈 Серебряные: ${remainingArgentum} / 10`
                    : `🥈 Серебряные: ${remainingArgentum} / 10`;

            await ctx.answerCallbackQuery();
            await ctx.editMessageText(
                `🧭 Управление рефералами:

Вы можете изменить уровень доступа для своих приглашённых.

${limits}

🎓 Для изменения нажмите на имя реферала ниже:
`,
                {reply_markup: kb},
            );

            log(`onRefManage: management panel shown for user ${user.telegramId}`);
        } catch (error) {
            logError("onRefManage error:", error);
            await ctx.answerCallbackQuery({
                text: "Ошибка при открытии панели управления",
                show_alert: true,
            });
        }
    }

    @CallbackQuery(/^promote_(\d+)$/)
    async onPromote(@Ctx() ctx: Context): Promise<void> {
        try {
            const user = await this.getUserSafe(ctx);
            if (!user) {
                await ctx.answerCallbackQuery({
                    text: "Не удалось получить данные пользователя",
                    show_alert: true,
                });
                return;
            }

            const match = ctx.callbackQuery?.data?.match(/^promote_(\d+)$/);
            const targetTelegramId = match?.[1] ? Number(match[1]) : null;
            if (!targetTelegramId) return;

            log(
                `@promote — inviter: ${user.telegramId}, target: ${targetTelegramId}`,
            );

            const target = await this.prisma.user.findUnique({
                where: {telegramId: targetTelegramId},
            });

            if (!target || !["aurum", "platinum"].includes(user.level)) {
                await ctx.answerCallbackQuery({
                    text: "Недоступно для вашего уровня",
                    show_alert: true,
                });
                return;
            }

            const referral = await this.prisma.referral.findUnique({
                where: {
                    inviterId_invitedId: {inviterId: user.id, invitedId: target.id},
                },
            });

            if (!referral) {
                await ctx.answerCallbackQuery({
                    text: "Этот пользователь не является вашим приглашённым",
                    show_alert: true,
                });
                return;
            }

            const buildButtons = (buttons: { text: string; data: string }[]) => ({
                inline_keyboard: buttons.map((btn) => [
                    {text: btn.text, callback_data: btn.data},
                ]),
            });

            await ctx.answerCallbackQuery();

            if (user.level === "platinum") {
                await ctx.editMessageText(
                    `Выберите уровень, который хотите назначить пользователю <b>${target.fullName || target.username || target.telegramId}</b>:`,
                    {
                        parse_mode: "HTML",
                        reply_markup: buildButtons([
                            {text: "🥇 Золотой", data: `grant_${targetTelegramId}_aurum`},
                            {
                                text: "🥈 Серебряный",
                                data: `grant_${targetTelegramId}_argentum`,
                            },
                            {text: "🥉 Базовый", data: `grant_${targetTelegramId}_ferrum`},
                        ]),
                    },
                );
                return;
            }

            if (user.level === "aurum") {
                await ctx.editMessageText(
                    `Выберите уровень, который хотите назначить пользователю <b>${target.fullName || target.username || target.telegramId}</b>:`,
                    {
                        parse_mode: "HTML",
                        reply_markup: buildButtons([
                            {
                                text: "🥈 Серебряный",
                                data: `grant_${targetTelegramId}_argentum`,
                            },
                            {text: "🥉 Базовый", data: `grant_${targetTelegramId}_ferrum`},
                        ]),
                    },
                );
                return;
            }
        } catch (error) {
            logError("onPromote error:", error);
            await ctx.answerCallbackQuery({
                text: "Ошибка при выборе уровня",
                show_alert: true,
            });
        }
    }

    @CallbackQuery(/^grant_(\d+)_(ferrum|argentum|aurum)$/)
    async changeUserLevel(@Ctx() ctx: Context): Promise<void> {
        try {
            const user = await this.getUserSafe(ctx);
            if (!user) {
                await ctx.answerCallbackQuery({
                    text: "Не удалось получить данные пользователя",
                    show_alert: true,
                });
                return;
            }

            const match = ctx.callbackQuery?.data?.match(
                /^grant_(\d+)_(ferrum|argentum|aurum)$/,
            );
            if (!match) {
                await ctx.answerCallbackQuery({
                    text: "Некорректные данные",
                    show_alert: true,
                });
                return;
            }

            const targetTelegramId = Number(match[1]);
            const newLevel = match[2] as UserLevel;

            const targetUser = await this.prisma.user.findUnique({
                where: {telegramId: targetTelegramId},
            });
            if (!targetUser) {
                await ctx.answerCallbackQuery({
                    text: "Пользователь не найден",
                    show_alert: true,
                });
                return;
            }

            // Проверка прав текущего пользователя на назначение уровня
            if (!["aurum", "platinum"].includes(user.level)) {
                await ctx.answerCallbackQuery({
                    text: "Недостаточно прав для изменения уровня",
                    show_alert: true,
                });
                return;
            }

            // Логика лимитов: platinum может назначить aurum (5), argentum (10)
            // aurum — только argentum (10)
            if (user.level === "aurum" && newLevel === "aurum") {
                await ctx.answerCallbackQuery({
                    text: "Вы не можете назначить этот уровень",
                    show_alert: true,
                });
                return;
            }

            // Проверка лимитов назначений
            const grantedField =
                newLevel === "aurum" ? "grantedAurum" : "grantedArgentum";
            const maxLimit =
                newLevel === "aurum" ? (user.level === "platinum" ? 5 : 0) : 10;
            const grantedCount = user[grantedField] ?? 0;

            if (grantedCount >= maxLimit) {
                await ctx.answerCallbackQuery({
                    text: `Достигнут лимит назначений для уровня ${prettyLevel(newLevel)}`,
                    show_alert: true,
                });
                return;
            }

            // Обновляем пользователя
            await this.prisma.user.update({
                where: {telegramId: targetTelegramId},
                data: {level: newLevel},
            });

            // Обновляем счетчик назначений у inviter
            const updateData: Partial<User> = {};
            updateData[grantedField] = grantedCount + 1;

            await this.prisma.user.update({
                where: {id: user.id},
                data: updateData,
            });

            await ctx.answerCallbackQuery({
                text: `Пользователю назначен уровень ${prettyLevel(newLevel)}`,
            });

            await ctx.editMessageText(
                `✅ Пользователю <b>${targetUser.fullName || targetUser.username || targetUser.telegramId}</b> успешно назначен уровень <b>${prettyLevel(newLevel)}</b>.`,
                {parse_mode: "HTML"},
            );

            log(
                `User ${user.telegramId} granted level ${newLevel} to ${targetTelegramId}`,
            );
        } catch (error) {
            logError("changeUserLevel error:", error);
            await ctx.answerCallbackQuery({
                text: "Ошибка при изменении уровня",
                show_alert: true,
            });
        }
    }
}
