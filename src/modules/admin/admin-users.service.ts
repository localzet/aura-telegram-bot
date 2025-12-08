import { Injectable } from '@nestjs/common';
import { PrismaService } from '@common/services/prisma.service';
import { UserLevel } from '@prisma/client';
import { AxiosService } from '@common/axios';

@Injectable()
export class AdminUsersService {
    constructor(
        private prisma: PrismaService,
        private axios: AxiosService,
    ) {}

    async getUsers(page: number = 1, limit: number = 50, search?: string) {
        const skip = (page - 1) * limit;
        const where = search
            ? {
                  OR: [
                      { username: { contains: search, mode: 'insensitive' as const } },
                      { fullName: { contains: search, mode: 'insensitive' as const } },
                      { telegramId: { equals: BigInt(search) || BigInt(0) } },
                      { auraId: { contains: search, mode: 'insensitive' as const } },
                  ],
              }
            : {};

        const [users, total] = await Promise.all([
            this.prisma.user.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    _count: {
                        select: {
                            referrals: true,
                            purchase: true,
                        },
                    },
                },
            }),
            this.prisma.user.count({ where }),
        ]);

        return {
            data: await Promise.all(
                users.map(async (user) => {
                    const telegramLink = user.username
                        ? `https://t.me/${user.username}`
                        : `tg://user?id=${user.telegramId}`;
                    
                    // Получаем информацию о подписке из Aura API
                    let subscriptionInfo: any = null;
                    if (user.auraId) {
                        try {
                            const auraUser = await this.axios.getUserByUuid(user.auraId);
                            if (auraUser.isOk && auraUser.response) {
                                const auraData = auraUser.response.response;
                                const now = new Date();
                                const expireAt = auraData.expireAt ? new Date(auraData.expireAt) : null;
                                
                                subscriptionInfo = {
                                    isActive: auraData.status === 'ACTIVE' && 
                                        (!expireAt || expireAt > now),
                                    expireAt: expireAt,
                                    status: auraData.status,
                                    daysRemaining: expireAt 
                                        ? Math.max(0, Math.ceil((expireAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
                                        : null,
                                    daysExpired: expireAt && expireAt < now
                                        ? Math.ceil((now.getTime() - expireAt.getTime()) / (1000 * 60 * 60 * 24))
                                        : null,
                                };
                            }
                        } catch (error) {
                            // Игнорируем ошибки получения данных из Aura
                        }
                    }

                    return {
                        ...user,
                        telegramId: user.telegramId.toString(),
                        telegramLink,
                        referralsCount: user._count.referrals,
                        purchasesCount: user._count.purchase,
                        subscriptionInfo,
                    };
                }),
            ),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async getUserById(id: string) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            include: {
                referrals: {
                    include: {
                        invited: {
                            select: {
                                id: true,
                                username: true,
                                fullName: true,
                                telegramId: true,
                                level: true,
                            },
                        },
                    },
                },
                purchase: {
                    orderBy: { createdAt: 'desc' },
                    take: 50,
                },
                invitedBy: {
                    include: {
                        inviter: {
                            select: {
                                id: true,
                                username: true,
                                fullName: true,
                                telegramId: true,
                            },
                        },
                    },
                },
            },
        });

        if (!user) {
            return null;
        }

        const telegramLink = user.username
            ? `https://t.me/${user.username}`
            : `tg://user?id=${user.telegramId}`;

        // Получаем информацию о подписке из Aura API
        let subscriptionInfo: any = null;
        if (user.auraId) {
            try {
                const auraUser = await this.axios.getUserByUuid(user.auraId);
                if (auraUser.isOk && auraUser.response) {
                    const auraData = auraUser.response.response;
                    const now = new Date();
                    const expireAt = auraData.expireAt ? new Date(auraData.expireAt) : null;
                    
                    subscriptionInfo = {
                        isActive: auraData.status === 'ACTIVE' && 
                            (!expireAt || expireAt > now),
                        expireAt: expireAt,
                        status: auraData.status,
                        daysRemaining: expireAt 
                            ? Math.max(0, Math.ceil((expireAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
                            : null,
                        daysExpired: expireAt && expireAt < now
                            ? Math.ceil((now.getTime() - expireAt.getTime()) / (1000 * 60 * 60 * 24))
                            : null,
                    };
                }
            } catch (error) {
                // Игнорируем ошибки получения данных из Aura
            }
        }

        return {
            ...user,
            telegramId: user.telegramId.toString(),
            telegramLink,
            subscriptionInfo,
        };
    }

    async updateUser(id: string, data: {
        level?: UserLevel;
        discount?: number;
        discountExpiresAt?: Date | null;
        grantedArgentum?: number;
        grantedAurum?: number;
        grantedPlatinum?: number;
    }) {
        return this.prisma.user.update({
            where: { id },
            data,
        });
    }

    async deleteUser(id: string) {
        return this.prisma.user.delete({
            where: { id },
        });
    }
}

