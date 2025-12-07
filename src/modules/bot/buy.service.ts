import {
  CallbackQuery,
  Ctx,
  InjectBot,
  On,
  Update,
} from "@localzet/grammy-nestjs";
import { Logger, UseFilters, UseInterceptors } from "@nestjs/common";
import { Bot, Context, InlineKeyboard } from "grammy";
import { BotName } from "@modules/bot/bot.constants";
import { ResponseTimeInterceptor } from "@common/interceptors";
import { GrammyExceptionFilter } from "@common/filters";
import { PrismaService } from "@common/services/prisma.service";
import { getPrice } from "@common/utils/discount";
import { ConfigService } from "@nestjs/config";
import { UserService } from "@common/services/user.service";

@Update()
@UseInterceptors(ResponseTimeInterceptor)
@UseFilters(GrammyExceptionFilter)
export class BuyService {
  private readonly logger = new Logger(BuyService.name);

  constructor(
    @InjectBot(BotName)
    private readonly bot: Bot<Context>,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly user: UserService,
  ) {}

  @CallbackQuery("buy")
  async onBuy(@Ctx() ctx: Context): Promise<void> {
    try {
      const { tg: user } = await this.user.getUser(ctx);

      const { firstDiscount } = await getPrice(1, user, this.prisma);

      await ctx.answerCallbackQuery();
      await ctx.editMessageText(
        `📦 Выберите тариф для покупки:
<code>
1 месяц     ${this.calcPrice(1)}р
3 месяца    ${this.calcPrice(3)}р (-15%)
6 месяцев   ${this.calcPrice(6)}р (-20%)
12 месяцев  ${this.calcPrice(12)}р (-25%)
</code>
🎁 Ваша скидка: ${firstDiscount}%
        `,
        {
          reply_markup: new InlineKeyboard()
            .text("1 месяц", "buy_plan_1")
            .text("3 месяца", "buy_plan_3")
            .row()
            .text("6 месяцев", "buy_plan_6")
            .text("12 месяцев", "buy_plan_12"),
          parse_mode: "HTML",
        },
      );
    } catch (err: any) {
      this.logger.error(
        `Ошибка при отображении тарифов: ${err.message}`,
        err.stack,
      );
      await this.notifyDev(`💥 Ошибка pre_checkout
<b>User:</b> ${ctx.from?.id}
<pre>${err.message}</pre>`);
      await ctx.reply(
        "⚠️ Произошла ошибка при загрузке тарифов. Попробуйте позже.",
      );
    }
  }

  @CallbackQuery(/^buy_plan_(\d+)$/)
  async onPlanSelect(@Ctx() ctx: Context): Promise<void> {
    try {
      const months = Number(ctx.match?.[1]);
      if (!months) return;

      const { tg: user } = await this.user.getUser(ctx);
      const { price } = await getPrice(months, user, this.prisma);

      await ctx.answerCallbackQuery();

      const purchase = await this.prisma.purchase.create({
        data: {
          userId: user.id,
          type: "yookasa",
          status: "new",
          amount: price,
          currency: "RUB",
          month: months,
        },
      });

      await this.bot.api.sendInvoice(
        user.telegramId.toString(),
        `Подписка на ${months} мес`,
        "Защита интернет-соединения",
        purchase.id,
        "RUB",
        [
          {
            label: `Подписка на ${months} мес`,
            amount: Math.round(price * 100),
          },
        ],
        {
          provider_token: this.config.getOrThrow<string>("YOOKASSA_TOKEN"),
          protect_content: true,
        },
      );
    } catch (err: any) {
      this.logger.error(`Ошибка при выборе плана: ${err.message}`, err.stack);
      await this.notifyDev(`💥 Ошибка pre_checkout
<b>User:</b> ${ctx.from?.id}
<pre>${err.message}</pre>`);
      await ctx.reply("⚠️ Не удалось сформировать заказ. Попробуйте позже.");
    }
  }

  @On("pre_checkout_query")
  async checkout(@Ctx() ctx: Context): Promise<void> {
    try {
      await this.user.getUser(ctx);

      const payload = ctx.preCheckoutQuery?.invoice_payload;
      const purchase = await this.prisma.purchase.findUnique({
        where: { id: payload },
      });

      if (!purchase || purchase.status !== "new") {
        await ctx.answerPreCheckoutQuery(false, {
          error_message: "Платёж не найден или уже обработан",
        });
        return;
      }

      const { aura: auraUser } = await this.user.getUser(ctx);
      const months = purchase?.month;
      if (!months) {
        this.logger.warn(`Не найден срок подписки для платежа ${payload}`);
        return;
      }

      const success = auraUser
        ? await this.extendSubscription(ctx, auraUser.expireAt, months)
        : await this.createSubscription(ctx, months);

      if (!success) {
        const errMsg = `❌ Ошибка подготовки аккаунта в Aura
<b>User:</b> ${ctx.from?.id}
<b>Purchase:</b> ${purchase.id}
<b>Months:</b> ${months}`;
        await this.notifyDev(errMsg);

        await ctx.answerPreCheckoutQuery(false, {
          error_message: "Не удалось подготовить аккаунт. Попробуйте позже.",
        });
        return;
      }

      await this.prisma.purchase.update({
        where: { id: purchase.id },
        data: { status: "pending" },
      });
      await ctx.answerPreCheckoutQuery(true);
    } catch (err: any) {
      this.logger.error(`Ошибка при pre_checkout: ${err.message}`, err.stack);
      await this.notifyDev(`💥 Ошибка pre_checkout
<b>User:</b> ${ctx.from?.id}
<pre>${err.message}</pre>`);
      await ctx.answerPreCheckoutQuery(false, {
        error_message: "Ошибка при обработке платежа",
      });
    }
  }

  @On("message:successful_payment")
  async successfulPayment(@Ctx() ctx: Context): Promise<void> {
    try {
      const { aura: auraUser, tg: user } = await this.user.getUser(ctx);
      const payment = ctx.message?.successful_payment;

      const purchase = await this.prisma.purchase.findUnique({
        where: { id: payment?.invoice_payload },
      });

      if (!purchase) {
        this.logger.warn(`Purchase not found: ${payment?.invoice_payload}`);
        await ctx.reply("⚠️ Платеж не найден в системе.");
        return;
      }

      // Используем транзакцию для атомарного обновления Purchase
      await this.prisma.$transaction(async (tx) => {
        await tx.purchase.update({
          where: { id: payment?.invoice_payload },
          data: {
            status: "paid",
            telegramId: payment?.telegram_payment_charge_id,
            yookasaId: payment?.provider_payment_charge_id,
            paidAt: new Date(),
          },
        });
      });

      // Уведомления отправляем после успешного обновления БД
      const ref = await this.prisma.referral.findUnique({
        where: { invitedId: user.id },
        include: { inviter: true },
      });
      if (ref) {
        const ps = await this.prisma.purchase.count({
          where: { userId: user.id },
        });
        if (ps && ps == 1) {
          // Отправка уведомления рефералу - не критично, можно асинхронно
          this.bot.api
            .sendMessage(
              ref.inviter.telegramId.toString(),
              `🎉 Пользователь <b>${user.fullName || user.username || user.telegramId.toString()}</b> зарегистрировался по вашей ссылке!`,
              { parse_mode: "HTML" },
            )
            .catch((err) => {
              this.logger.warn(
                `Не удалось отправить уведомление рефералу: ${err.message}`,
              );
            });
        }
      }

      const expireDate = auraUser?.expireAt
        ? new Date(auraUser.expireAt)
        : null;

      if (expireDate) {
        // Уведомление о продлении подписки
        const userInfo = `${user.fullName || user.username || "Без имени"} (@${user.username || "без username"}, ID: ${user.telegramId})`;
        // Проверяем, была ли у пользователя уже подписка (auraUser существует)
        const wasExtended = !!auraUser;
        const action = wasExtended ? "продлил" : "оформил";
        const notification = `💰 ${action === "продлил" ? "Продление" : "Новая"} подписка

👤 Пользователь: <b>${userInfo}</b>
📅 Уровень: ${user.level}
💵 Сумма: ${purchase.amount.toFixed(2)} ${purchase.currency}
📦 Период: ${purchase.month} ${purchase.month === 1 ? "месяц" : purchase.month < 5 ? "месяца" : "месяцев"}
📆 Подписка до: ${expireDate.toLocaleDateString("ru-RU")}
🆔 Purchase ID: <code>${purchase.id}</code>`;

        await this.notifyDev(notification);

        await ctx.reply(
          `✅ Оплата прошла успешно. Подписка активна до ${expireDate.toLocaleDateString("ru-RU")}`,
        );
      } else {
        await this
          .notifyDev(`⚠️ Оплата прошла, но дата окончания подписки не найдена
<b>User:</b> ${ctx.from?.id}
<b>Purchase:</b> ${payment?.invoice_payload}`);

        await ctx.reply(
          "⚠️ Ошибка при активации подписки в системе Aura Continental",
        );
      }
    } catch (err: any) {
      this.logger.error(
        `Ошибка при обработке успешного платежа: ${err.message}`,
        err.stack,
      );
      await this.notifyDev(`💥 Ошибка при обработке платежа
<b>User:</b> ${ctx.from?.id}
<pre>${err.message}</pre>`);
      await ctx.reply(
        "⚠️ Оплата прошла, но при активации произошла ошибка. Мы решим вопрос в ближайшее время.",
      );
    }
  }

  private calcPrice(months: number): number {
    const base = 180;
    const discount =
      months >= 12 ? 0.75 : months >= 6 ? 0.8 : months >= 3 ? 0.85 : 1;
    return base * months * discount;
  }

  private async extendSubscription(
    ctx: Context,
    expireAt: Date | null,
    months: number,
  ): Promise<Date | null> {
    const today = this.today();
    const current = expireAt ? new Date(expireAt) : today;
    const base = current > today ? current : today;
    const ends = new Date(base);
    ends.setMonth(ends.getMonth() + months);

    return (await this.user.updateAuraUser(ctx, ends)) ? ends : null;
  }

  private async createSubscription(
    ctx: Context,
    months: number,
  ): Promise<Date | null> {
    const today = this.today();
    const ends = new Date(today);
    ends.setMonth(ends.getMonth() + months);
    return (await this.user.createAuraUser(ctx, ends)) ? ends : null;
  }

  private today(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  private async notifyDev(message: string): Promise<void> {
    try {
      const adminId = this.config.getOrThrow<number>("ADMIN_TG_ID");
      if (!adminId) {
        this.logger.warn(
          "ADMIN_TG_ID не задан в конфиге, уведомление не отправлено",
        );
        return;
      }
      await this.bot.api.sendMessage(adminId, message, { parse_mode: "HTML" });
    } catch (e: any) {
      this.logger.error(
        `Не удалось отправить уведомление разработчику: ${e.message}`,
        e.stack,
      );
    }
  }
}
