import axios, {AxiosError, AxiosInstance, AxiosResponseHeaders, RawAxiosResponseHeaders,} from 'axios';

import {Injectable, Logger} from '@nestjs/common';
import {ConfigService} from '@nestjs/config';

import {
    CreateUserCommand,
    GetSubscriptionInfoByShortUuidCommand,
    GetUserByTelegramIdCommand,
    GetUserByUuidCommand,
    TRequestTemplateTypeKeys,
    UpdateUserCommand,
} from '@remnawave/backend-contract';

import {ICommandResponse} from '@common/types';

@Injectable()
export class AxiosService {
    public axiosInstance: AxiosInstance;
    private readonly logger = new Logger(AxiosService.name);

    constructor(private readonly configService: ConfigService) {
        this.axiosInstance = axios.create({
            baseURL: this.configService.getOrThrow('AURA_PANEL_URL'),
            timeout: 45_000,
            headers: {
                'x-forwarded-for': '127.0.0.1',
                'x-forwarded-proto': 'https',
                'user-agent': 'aura-subscriptions',
                Authorization: `Bearer ${this.configService.get('AURA_API_TOKEN')}`,
            },
        });

        const caddyAuthApiToken = this.configService.get('CADDY_AUTH_API_TOKEN');

        if (caddyAuthApiToken) {
            this.axiosInstance.defaults.headers.common['X-Api-Key'] = caddyAuthApiToken;
        }
    }

    public async updateUser(data: UpdateUserCommand.Request) {
        try {
            const response = await this.axiosInstance.request<UpdateUserCommand.Response>({
                method: UpdateUserCommand.endpointDetails.REQUEST_METHOD,
                url: UpdateUserCommand.url,
                data
            });

            return {
                isOk: true,
                response: response.data,
            };
        } catch (error) {
            if (error instanceof AxiosError) {
                this.logger.error('Ошибка при запросе CreateUserCommand в Axios:', error.message);

                return {
                    isOk: false,
                };
            } else {
                this.logger.error('Ошибка при запросе CreateUserCommand:', error);

                return {
                    isOk: false,
                };
            }
        }
    }

    public async createUser(data: CreateUserCommand.Request) {
        try {
            const response = await this.axiosInstance.request<CreateUserCommand.Response>({
                method: CreateUserCommand.endpointDetails.REQUEST_METHOD,
                url: CreateUserCommand.url,
                data
            });

            return {
                isOk: true,
                response: response.data,
            };
        } catch (error) {
            if (error instanceof AxiosError) {
                this.logger.error('Ошибка при запросе CreateUserCommand в Axios:', error.message);

                return {
                    isOk: false,
                };
            } else {
                this.logger.error('Ошибка при запросе CreateUserCommand:', error);

                return {
                    isOk: false,
                };
            }
        }
    }

    async getUserByUuid(uuid: string) {
        try {
            const response = await this.axiosInstance.request<GetUserByUuidCommand.Response>({
                method: GetUserByUuidCommand.endpointDetails.REQUEST_METHOD,
                url: GetUserByUuidCommand.url(uuid),
            });

            return {
                isOk: true,
                response: response.data,
            };
        } catch (error) {
            if (error instanceof AxiosError) {
                this.logger.error('Ошибка при запросе CreateUserCommand в Axios:', error.message);

                return {
                    isOk: false,
                };
            } else {
                this.logger.error('Ошибка при запросе CreateUserCommand:', error);

                return {
                    isOk: false,
                };
            }
        }
    }

    public async getUsersByTelegramId(
        telegramId: number,
    ): Promise<ICommandResponse<GetUserByTelegramIdCommand.Response>> {
        try {
            const response = await this.axiosInstance.request<GetUserByTelegramIdCommand.Response>({
                method: GetUserByTelegramIdCommand.endpointDetails.REQUEST_METHOD,
                url: GetUserByTelegramIdCommand.url(String(telegramId)),
            });

            return {
                isOk: true,
                response: response.data,
            };
        } catch (error) {
            if (error instanceof AxiosError) {
                this.logger.error('Ошибка при запросе GetUserByUsername в Axios:', error.message);

                return {
                    isOk: false,
                };
            } else {
                this.logger.error('Ошибка при запросе GetUserByUsername:', error);

                return {
                    isOk: false,
                };
            }
        }
    }

    public async getSubscriptionInfo(
        shortUuid: string,
    ): Promise<ICommandResponse<GetSubscriptionInfoByShortUuidCommand.Response>> {
        try {
            const response =
                await this.axiosInstance.request<GetSubscriptionInfoByShortUuidCommand.Response>({
                    method: GetSubscriptionInfoByShortUuidCommand.endpointDetails.REQUEST_METHOD,
                    url: GetSubscriptionInfoByShortUuidCommand.url(shortUuid),
                });

            return {
                isOk: true,
                response: response.data,
            };
        } catch (error) {
            if (error instanceof AxiosError) {
                this.logger.error('Ошибка при запросе GetSubscriptionInfo:', error.message);
            } else {
                this.logger.error('Ошибка при запросе GetSubscriptionInfo:', error);
            }

            return {isOk: false};
        }
    }

    public async getSubscription(
        shortUuid: string,
        headers: NodeJS.Dict<string | string[]>,
        withClientType: boolean = false,
        clientType?: TRequestTemplateTypeKeys,
    ): Promise<{
        response: unknown;
        headers: RawAxiosResponseHeaders | AxiosResponseHeaders;
    } | null> {
        try {
            let basePath = 'api/sub/' + shortUuid;

            if (withClientType && clientType) {
                basePath += '/' + clientType;
            }

            const response = await this.axiosInstance.request<unknown>({
                method: 'GET',
                url: basePath,
                headers: this.filterHeaders(headers),
            });

            return {
                response: response.data,
                headers: response.headers,
            };
        } catch (error) {
            if (error instanceof AxiosError) {
                this.logger.error('Ошибка при запросе GetSubscription:', error.message);
            } else {
                this.logger.error('Ошибка при запросе GetSubscription:', error);
            }

            return null;
        }
    }

    private filterHeaders(headers: NodeJS.Dict<string | string[]>): NodeJS.Dict<string | string[]> {
        const allowedHeaders = [
            'user-agent',
            'accept',
            'accept-language',
            'accept-encoding',
            'x-hwid',
            'x-device-os',
            'x-ver-os',
            'x-device-model',
        ];

        const filteredHeaders = Object.fromEntries(
            Object.entries(headers).filter(([key]) => allowedHeaders.includes(key)),
        );

        return filteredHeaders;
    }
}
