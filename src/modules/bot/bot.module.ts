import { InjectBot } from "@localzet/grammy-nestjs";
import { Logger, Module } from "@nestjs/common";
import { Bot, Context, GrammyError, HttpError } from "grammy";
import debug from "debug";
import { BotName } from "@modules/bot/bot.constants";
import { BotService } from "@modules/bot/bot.service";
import { ResponseTime } from "@common/middleware";
import { ReferralService } from "@modules/bot/referral.service";
import { BuyService } from "@modules/bot/buy.service";
import { PromoService } from "@modules/bot/promo.service";
import { AdminModule } from "@modules/admin/admin.module";
import { AdminConfigService } from "@modules/admin/admin-config.service";

const log = debug("bot:bot.module");

@Module({
  controllers: [],
  imports: [AdminModule],
  providers: [BotService, ReferralService, BuyService, PromoService, AdminConfigService],
  exports: [BotService],
})
export class BotModule {
  private readonly logger = new Logger(BotModule.name);

  constructor(@InjectBot(BotName) private readonly bot: Bot<Context>) {
    this.bot.use(ResponseTime);
    this.bot.catch((err) => {
      const ctx = err.ctx;
      this.logger.error(`Error while handling update ${ctx.update.update_id}:`, err.error);
      const e = err.error;
      if (e instanceof GrammyError) {
        this.logger.error(`Error in request: ${e.description}`, e.stack);
      } else if (e instanceof HttpError) {
        this.logger.error("Could not contact Telegram:", e);
      } else {
        this.logger.error("Unknown error:", e);
      }
    });
    log("EchoService starting ");
  }
}
