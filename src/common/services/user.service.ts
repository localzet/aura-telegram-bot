import { Injectable, Logger } from "@nestjs/common";
import { AxiosService } from "@common/axios";
import { PrismaService } from "@common/services/prisma.service";
import { Context } from "grammy";
import { User, UserLevel } from "@prisma/client";
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
      ctx.chat ?? ctx.message?.chat ?? ctx.callbackQuery?.message?.chat;

    const telegramId = from?.id ?? chat?.id;
    if (!telegramId) {
      this.logger.warn("Не удалось извлечь telegramId из контекста");
      return null;
    }

    return {
      telegramId: BigInt(telegramId),
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
      where: { telegramId: BigInt(telegramId) },
      create: { telegramId: BigInt(telegramId), username, fullName, language },
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
      const users = await this.axios.getUsersByTelegramId(
        data.telegramId.toString(),
      );
      if (!users.isOk || !users.response) {
        this.logger.warn(
          `Aura-пользователь по Telegram ID ${data.telegramId.toString()} не найден`,
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

      const rawLevel = users.response.response[0]?.tag?.toLowerCase();
      const level = (
        ["ferrum", "argentum", "aurum", "platinum"] as const
      ).includes(rawLevel as any)
        ? (rawLevel as UserLevel)
        : undefined;

      const upsert = { ...data, auraId, level };
      await this.prisma.user.upsert({
        where: { telegramId: BigInt(data.telegramId) },
        create: upsert,
        update: upsert,
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
      aura: await this.getAuraUser(ctx),
      tg: await this.getTgUser(ctx),
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
        username: `tg_${tgUser.telegramId.toString()}`,
        expireAt,
        status: "ACTIVE",
        tag: tgUser.level.toUpperCase(),
        shortUuid: tgUser.id,
        description: `${tgUser.fullName} @${tgUser.username} id:${tgUser.telegramId.toString()}:${tgUser.id}`,
        trafficLimitStrategy: "MONTH",
        telegramId: Number(tgUser.telegramId),
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
        `Не удалось создать Aura-пользователя для Telegram ID ${tgUser.telegramId.toString()}`,
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
        uuid: auraUser.response.response.uuid,
        // status: "ACTIVE", // На всякий случай не обновляем
        tag: tgUser.level.toUpperCase(),
        description: `${tgUser.fullName} @${tgUser.username} id:${tgUser.telegramId.toString()}:${tgUser.id}`,
        trafficLimitStrategy: "MONTH",
        expireAt,
        telegramId: Number(tgUser.telegramId),
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
