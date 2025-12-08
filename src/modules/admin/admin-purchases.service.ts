import { Injectable } from '@nestjs/common';
import { PrismaService } from '@common/services/prisma.service';
import { PurchaseStatus, PurchaseType } from '@prisma/client';

@Injectable()
export class AdminPurchasesService {
    constructor(private prisma: PrismaService) {}

    async getPurchases(page: number = 1, limit: number = 50, filters?: {
        status?: PurchaseStatus;
        type?: PurchaseType;
        userId?: string;
    }) {
        const skip = (page - 1) * limit;
        const where: any = {};

        if (filters?.status) {
            where.status = filters.status;
        }
        if (filters?.type) {
            where.type = filters.type;
        }
        if (filters?.userId) {
            where.userId = filters.userId;
        }

        const [purchases, total] = await Promise.all([
            this.prisma.purchase.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: {
                        select: {
                            id: true,
                            username: true,
                            fullName: true,
                            telegramId: true,
                        },
                    },
                    promoCode: {
                        select: {
                            id: true,
                            code: true,
                            discount: true,
                        },
                    },
                },
            }),
            this.prisma.purchase.count({ where }),
        ]);

        return {
            data: purchases.map((purchase) => ({
                ...purchase,
                user: purchase.user
                    ? {
                          ...purchase.user,
                          telegramId: purchase.user.telegramId.toString(),
                      }
                    : null,
            })),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async getPurchaseById(id: string) {
        return this.prisma.purchase.findUnique({
            where: { id },
            include: {
                user: true,
                promoCode: true,
            },
        });
    }

    async updatePurchaseStatus(id: string, status: PurchaseStatus) {
        const data: any = { status };
        if (status === 'paid') {
            data.paidAt = new Date();
        }
        return this.prisma.purchase.update({
            where: { id },
            data,
        });
    }

    async deletePurchase(id: string) {
        return this.prisma.purchase.delete({
            where: { id },
        });
    }

    async cleanupOldTransactions(daysOld: number = 7) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);

        const result = await this.prisma.purchase.updateMany({
            where: {
                status: {
                    in: ['new', 'pending'],
                },
                createdAt: {
                    lt: cutoffDate,
                },
            },
            data: {
                status: 'cancel',
            },
        });

        return {
            updated: result.count,
            message: `Marked ${result.count} old transactions as cancelled`,
        };
    }
}

