import {HttpException, HttpStatus, Injectable, Logger} from '@nestjs/common';
import {createHmac} from 'crypto';
import {UsersSchema} from '@remnawave/backend-contract';
import {z} from 'zod';
import {BotService} from '@modules/bot/bot.service';
import {ConfigService} from "@nestjs/config";

@Injectable()
export class WebhookService {
    private readonly logger = new Logger(WebhookService.name);

    constructor(
        private readonly botService: BotService,
        private readonly config: ConfigService,
    ) {
    }

    verifySignature(body: any, signature: string, secret: string): boolean {
        const computed = createHmac('sha256', secret)
            .update(JSON.stringify(body))
            .digest('hex');

        return computed === signature;
    }

    async handleEvent(event: string, data: any) {
        this.logger.log(`Received webhook event: ${event}`);

        const [type, name] = event.split('.');

        if (type === 'user') {
            const info: z.infer<typeof UsersSchema> = data;
            const tgId = info.telegramId;

            if (!tgId) {
                this.logger.warn(`⚠️ Пользователь ${info.username} не привязан к Telegram`);
                return;
            }

            const messages: Record<string, string> = {
                // created: '🎉 *[SYSTEM]* Ваша учётная запись успешно создана!',
                // modified: '🛠️ *[SYSTEM]* Настройки вашей учётной записи были обновлены.',
                // deleted: '❌ *[SYSTEM]* Ваша учётная запись была удалена.',
                // revoked: '🚫 *[SYSTEM]* Доступ к подписке *отозван*. Обратитесь в поддержку.',
                disabled: '🔒 *[SYSTEM]* Ваша учётная запись *отключена*. Обратитесь в поддержку.',
                enabled: '✅ *[SYSTEM]* Ваша учётная запись *активирована*. Добро пожаловать!',
                // limited: '📉 *[SYSTEM]* Ваша учётная запись *ограничена*. Некоторые функции могут быть недоступны.',
                expired: '⌛ *[SYSTEM]* Ваша *подписка закончилась*. Пожалуйста, продлите её.',
                // traffic_reset: '🔄 *[SYSTEM]* Ваш трафик был сброшен.',
                expires_in_72_hours: '⏳ *[SYSTEM]* Подписка заканчивается *через 3 дня*. Пожалуйста, продлите её.',
                expires_in_48_hours: '⏳ *[SYSTEM]* Подписка заканчивается *через 2 дня*. Пожалуйста, продлите её.',
                expires_in_24_hours: '⚠️ *[SYSTEM]* Подписка заканчивается *через 24 часа*. Пожалуйста, продлите её.',
                // expired_24_hours_ago: '📆 *[SYSTEM]* Ваша подписка *истекла 24 часа назад*. Продлите её, чтобы восстановить доступ.',
                // first_connected: '🔌 *[SYSTEM]* Вы подключились к сервису впервые — добро пожаловать!',
                // bandwidth_usage_threshold_reached: '📊 *[SYSTEM]* Вы израсходовали большую часть доступного трафика.',
            };

            const message = messages[name];

            if (message) {
                await this.botService.sendMessage(
                    tgId,
                    this.escapeMarkdownV2(message),
                    {parse_mode: 'MarkdownV2'}
                );
                return;
            }
        }

        this.logger.debug(`Unhandled event: ${event}`);
    }

    async handleUpdate(body: any) {
        try {
            await this.botService.handleUpdate(body);
        } catch (e) {
            throw new HttpException('Bad update', HttpStatus.BAD_REQUEST);
        }
    }

    async notifyEvent(message: string): Promise<void> {

        try {
            const adminId = this.config.getOrThrow<number>("EVENTS_TG_ID");
            if (!adminId) {
                this.logger.warn(
                    "EVENTS_TG_ID не задан в конфиге, уведомление не отправлено",
                );
                return;
            }

            await this.botService.sendMessage(
                adminId,
                "```json\n" + this.escapeMarkdownV2(message) + "\n```",
                {parse_mode: "MarkdownV2"}
            );
        } catch (e: any) {
            this.logger.error(
                `Не удалось отправить уведомление разработчику: ${e.message}`,
                e.stack,
            );
        }
    }

    private escapeMarkdownV2(text: string) {
        return text.replace(/([_\[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
    }

}
