import {Injectable} from "@nestjs/common";
import {AxiosService} from "@common/axios";
import {PrismaService} from "@common/services/prisma.service";
import {Context} from "grammy";
import debug from "debug";
import {User} from "@prisma/client";
import {RuntimeException} from "@nestjs/core/errors/exceptions";
import {ConfigService} from "@nestjs/config";
import {z} from "zod";
import {UsersSchema} from "@remnawave/backend-contract";

const log = debug('aura:user')

@Injectable()
export class UserService {
    constructor(
        private config: ConfigService,
        private prisma: PrismaService,
        private axios: AxiosService,
    ) {
    }

    async getTgUser(ctx: Context): Promise<User> {
        const msg = ctx.message ?? ctx.callbackQuery?.message;
        if (!msg) {
            throw new RuntimeException('no message in context');
        }

        const telegramId = msg.chat.id;
        if (!telegramId) {
            throw new RuntimeException('no telegramId');
        }

        const language = msg?.from?.language_code ?? 'ru';
        const username = msg?.chat.username;
        const fullName = [msg?.chat.first_name, msg?.chat.last_name].filter(Boolean).join(' ');

        return this.prisma.user.upsert({
            where: {telegramId},
            create: {telegramId, username, fullName, language},
            update: {username, fullName, language},
        });
    }

    async getAuraUser(ctx: Context): Promise<z.infer<typeof UsersSchema> | undefined> {
        const user = await this.updateAuraUser(ctx);
        if (user) return user;

        const msg = ctx.message ?? ctx.callbackQuery?.message;
        if (!msg) {
            throw new RuntimeException('no message in context');
        }

        const telegramId = msg.chat.id;
        if (!telegramId) {
            throw new RuntimeException('no telegramId');
        }

        const users = await this.axios.getUsersByTelegramId(telegramId)
        if (!users.isOk || !users.response) return undefined;

        const auraId = users.response?.response[0].uuid;

        const language = msg?.from?.language_code ?? 'ru';
        const username = msg?.chat.username;
        const fullName = [msg?.chat.first_name, msg?.chat.last_name].filter(Boolean).join(' ');

        await this.prisma.user.upsert({
            where: {telegramId},
            create: {telegramId, username, fullName, language, auraId},
            update: {username, fullName, language, auraId},
        });

        return await this.updateAuraUser(ctx);
    }

    async getUser(ctx: Context): Promise<{
        tg: User,
        aura: z.infer<typeof UsersSchema> | undefined
    }> {
        return {
            tg: await this.getTgUser(ctx),
            aura: await this.getAuraUser(ctx),
        };
    }

    async createAuraUser(ctx: Context, expireAt: Date): Promise<z.infer<typeof UsersSchema> | undefined> {
        const tg_user = await this.getTgUser(ctx);

        const activeInternalSquads = (this.config.get<string>('AURA_DEFAULT_SQUADS') ?? '')
            .split(',')
            .map(id => id.trim())
            .filter(Boolean);

        const aura_user = await this.axios.createUser({
            expireAt: expireAt,
            username: `tg_${tg_user.telegramId}`,
            status: "ACTIVE",
            shortUuid: tg_user.id,
            description: `${tg_user.fullName} @${tg_user.username} id:${tg_user.telegramId}:${tg_user.id}`,
            tag: tg_user.level,
            telegramId: tg_user.telegramId,
            activeInternalSquads: activeInternalSquads,
        });

        if (aura_user.isOk && aura_user.response) {
            await this.prisma.user.update({
                where: {id: tg_user.id},
                data: {
                    auraId: aura_user.response.response.uuid,
                }
            });

            return aura_user.response.response;
        } else {
            return undefined;
        }
    }

    async updateAuraUser(ctx: Context, expireAt: Date | undefined = undefined): Promise<z.infer<typeof UsersSchema> | undefined> {
        const tg_user = await this.getTgUser(ctx);
        if (!tg_user.auraId) {
            return undefined;
        }

        const activeInternalSquads = (this.config.get<string>('AURA_DEFAULT_SQUADS') ?? '')
            .split(',')
            .map(id => id.trim())
            .filter(Boolean);

        const aura_user = await this.axios.getUserByUuid(tg_user.auraId);

        if (aura_user.isOk && aura_user.response) {
            const updated = await this.axios.updateUser({
                expireAt: expireAt,
                uuid: aura_user.response.response.uuid,
                description: `${tg_user.fullName} @${tg_user.username} id:${tg_user.telegramId}:${tg_user.id}`,
                tag: tg_user.level,
                telegramId: tg_user.telegramId,
                activeInternalSquads: activeInternalSquads,
            })
            return updated?.response?.response;
        } else {
            return undefined;
        }
    }
}