import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { GrammyExecutionContext, GrammyException } from '@localzet/grammy-nestjs'
import { Context } from 'grammy'

@Injectable()
export class AdminGuard implements CanActivate {
    private readonly ADMIN_IDS = [312211167]

    canActivate(context: ExecutionContext): boolean {
        const ctx = GrammyExecutionContext.create(context)
        const { from } = ctx.getContext<Context>()

        // @ts-expect-error
        const isAdmin = this.ADMIN_IDS.includes(from?.id)
        if (!isAdmin) {
            throw new GrammyException('You are not admin 😡')
        }

        return true
    }
}