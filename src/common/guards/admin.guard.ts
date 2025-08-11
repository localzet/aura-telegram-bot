import { CanActivate, ExecutionContext, Injectable, Logger } from "@nestjs/common";
import {
    GrammyException,
    GrammyExecutionContext,
} from "@localzet/grammy-nestjs";
import { Context } from "grammy";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class AdminGuard implements CanActivate {
    private readonly logger = new Logger(AdminGuard.name);

    constructor(private config: ConfigService) {}

    canActivate(context: ExecutionContext): boolean {
        const ctx = GrammyExecutionContext.create(context);
        const { from } = ctx.getContext<Context>();

        const admin = Number(this.config.getOrThrow<string>("ADMIN_TG_ID"));
        const userId = from?.id;

        this.logger.debug(`Admin ID from config: ${admin}`);
        this.logger.debug(`User ID from message: ${userId}`);

        if (admin !== userId) {
            this.logger.warn(`Access denied for user ${userId}`);
            throw new GrammyException("You are not admin 😡");
        }

        this.logger.log(`Access granted for admin ${userId}`);
        return true;
    }
}
