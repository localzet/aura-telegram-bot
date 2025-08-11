import {ChatType, Command, Ctx, InjectBot, Start, Update,} from "@localzet/grammy-nestjs";
import {UseFilters, UseGuards, UseInterceptors} from "@nestjs/common";
import debug from "debug";
import {Bot, Context, InlineKeyboard} from "grammy";

import {BotName} from "@modules/bot/bot.constants";
import {ResponseTimeInterceptor} from "@common/interceptors";
import {GrammyExceptionFilter} from "@common/filters";
import {PrismaService} from "@common/services/prisma.service";
import {formatExpire, prettyLevel} from "@common/utils";
import {UserService} from "@common/services/user.service";
import {ConfigService} from "@nestjs/config";
import {AdminGuard} from "@common/guards";
import {AxiosService} from "@common/axios";

const log = debug("bot:main");

@Update()
@UseInterceptors(ResponseTimeInterceptor)
@UseFilters(GrammyExceptionFilter)
export class BotService {
    constructor(
        @InjectBot(BotName)
        private readonly bot: Bot<Context>,
        private prisma: PrismaService,
        private user: UserService,
        private config: ConfigService,
        private readonly axios: AxiosService,
    ) {
        log(
            "Initializing bot, status:",
            bot.isInited() ? bot.botInfo.first_name : "(pending)",
        );
    }

    @Start()
    @ChatType("private")
    async onStart(@Ctx() ctx: Context): Promise<any> {
        const msg = ctx.message;
        if (!msg) {
            log("onStart: no message in context");
            return;
        }

        const telegramId = msg.chat.id;
        if (!telegramId) {
            log("onStart: no telegramId");
            return;
        }

        const text = msg.text ?? "";
        const [, payload] =
            text.startsWith("/start") || text.startsWith("start")
                ? text.split(" ")
                : [undefined, text];

        log(`onStart: telegramId=${telegramId}, payload=${payload}`);

        const exists = await this.prisma.user.findUnique({where: {telegramId}});
        let inviter = undefined;

        if (!exists) {
            if (payload?.startsWith("ref_")) {
                const inviterTelegramId = Number(payload.split("_")[1]);
                if (!isNaN(inviterTelegramId) && inviterTelegramId !== telegramId) {
                    log(
                        `onStart: Registering new user with inviter ${inviterTelegramId}`,
                    );
                    inviter = await this.prisma.user.findUnique({
                        where: {telegramId: inviterTelegramId},
                    });
                }
            }

            if (!inviter) {
                await ctx.reply(
                    '👋 Добро пожаловать!\n\nК сожалению, на данный момент проект работает в закрытом режиме. Доступ только по приглашениям участников.');
                return;
            }
        }

        const {tg: user, aura: auraUser} = await this.user.getUser(ctx);
        if (inviter) {
            await this.prisma.referral.create({
                data: {
                    inviterId: inviter.id,
                    invitedId: user.id,
                },
            });
            log(`Referral recorded: inviterId=${inviter.id}, invitedId=${user.id}`);
        }

        const kb = new InlineKeyboard().text(
            `📦 ${user.auraId ? "Продлить" : "Купить"}`,
            "buy",
        );
        if (auraUser) {
            const sub = await this.axios.getSubscriptionInfo(auraUser.shortUuid);
            if (sub.isOk && sub.response) {
                kb.webApp(
                    "✨ Подключиться",
                    sub.response?.response.subscriptionUrl ?? "",
                );
            }
        }
        kb.row().text("👥 Пригласить друга", "ref");

        await ctx.reply(
            `👋 Добро пожаловать, ${user.fullName || "пользователь"}!
        
🔹 Уровень:<code> </code><b>${prettyLevel(user.level)}</b>
⏳ Подписка:<code> ${auraUser?.expireAt ? formatExpire(auraUser.expireAt) : "не активна"}</code>
        
Выберите действие:`,
            {
                parse_mode: "HTML",
                reply_markup: kb,
            },
        );

        log(`onStart: greeting sent to ${telegramId}`);
    }

    async sendMessage(
        chatId: string | number,
        text: string,
        other?: any | undefined,
    ) {
        return this.bot.api.sendMessage(chatId, text, other);
    }

    @Command("help")
    @ChatType("private")
    async onHelp(@Ctx() ctx: Context): Promise<any> {
        const msg = ctx.message?.text ?? "";
        const args = msg.split(" ").slice(1).join(" ").trim();

        if (!args) {
            return ctx.reply(
                "📖 Вы можете написать разработчикам через команду:\n" +
                "<code>/help ваш_текст</code>\n\n" +
                "Пример:\n<code>/help Не работает оплата</code>",
                {parse_mode: "HTML"},
            );
        }

        const helpChatId = this.config.getOrThrow<number>("ADMIN_TG_ID");

        await this.bot.api.sendMessage(
            helpChatId,
            "📨 Сообщение от пользователя:\n" +
            `ID: <code>${ctx.from?.id}</code>\n` +
            `Имя: ${ctx.from?.first_name || ""} ${ctx.from?.last_name || ""}\n` +
            (ctx.from?.username ? `@${ctx.from.username}\n` : "") +
            `\n${args}`,
            {parse_mode: "HTML"},
        );
        return ctx.reply("✅ Ваше сообщение отправлено разработчикам.");
    }

    @Command("reply")
    @UseGuards(AdminGuard)
    async onReply(@Ctx() ctx: Context): Promise<any> {
        const msg = ctx.message?.text ?? "";
        const parts = msg.split(" ").slice(1);
        const userId = Number(parts.shift());
        const replyText = parts.join(" ").trim();

        if (!userId || !replyText) {
            return ctx.reply("Использование: /reply <user_id> <текст>");
        }

        try {
            await this.bot.api.sendMessage(userId!, replyText);
            return ctx.reply("✅ Сообщение отправлено пользователю.");
        } catch (e) {
            return ctx.reply(`⚠️ Не удалось отправить сообщение: ${e}`);
        }
    }
}
