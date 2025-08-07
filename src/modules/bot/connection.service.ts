import {CallbackQuery, Ctx, InjectBot, Update,} from '@localzet/grammy-nestjs'
import {UseFilters, UseInterceptors} from '@nestjs/common'
import {Bot, Context} from 'grammy'

import {BotName} from "@modules/bot/bot.constants";
import {ResponseTimeInterceptor} from "@common/interceptors";
import {GrammyExceptionFilter} from "@common/filters";
import {PrismaService} from "@common/services/prisma.service";
import {ConfigService} from "@nestjs/config";
import {UserService} from "@common/services/user.service";

@Update()
@UseInterceptors(ResponseTimeInterceptor)
@UseFilters(GrammyExceptionFilter)
export class ConnectionService {
    constructor(
        @InjectBot(BotName)
        private readonly bot: Bot<Context>,
        private config: ConfigService,
        private prisma: PrismaService,
        private user: UserService,
    ) {
    }

    @CallbackQuery('con')
    async onCon(@Ctx() ctx: Context): Promise<any> {
        const {tg: user, aura: auraUser} = await this.user.getUser(ctx)

    }
}