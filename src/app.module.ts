import {ConfigModule} from "@nestjs/config";
import {Global, Logger, Module} from "@nestjs/common";

import {validateEnvConfig} from "@common/utils/validate-env-config";
import {configSchema, Env} from "@common/config";
import {AxiosModule} from "@common/axios/axios.module";
import {BotModule} from "@modules/bot/bot.module";
import {NestjsGrammyModule} from "@localzet/grammy-nestjs";
import {BotName} from "@modules/bot/bot.constants";
import {PrismaService} from "@common/services/prisma.service";
import {UserService} from "@common/services/user.service";
import {WebhookModule} from "@modules/webhook/webhook.module";
import {AdminModule} from "@modules/admin/admin.module";

const logger = new Logger("bot:app.module");

@Global()
@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: ".env",
            validate: (config) => validateEnvConfig<Env>(configSchema, config),
        }),
        NestjsGrammyModule.forRoot({
            botName: BotName,
            token: process.env.TELEGRAM_TOKEN!,
            include: [BotModule, WebhookModule],
            pollingOptions: {
                allowed_updates: ["message", "callback_query", "pre_checkout_query"],
            },
            useWebhook: true,
        }),
        BotModule,
        WebhookModule,
        AdminModule,
        AxiosModule,
    ],
    providers: [PrismaService, UserService],
    exports: [PrismaService, UserService],
})
export class AppModule {
    constructor() {
        logger.debug("Initializing AppModule");
    }
}
