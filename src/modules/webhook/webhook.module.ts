import { Module } from "@nestjs/common";
import { WebhookController } from "./webhook.controller";
import { WebhookService } from "./webhook.service";
import { BotService } from "@modules/bot/bot.service";

@Module({
  controllers: [WebhookController],
  providers: [WebhookService, BotService],
})
export class WebhookModule {}
