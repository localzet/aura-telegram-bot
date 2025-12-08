import {
  ChatType,
  Command,
  Ctx,
  InjectBot,
  Start,
  Update,
} from "@localzet/grammy-nestjs";
import { Logger, UseFilters, UseGuards, UseInterceptors } from "@nestjs/common";
import debug from "debug";
import { Bot, Context, InlineKeyboard } from "grammy";

import { BotName } from "@modules/bot/bot.constants";
import { ResponseTimeInterceptor } from "@common/interceptors";
import { GrammyExceptionFilter } from "@common/filters";
import { PrismaService } from "@common/services/prisma.service";
import { formatExpire, prettyLevel } from "@common/utils";
import { UserService } from "@common/services/user.service";
import { ConfigService } from "@nestjs/config";
import { AdminGuard } from "@common/guards";
import { AxiosService } from "@common/axios";
import { User } from "@prisma/client";
import { I18nService } from "@common/i18n";
import { AdminConfigService } from "@modules/admin/admin-config.service";

const log = debug("bot:main");

@Update()
@UseInterceptors(ResponseTimeInterceptor)
@UseFilters(GrammyExceptionFilter)
export class BotService {
  private readonly logger = new Logger(BotService.name);

  constructor(
    @InjectBot(BotName)
    private readonly bot: Bot<Context>,
    private prisma: PrismaService,
    private user: UserService,
    private config: ConfigService,
    private readonly axios: AxiosService,
    private readonly i18n: I18nService,
    private readonly adminConfig: AdminConfigService,
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

    const exists = await this.prisma.user.findUnique({
      where: { telegramId: BigInt(telegramId) },
    });
    let inviter = undefined;

    // Проверка закрытого режима
    const closedModeEnabled = await this.isClosedModeEnabled();

    if (!exists) {
      if (payload?.startsWith("ref_")) {
        const inviterTelegramId = parseInt(payload.split("_")[1] || "", 10);
        if (
          !isNaN(inviterTelegramId) &&
          inviterTelegramId !== Number(telegramId)
        ) {
          inviter = await this.prisma.user.findUnique({
            where: { telegramId: BigInt(inviterTelegramId) },
          });
        }
      }
      if (closedModeEnabled && !inviter) {
        await ctx.reply(this.i18n.t(ctx, "closed_mode"));
        return;
      }
    } else {
      const existingReferral = await this.prisma.referral.findUnique({
        where: { invitedId: exists.id },
      });
      if (!existingReferral) {
        if (payload?.startsWith("ref_")) {
          const inviterTelegramId = parseInt(payload.split("_")[1] || "", 10);
          if (
            !isNaN(inviterTelegramId) &&
            inviterTelegramId !== Number(telegramId)
          ) {
            inviter = await this.prisma.user.findUnique({
              where: { telegramId: BigInt(inviterTelegramId) },
            });
          }
        }
        if (closedModeEnabled && !inviter) {
          await ctx.reply(this.i18n.t(ctx, "closed_mode"));
          return;
        }
      }
    }

    let user, auraUser;
    try {
      const result = await this.user.getUser(ctx);
      user = result.tg;
      auraUser = result.aura;
    } catch (error: any) {
      if (error.message === "BLACKLISTED") {
        await ctx.reply(this.i18n.t(ctx, "blacklisted"));
        return;
      }
      throw error;
    }
    const isNewUser = !exists;

    if (inviter) {
      const existing = await this.prisma.referral.findUnique({
        where: { invitedId: user.id },
      });
      if (!existing) {
        // Используем транзакцию для создания реферала
        await this.prisma.$transaction(async (tx) => {
          await tx.referral.create({
            data: {
              inviterId: inviter.id,
              invitedId: user.id,
            },
          });
        });
        log(`Referral recorded: inviterId=${inviter.id}, invitedId=${user.id}`);
      }
    }

    // Уведомление о новом пользователе (асинхронно, не блокирует ответ)
    if (isNewUser) {
      this.notifyNewUser(user, inviter || undefined).catch((err) => {
        this.logger.warn(
          `Не удалось отправить уведомление о новом пользователе: ${err.message}`,
        );
      });
    }

    const kb = new InlineKeyboard();

    if (user.level !== "platinum") {
      kb.text(
        `📦 ${user.auraId ? this.i18n.t(ctx, "extend") : this.i18n.t(ctx, "buy")}`,
        "buy",
      );
    }
    if (auraUser) {
      const sub = await this.axios.getSubscriptionInfo(auraUser.shortUuid);
      if (
        sub.isOk &&
        sub.response &&
        sub.response?.response.subscriptionUrl &&
        sub.response?.response.user.userStatus !== "EXPIRED" &&
        sub.response?.response.user.userStatus !== "DISABLED"
      ) {
        kb.webApp(
          this.i18n.t(ctx, "connect"),
          sub.response?.response.subscriptionUrl ?? "",
        );
      }
    }
    kb.row().text(this.i18n.t(ctx, "invite_friend"), "ref");

    await ctx.reply(
      `${this.i18n.t(ctx, "greeting", { name: user.fullName || this.i18n.t(ctx, "welcome").replace("👋 ", "") })}
        
${this.i18n.t(ctx, "level")}<code> </code><b>${prettyLevel(user.level)}</b>
${this.i18n.t(ctx, "subscription")}<code> ${auraUser?.expireAt ? formatExpire(auraUser.expireAt) : this.i18n.t(ctx, "not_active")}</code>
        
${this.i18n.t(ctx, "select_action")}`,
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
      return ctx.reply(this.i18n.t(ctx, "help_command"), {
        parse_mode: "HTML",
      });
    }

    const helpChatId = this.config.getOrThrow<number>("ADMIN_TG_ID");

    await this.bot.api.sendMessage(
      helpChatId,
      "📨 Сообщение от пользователя:\n" +
        `ID: <code>${ctx.from?.id}</code>\n` +
        `Имя: ${ctx.from?.first_name || ""} ${ctx.from?.last_name || ""}\n` +
        (ctx.from?.username ? `@${ctx.from.username}\n` : "") +
        `\n${args}`,
      { parse_mode: "HTML" },
    );
    return ctx.reply(this.i18n.t(ctx, "help_sent"));
  }

  @Command("reply")
  @UseGuards(AdminGuard)
  async onReply(@Ctx() ctx: Context): Promise<any> {
    const msg = ctx.message?.text ?? "";
    const parts = msg.split(" ").slice(1);
    const userId = Number(parts.shift());
    const replyText = parts.join(" ").trim();

    if (!userId || !replyText) {
      return ctx.reply(this.i18n.t(ctx, "reply_usage"));
    }

    try {
      await this.bot.api.sendMessage(userId!, replyText);
      return ctx.reply(this.i18n.t(ctx, "reply_sent"));
    } catch (e) {
      return ctx.reply(this.i18n.t(ctx, "reply_error", { error: String(e) }));
    }
  }

  async handleUpdate(body: any) {
    await this.bot.handleUpdate(body);
  }

  private async isClosedModeEnabled(): Promise<boolean> {
    try {
      const value = await this.adminConfig.getConfigValue(
        "CLOSED_MODE_ENABLED",
      );
      if (value !== null) {
        return value === "true";
      }
      return this.config.get<boolean>("CLOSED_MODE_ENABLED", false);
    } catch (error) {
      return this.config.get<boolean>("CLOSED_MODE_ENABLED", false);
    }
  }

  private async notifyNewUser(user: User, inviter?: User): Promise<void> {
    try {
      const adminId = this.config.get<number>("ADMIN_TG_ID");
      if (!adminId) {
        this.logger.warn(
          "ADMIN_TG_ID не задан в конфиге, уведомление о новом пользователе не отправлено",
        );
        return;
      }

      const userName = user.fullName || "Без имени";
      const userUsername = user.username ? `@${user.username}` : "без username";
      const inviterInfo = inviter
        ? `\n\n👥 <b>Приглашен пользователем:</b>\n   ${inviter.fullName || inviter.username || inviter.telegramId.toString()}\n   ID: <code>${inviter.telegramId}</code>`
        : "";

      const notification = `🆕 <b>Новый пользователь</b>

👤 <b>Пользователь:</b> ${userName}
   ${userUsername}
   ID: <code>${user.telegramId}</code>

📅 <b>Уровень:</b> ${prettyLevel(user.level)}

🌐 <b>Язык:</b> ${user.language}${inviterInfo}

🆔 <b>User ID:</b> <code>${user.id}</code>`;

      await this.bot.api.sendMessage(adminId, notification, {
        parse_mode: "HTML",
      });
    } catch (e: any) {
      this.logger.error(
        `Не удалось отправить уведомление о новом пользователе: ${e.message}`,
        e.stack,
      );
    }
  }
}
