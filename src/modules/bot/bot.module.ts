import { InjectBot } from "@localzet/grammy-nestjs";
import { Module } from "@nestjs/common";
import { Bot, Context, GrammyError, HttpError } from "grammy";
import debug from "debug";
import { BotName } from "@modules/bot/bot.constants";
import { BotService } from "@modules/bot/bot.service";
import { ResponseTime } from "@common/middleware";
import { ReferralService } from "@modules/bot/referral.service";
import { BuyService } from "@modules/bot/buy.service";

const log = debug("bot:bot.module");

@Module({
  controllers: [],
  providers: [BotService, ReferralService, BuyService],
  exports: [BotService],
})
export class BotModule {
  constructor(@InjectBot(BotName) private readonly bot: Bot<Context>) {
    this.bot.use(ResponseTime);
    this.bot.catch((err) => {
      const ctx = err.ctx;
      console.error(`Error while handling update ${ctx.update.update_id}:`);
      const e = err.error;
      if (e instanceof GrammyError) {
        console.error("Error in request:", e.description);
      } else if (e instanceof HttpError) {
        console.error("Could not contact Telegram:", e);
      } else {
        console.error("Unknown error:", e);
      }
    });
    log("EchoService starting ");
  }
}
