import {CanActivate, ExecutionContext, Injectable} from "@nestjs/common";
import {GrammyException, GrammyExecutionContext,} from "@localzet/grammy-nestjs";
import {Context} from "grammy";
import {ConfigService} from "@nestjs/config";

@Injectable()
export class AdminGuard implements CanActivate {
    constructor(
        private config: ConfigService,
    ) {
    }

    canActivate(context: ExecutionContext): boolean {
        const ctx = GrammyExecutionContext.create(context);
        const {from} = ctx.getContext<Context>();
        const admin = this.config.getOrThrow<number>("ADMIN_TG_ID");

        if (admin !== from?.id) {
            throw new GrammyException("You are not admin 😡");
        }

        return true;
    }
}
