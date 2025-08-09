import axios, {
  AxiosError,
  AxiosInstance,
  AxiosResponseHeaders,
  RawAxiosResponseHeaders,
} from "axios";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  CreateUserCommand,
  GetSubscriptionInfoByShortUuidCommand,
  GetUserByTelegramIdCommand,
  GetUserByUuidCommand,
  TRequestTemplateTypeKeys,
  UpdateUserCommand,
} from "@remnawave/backend-contract";
import { ICommandResponse } from "@common/types";

@Injectable()
export class AxiosService {
  public axiosInstance: AxiosInstance;
  private readonly logger = new Logger(AxiosService.name);

  constructor(private readonly configService: ConfigService) {
    this.axiosInstance = axios.create({
      baseURL: this.configService.getOrThrow("AURA_PANEL_URL"),
      timeout: 45_000,
      headers: {
        "x-forwarded-for": "127.0.0.1",
        "x-forwarded-proto": "https",
        "user-agent": "aura-subscriptions",
        Authorization: `Bearer ${this.configService.get("AURA_API_TOKEN")}`,
      },
    });

    const caddyAuthApiToken = this.configService.get("CADDY_AUTH_API_TOKEN");
    if (caddyAuthApiToken) {
      this.axiosInstance.defaults.headers.common["X-Api-Key"] =
        caddyAuthApiToken;
    }
  }

  private handleError<T>(
    error: unknown,
    commandName: string,
  ): ICommandResponse<T> {
    if (error instanceof AxiosError) {
      const status = error.response?.status;
      const data = error.response?.data;
      this.logger.error(
        `[${commandName}] Axios error: ${error.message} (status: ${status})`,
        typeof data === "object" ? JSON.stringify(data) : String(data),
      );
    } else {
      this.logger.error(`[${commandName}] Unexpected error`, error as Error);
    }
    return { isOk: false };
  }

  private async sendRequest<T>(
    command: {
      endpointDetails: { REQUEST_METHOD: string };
      url: string | ((...args: any[]) => string);
    },
    dataOrParams?: any,
    urlArgs?: any[],
  ): Promise<ICommandResponse<T>> {
    try {
      const url =
        typeof command.url === "function"
          ? command.url(...(urlArgs || []))
          : command.url;

      const response = await this.axiosInstance.request<T>({
        method: command.endpointDetails.REQUEST_METHOD,
        url,
        data: dataOrParams,
      });

      return { isOk: true, response: response.data };
    } catch (error) {
      return this.handleError<T>(
        error,
        command.constructor?.name ?? "UnknownCommand",
      );
    }
  }

  public updateUser(data: UpdateUserCommand.Request) {
    return this.sendRequest<UpdateUserCommand.Response>(
      UpdateUserCommand,
      data,
    );
  }

  public createUser(data: CreateUserCommand.Request) {
    return this.sendRequest<CreateUserCommand.Response>(
      CreateUserCommand,
      data,
    );
  }

  public getUserByUuid(uuid: string) {
    return this.sendRequest<GetUserByUuidCommand.Response>(
      GetUserByUuidCommand,
      undefined,
      [uuid],
    );
  }

  public getUsersByTelegramId(telegramId: number) {
    return this.sendRequest<GetUserByTelegramIdCommand.Response>(
      GetUserByTelegramIdCommand,
      undefined,
      [String(telegramId)],
    );
  }

  public getSubscriptionInfo(shortUuid: string) {
    return this.sendRequest<GetSubscriptionInfoByShortUuidCommand.Response>(
      GetSubscriptionInfoByShortUuidCommand,
      undefined,
      [shortUuid],
    );
  }

  async getSubscription(
    shortUuid: string,
    headers: NodeJS.Dict<string | string[]>,
    withClientType = false,
    clientType?: TRequestTemplateTypeKeys,
  ): Promise<{
    response: unknown;
    headers: RawAxiosResponseHeaders | AxiosResponseHeaders;
  } | null> {
    try {
      let basePath = "api/sub/" + shortUuid;
      if (withClientType && clientType) {
        basePath += "/" + clientType;
      }

      const response = await this.axiosInstance.request<unknown>({
        method: "GET",
        url: basePath,
        headers: this.filterHeaders(headers),
      });

      return { response: response.data, headers: response.headers };
    } catch (error) {
      this.handleError(error, "GetSubscription");
      return null;
    }
  }

  private filterHeaders(headers: NodeJS.Dict<string | string[]>) {
    const allowedHeaders = [
      "user-agent",
      "accept",
      "accept-language",
      "accept-encoding",
      "x-hwid",
      "x-device-os",
      "x-ver-os",
      "x-device-model",
    ];

    return Object.fromEntries(
      Object.entries(headers).filter(([key]) =>
        allowedHeaders.includes(key.toLowerCase()),
      ),
    );
  }
}
