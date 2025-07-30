import {CallbackQuery, Ctx, InjectBot, Update,} from '@localzet/grammy-nestjs'
import {UseFilters, UseInterceptors} from '@nestjs/common'
import debug from 'debug'
import {Bot, Context, InlineKeyboard} from 'grammy'

import {BotName} from "@modules/bot/bot.constants";
import {ResponseTimeInterceptor} from "@common/interceptors";
import {GrammyExceptionFilter} from "@common/filters";
import {PrismaService} from "@common/services/prisma.service";

const log = debug('bot:buy')

@Update()
@UseInterceptors(ResponseTimeInterceptor)
@UseFilters(GrammyExceptionFilter)
export class BuyService {
    constructor(
        @InjectBot(BotName)
        private readonly bot: Bot<Context>,
        private prisma: PrismaService
    ) {
    }

    @CallbackQuery('buy')
    async onBuy(@Ctx() ctx: Context): Promise<any> {
        const telegramId = ctx.from?.id
        if (!telegramId) return

        const user = await this.prisma.user.findUniqueOrThrow({where: {telegramId}})

        // <code>1 месяц     </code>          <code> 180р</code>
        // <code>3 месяца    </code><strike>540</strike>   <code> 460р  (-15%)</code>
        // <code>6 месяцев   </code><strike>1080</strike> <code> 860р  (-20%)</code>
        // <code>12 месяцев  </code><strike>2160</strike> <code> 1600р (-25%)</code>

        await ctx.answerCallbackQuery()
        await ctx.editMessageText(`📦 Выберите тариф для покупки:
<code>
1 месяц     180р
3 месяца    460р (-15%)
6 месяцев   860р (-20%)
12 месяцев  1600р (-25%)
</code>
🎁 Ваша скидка: ${user.discount}%

`, {
            reply_markup: new InlineKeyboard()
                .text('1 месяц', 'buy_plan_1')
                .text('3 месяца', 'buy_plan_3')
                .row()
                .text('6 месяцев', 'buy_plan_6')
                .text('12 месяцев', 'buy_plan_12')
                .row()
                .text('Назад', 'back_to_main'),
            parse_mode: 'HTML',
        })
    }
}