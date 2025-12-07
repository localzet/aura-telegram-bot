import { ArgumentsHost, Catch, ExceptionFilter, Logger } from '@nestjs/common'
import { GrammyArgumentsHost } from '@localzet/grammy-nestjs'
import { Context } from 'grammy'

@Catch()
export class GrammyExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(GrammyExceptionFilter.name);

    async catch(exception: Error, host: ArgumentsHost): Promise<void> {
        const grammyHost = GrammyArgumentsHost.create(host)
        const ctx = grammyHost.getContext<Context>()

        this.logger.error(`Error in Grammy handler: ${exception.message}`, exception.stack);
        await ctx.reply(`Произошла внутренняя ошибка, мы уже решаем эту проблему`)
    }
}