import { InjectBot } from "@localzet/grammy-nestjs";
import { Module } from "@nestjs/common";
import { Bot, Context } from "grammy";
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
    log("EchoService starting ");
  }
}
