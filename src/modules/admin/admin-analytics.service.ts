import { Injectable } from '@nestjs/common';
import { PrismaService } from '@common/services/prisma.service';
import { UserLevel, PurchaseStatus } from '@prisma/client';

@Injectable()
export class AdminAnalyticsService {
    constructor(private prisma: PrismaService) {}

    async getFinancialAnalytics(startDate?: Date, endDate?: Date) {
        const where: any = {
            status: 'paid',
        };

        if (startDate || endDate) {
            where.paidAt = {};
            if (startDate) {
                where.paidAt.gte = startDate;
            }
            if (endDate) {
                where.paidAt.lte = endDate;
            }
        }

        const purchases = await this.prisma.purchase.findMany({
            where,
            include: {
                user: {
                    select: {
                        level: true,
                    },
                },
            },
        });

        const totalRevenue = purchases.reduce((sum, p) => sum + p.amount, 0);
        const byCurrency = purchases.reduce((acc, p) => {
            acc[p.currency] = (acc[p.currency] || 0) + p.amount;
            return acc;
        }, {} as Record<string, number>);

        const byType = purchases.reduce((acc, p) => {
            acc[p.type] = (acc[p.type] || 0) + p.amount;
            return acc;
        }, {} as Record<string, number>);

        const byLevel = purchases.reduce((acc, p) => {
            const level = p.user?.level || 'ferrum';
            acc[level] = (acc[level] || 0) + p.amount;
            return acc;
        }, {} as Record<string, number>);

        const byMonth = purchases.reduce((acc, p) => {
            const month = p.paidAt?.toISOString().substring(0, 7) || 'unknown';
            acc[month] = (acc[month] || 0) + p.amount;
            return acc;
        }, {} as Record<string, number>);

        const totalPurchases = purchases.length;
        const avgPurchaseAmount = totalPurchases > 0 ? totalRevenue / totalPurchases : 0;

        return {
            totalRevenue,
            totalPurchases,
            avgPurchaseAmount,
            byCurrency,
            byType,
            byLevel,
            byMonth,
        };
    }

    async getTariffRating() {
        const purchases = await this.prisma.purchase.findMany({
            where: { status: 'paid' },
            include: {
                user: {
                    select: {
                        level: true,
                    },
                },
            },
        });

        const levelStats = await this.prisma.user.groupBy({
            by: ['level'],
            _count: {
                id: true,
            },
        });

        const levelRevenue = purchases.reduce((acc, p) => {
            const level = p.user?.level || 'ferrum';
            if (!acc[level]) {
                acc[level] = { revenue: 0, purchases: 0, users: 0 };
            }
            acc[level].revenue += p.amount;
            acc[level].purchases += 1;
            return acc;
        }, {} as Record<string, { revenue: number; purchases: number; users: number }>);

        levelStats.forEach((stat) => {
            if (!levelRevenue[stat.level]) {
                levelRevenue[stat.level] = { revenue: 0, purchases: 0, users: 0 };
            }
            levelRevenue[stat.level].users = stat._count.id;
        });

        const monthStats = purchases.reduce((acc, p) => {
            const month = p.month;
            acc[month] = (acc[month] || 0) + 1;
            return acc;
        }, {} as Record<number, number>);

        return {
            levels: levelRevenue,
            monthDistribution: monthStats,
        };
    }

    async getLevelRating() {
        const users = await this.prisma.user.findMany({
            include: {
                purchase: {
                    where: { status: 'paid' },
                },
            },
        });

        const levelStats = users.reduce((acc, user) => {
            if (!acc[user.level]) {
                acc[user.level] = {
                    count: 0,
                    totalRevenue: 0,
                    totalPurchases: 0,
                    avgRevenue: 0,
                };
            }
            acc[user.level].count += 1;
            acc[user.level].totalPurchases += user.purchase.length;
            acc[user.level].totalRevenue += user.purchase.reduce(
                (sum, p) => sum + p.amount,
                0,
            );
            return acc;
        }, {} as Record<string, { count: number; totalRevenue: number; totalPurchases: number; avgRevenue: number }>);

        Object.keys(levelStats).forEach((level) => {
            const stat = levelStats[level];
            stat.avgRevenue = stat.count > 0 ? stat.totalRevenue / stat.count : 0;
        });

        return levelStats;
    }
}

