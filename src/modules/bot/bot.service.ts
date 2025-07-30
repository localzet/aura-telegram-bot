import {ChatType, Ctx, InjectBot, Start, Update,} from '@localzet/grammy-nestjs'
import {UseFilters, UseInterceptors} from '@nestjs/common'
import debug from 'debug'
import {Bot, Context, InlineKeyboard} from 'grammy'

import {BotName} from "@modules/bot/bot.constants";
import {ResponseTimeInterceptor} from "@common/interceptors";
import {GrammyExceptionFilter} from "@common/filters";
import {PrismaService} from "@common/services/prisma.service";
import {formatExpire, prettyLevel} from "@common/utils";

const log = debug('bot:main')

@Update()
@UseInterceptors(ResponseTimeInterceptor)
@UseFilters(GrammyExceptionFilter)
export class BotService {
    constructor(
        @InjectBot(BotName)
        private readonly bot: Bot<Context>,
        private prisma: PrismaService,
    ) {
        log(`Initializing`, bot.isInited() ? bot.botInfo.first_name : '(pending)')
    }

    @Start()
    @ChatType('private')
    async onStart(@Ctx() ctx: Context): Promise<any> {
        const msg = ctx.message;
        if (!msg) return;

        const telegramId = msg.chat.id;
        if (!telegramId) return;

        const language = msg?.from?.language_code ?? 'ru'
        const username = msg?.chat.username
        const fullName = [msg?.chat.first_name, msg?.chat.last_name].filter(Boolean).join(' ')

        const text = msg.text ?? '';
        const [, payload] = text.startsWith('/start') || text.startsWith('start')
            ? text.split(' ') : [undefined, text];

        let user = await this.prisma.user.findUnique({where: {telegramId}})

        if (!user) {
            // Если есть payload в виде ref_telegramId, пробуем зарегистрировать приглашение
            if (payload && payload.startsWith('ref_')) {
                const inviterTelegramId = Number(payload.split('_')[1]);
                if (!isNaN(inviterTelegramId) && inviterTelegramId !== telegramId) {
                    // Создаем пользователя
                    user = await this.prisma.user.create({
                        data: {telegramId, username, fullName, language}
                    });

                    // Находим пригласителя
                    const inviter = await this.prisma.user.findUnique({where: {telegramId: inviterTelegramId}});
                    if (inviter) {
                        // Создаем запись приглашения
                        await this.prisma.referral.create({
                            data: {
                                inviterId: inviter.id,
                                invitedId: user.id,
                            }
                        });
                        await this.bot.api.sendMessage(
                            inviter.telegramId,
                            `🎉 Пользователь <b>${user.fullName || user.username || user.telegramId}</b> зарегистрировался по вашей ссылке!`,
                            {parse_mode: 'HTML'}
                        );
                    }
                }
            }
            // Если пользователь не создан после попытки приглашения, создаем просто нового
            if (!user) {
                user = await this.prisma.user.create({
                    data: {telegramId, username, fullName, language}
                });
            }
        } else {
            await this.prisma.user.update({
                where: {telegramId},
                data: {username, fullName, language},
            })
        }
        user = await this.prisma.user.findUniqueOrThrow({where: {id: user.id}})

        await ctx.reply(`👋 Добро пожаловать, ${user.fullName || 'пользователь'}!

🔹 Уровень:<code> </code><b>${prettyLevel(user.level)}</b>
🎁 Ваша скидка:<code> ${user.level == 'platinum' ? '100' : user.discount}%</code>
⏳ Подписка:<code> ${user.expireAt ? (formatExpire(user.expireAt)) : 'не активна'}</code>

Выберите действие:`, {
            parse_mode: 'HTML',
            reply_markup: new InlineKeyboard()
                .text('📦 Купить', 'buy')
                .text('✨ Подключиться', 'con')
                .row()
                .text('👥 Пригласить друга', 'ref')
        })
    }


    // @Help()
    // async onHelp(@Ctx() ctx: Context): Promise<any> {
    //     return ctx.reply('Send me any text')
    // }

    // @Admin()
    // @UseGuards(AdminGuard)
    // async onAdminCommand(@Ctx() ctx: Context): Promise<any> {
    //     return ctx.reply('Welcome, Judge')
    // }
}
