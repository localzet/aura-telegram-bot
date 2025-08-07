import {ChatType, Ctx, InjectBot, Start, Update,} from '@localzet/grammy-nestjs'
import {UseFilters, UseInterceptors} from '@nestjs/common'
import debug from 'debug'
import {Bot, Context, InlineKeyboard} from 'grammy'

import {BotName} from "@modules/bot/bot.constants";
import {ResponseTimeInterceptor} from "@common/interceptors";
import {GrammyExceptionFilter} from "@common/filters";
import {PrismaService} from "@common/services/prisma.service";
import {formatExpire, prettyLevel} from "@common/utils";
import {UserService} from "@common/services/user.service";

const log = debug('bot:main')

@Update()
@UseInterceptors(ResponseTimeInterceptor)
@UseFilters(GrammyExceptionFilter)
export class BotService {
    constructor(
        @InjectBot(BotName)
        private readonly bot: Bot<Context>,
        private prisma: PrismaService,
        private user: UserService,
    ) {
        log(`Initializing bot, status:`, bot.isInited() ? bot.botInfo.first_name : '(pending)')
    }

    @Start()
    @ChatType('private')
    async onStart(@Ctx() ctx: Context): Promise<any> {
        const msg = ctx.message;
        if (!msg) {
            log('onStart: no message in context');
            return;
        }

        const telegramId = msg.chat.id;
        if (!telegramId) {
            log('onStart: no telegramId');
            return;
        }

        const text = msg.text ?? '';
        const [, payload] = (text.startsWith('/start') || text.startsWith('start')) ? text.split(' ') : [undefined, text];

        log(`onStart: telegramId=${telegramId}, payload=${payload}`);

        const exists = await this.prisma.user.findUnique({where: {telegramId}});
        let inviter = undefined;

        if (!exists) {
            if (payload && payload.startsWith('ref_')) {
                const inviterTelegramId = Number(payload.split('_')[1]);
                if (!isNaN(inviterTelegramId) && inviterTelegramId !== telegramId) {
                    log(`onStart: Registering new user with inviter ${inviterTelegramId}`);
                    inviter = await this.prisma.user.findUnique({where: {telegramId: inviterTelegramId}});
                }
            }
        }

        const {tg: user, aura: auraUser} = await this.user.getUser(ctx)
        if (inviter) {
            await this.prisma.referral.create({
                data: {
                    inviterId: inviter.id,
                    invitedId: user.id,
                }
            });
            log(`Referral recorded: inviterId=${inviter.id}, invitedId=${user.id}`);

            await this.bot.api.sendMessage(
                inviter.telegramId,
                `🎉 Пользователь <b>${user.fullName || user.username || user.telegramId}</b> зарегистрировался по вашей ссылке!`,
                {parse_mode: 'HTML'}
            );
            log(`Notification sent to inviter ${inviter.telegramId}`);
        }

        const kb = new InlineKeyboard()
            .text(`📦 ${user.auraId ? 'Продлить' : 'Купить'}`, 'buy');
        if (auraUser) {
            kb.text('✨ Подключиться', 'con')
        }
        kb.row().text('👥 Пригласить друга', 'ref')


        await ctx.reply(`👋 Добро пожаловать, ${user.fullName || 'пользователь'}!
        
        🔹 Уровень:<code> </code><b>${prettyLevel(user.level)}</b>
        ⏳ Подписка:<code> ${auraUser && auraUser.expireAt ? (formatExpire(auraUser.expireAt)) : 'не активна'}</code>
        
        Выберите действие:`, {
            parse_mode: 'HTML',
            reply_markup: kb
        });

        log(`onStart: greeting sent to ${telegramId}`);
    }

    async sendMessage(chatId: string | number, text: string, other?: any | undefined) {
        return this.bot.api.sendMessage(chatId, text, other);
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
