import { ArgumentsHost, Catch, ExceptionFilter } from "@nestjs/common";
import { GrammyArgumentsHost } from "@localzet/grammy-nestjs";
import { Context } from "grammy";

@Catch()
export class GrammyExceptionFilter implements ExceptionFilter {
  async catch(exception: Error, host: ArgumentsHost): Promise<void> {
    const grammyHost = GrammyArgumentsHost.create(host);
    const ctx = grammyHost.getContext<Context>();

    await ctx.reply(`Произошла внутренняя ошибка, мы уже решаем эту проблему`);
    console.error(`<b>Error</b>: ${exception.message}`);
  }
}
