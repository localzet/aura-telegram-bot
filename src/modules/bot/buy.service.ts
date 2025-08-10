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
import { getPrise } from "@common/utils/discount";
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

      await ctx.answerCallbackQuery();
      await ctx.editMessageText(
        `📦 Выберите тариф для покупки:
<code>
1 месяц     ${this.calcPrice(1)}р
3 месяца    ${this.calcPrice(3)}р (-15%)
6 месяцев   ${this.calcPrice(6)}р (-20%)
12 месяцев  ${this.calcPrice(12)}р (-25%)
</code>
🎁 Ваша скидка: ${user.discount}%
        `,
        {
          reply_markup: new InlineKeyboard()
            .text("1 месяц", "buy_plan_1")
            .text("3 месяца", "buy_plan_3")
            .row()
            .text("6 месяцев", "buy_plan_6")
            .text("12 месяцев", "buy_plan_12")
            .row()
            .text("Назад", "back_to_main"),
          parse_mode: "HTML",
        },
      );
    } catch (err: any) {
      this.logger.error(
        `Ошибка при отображении тарифов: ${err.message}`,
        err.stack,
      );
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
      const price = await getPrise(months, user, this.prisma);

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
        user.telegramId,
        `Подписка на ${months} мес`,
        "Защита интернет-соединения",
        purchase.id,
        "RUB",
        [
          {
            label: `Подписка на ${months} мес`,
            amount: price * 100,
          },
        ],
        {
          provider_token: this.config.getOrThrow<string>("YOOKASSA_TOKEN"),
          protect_content: true,
        },
      );
    } catch (err: any) {
      this.logger.error(`Ошибка при выборе плана: ${err.message}`, err.stack);
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

      await ctx.answerPreCheckoutQuery(true);
      await this.prisma.purchase.update({
        where: { id: purchase.id },
        data: { status: "pending" },
      });
    } catch (err: any) {
      this.logger.error(`Ошибка при pre_checkout: ${err.message}`, err.stack);
      await ctx.answerPreCheckoutQuery(false, {
        error_message: "Ошибка при обработке платежа",
      });
    }
  }

  @On("message:successful_payment")
  async successfulPayment(@Ctx() ctx: Context): Promise<void> {
    try {
      const { aura: auraUser } = await this.user.getUser(ctx);
      const payment = ctx.message?.successful_payment;

      await this.prisma.purchase.update({
        where: { id: payment?.invoice_payload },
        data: {
          status: "paid",
          telegramId: payment?.telegram_payment_charge_id,
          yookasaId: payment?.provider_payment_charge_id,
          paidAt: new Date(),
        },
      });

      const purchase = await this.prisma.purchase.findUnique({
        where: { id: payment?.invoice_payload },
        select: { month: true },
      });

      const months = purchase?.month;
      if (!months) {
        this.logger.warn(
          `Не найден срок подписки для платежа ${payment?.invoice_payload}`,
        );
        return;
      }

      const success = auraUser
        ? await this.extendSubscription(ctx, auraUser.expireAt, months)
        : await this.createSubscription(ctx, months);

      if (success) {
        await ctx.reply(
          `✅ Подписка активна до ${success.toLocaleDateString("ru-RU")}`,
        );
      } else {
        await ctx.reply(
          "⚠️ Ошибка при активации подписки в системе Aura Continental",
        );
      }
    } catch (err: any) {
      this.logger.error(
        `Ошибка при обработке успешного платежа: ${err.message}`,
        err.stack,
      );
      await ctx.reply("⚠️ Произошла ошибка при активации подписки.");
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
}
