import { Injectable, Logger } from "@nestjs/common";
import { AxiosService } from "@common/axios";
import { PrismaService } from "@common/services/prisma.service";
import { Context } from "grammy";
import { User } from "@prisma/client";
import { ConfigService } from "@nestjs/config";
import { z } from "zod";
import { UsersSchema } from "@remnawave/backend-contract";

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly axios: AxiosService,
  ) {}

  private extractTgData(ctx: Context) {
    const from = ctx.from;
    const chat =
      ctx.chat ??
      ctx.message?.chat ??
      ctx.callbackQuery?.message?.chat;

    const telegramId = from?.id ?? chat?.id;
    if (!telegramId) {
      this.logger.warn("Не удалось извлечь telegramId из контекста");
      return null;
    }

    return {
      telegramId,
      username: from?.username ?? chat?.username ?? null,
      fullName: [
        from?.first_name ?? chat?.first_name,
        from?.last_name ?? chat?.last_name,
      ]
        .filter(Boolean)
        .join(" "),
      language: from?.language_code ?? "ru",
    };
  }

  async getTgUser(ctx: Context): Promise<User> {
    const data = this.extractTgData(ctx);
    if (!data) throw new Error("no telegramId");

    const { telegramId, username, fullName, language } = data;

    return this.prisma.user.upsert({
      where: { telegramId },
      create: { telegramId, username, fullName, language },
      update: { username, fullName, language },
    });
  }

  async getAuraUser(
    ctx: Context,
  ): Promise<z.infer<typeof UsersSchema> | undefined> {
    try {
      const user = await this.updateAuraUser(ctx);
      if (user) return user;

      const data = this.extractTgData(ctx);
      if (!data) return undefined;

      const users = await this.axios.getUsersByTelegramId(data.telegramId);
      if (!users.isOk || !users.response) {
        this.logger.warn(
          `Aura-пользователь по Telegram ID ${data.telegramId} не найден`,
        );
        return undefined;
      }

      const auraId = users.response.response[0]?.uuid;
      if (!auraId) {
        this.logger.warn(
          `Не удалось извлечь auraId для Telegram ID ${data.telegramId}`,
        );
        return undefined;
      }

      await this.prisma.user.upsert({
        where: { telegramId: data.telegramId },
        create: { ...data, auraId },
        update: { ...data, auraId },
      });

      return await this.updateAuraUser(ctx);
    } catch (err) {
      this.logger.error(
        "Ошибка при получении Aura-пользователя",
        err instanceof Error ? err.stack : err,
      );
      return undefined;
    }
  }

  async getUser(ctx: Context) {
    return {
      tg: await this.getTgUser(ctx),
      aura: await this.getAuraUser(ctx),
    };
  }

  async createAuraUser(ctx: Context, expireAt: Date) {
    try {
      const tgUser = await this.getTgUser(ctx);

      const activeInternalSquads = (
        this.config.get<string>("AURA_DEFAULT_SQUADS") ?? ""
      )
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);

      const auraUser = await this.axios.createUser({
        expireAt,
        username: `tg_${tgUser.telegramId}`,
        status: "ACTIVE",
        shortUuid: tgUser.id,
        description: `${tgUser.fullName} @${tgUser.username} id:${tgUser.telegramId}:${tgUser.id}`,
        tag: tgUser.level,
        telegramId: tgUser.telegramId,
        activeInternalSquads,
      });

      if (auraUser.isOk && auraUser.response) {
        await this.prisma.user.update({
          where: { id: tgUser.id },
          data: { auraId: auraUser.response.response.uuid },
        });
        return auraUser.response.response;
      }

      this.logger.warn(
        `Не удалось создать Aura-пользователя для Telegram ID ${tgUser.telegramId}`,
      );
      return undefined;
    } catch (err) {
      this.logger.error(
        "Ошибка при создании Aura-пользователя",
        err instanceof Error ? err.stack : err,
      );
      return undefined;
    }
  }

  async updateAuraUser(ctx: Context, expireAt?: Date) {
    try {
      const tgUser = await this.getTgUser(ctx);
      if (!tgUser.auraId) return undefined;

      const activeInternalSquads = (
        this.config.get<string>("AURA_DEFAULT_SQUADS") ?? ""
      )
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);

      const auraUser = await this.axios.getUserByUuid(tgUser.auraId);
      if (!auraUser.isOk || !auraUser.response) {
        this.logger.warn(`Aura-пользователь с ID ${tgUser.auraId} не найден`);
        return undefined;
      }

      const updated = await this.axios.updateUser({
        expireAt,
        uuid: auraUser.response.response.uuid,
        description: `${tgUser.fullName} @${tgUser.username} id:${tgUser.telegramId}:${tgUser.id}`,
        tag: tgUser.level,
        telegramId: tgUser.telegramId,
        activeInternalSquads,
      });

      return updated?.response?.response;
    } catch (err) {
      this.logger.error(
        "Ошибка при обновлении Aura-пользователя",
        err instanceof Error ? err.stack : err,
      );
      return undefined;
    }
  }
}
