import {Module} from '@nestjs/common';
import {WebhookController} from './webhook.controller';
import {WebhookService} from './webhook.service';
import {BotModule} from "@modules/bot/bot.module";

@Module({
    imports: [BotModule],
    controllers: [WebhookController],
    providers: [WebhookService],
    exports: [WebhookService],
})
export class WebhookModule {
}
