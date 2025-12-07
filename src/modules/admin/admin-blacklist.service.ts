import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@common/services/prisma.service';

@Injectable()
export class AdminBlacklistService {
    constructor(private prisma: PrismaService) {}

    async getBlacklist(page: number = 1, limit: number = 50, search?: string) {
        const skip = (page - 1) * limit;
        const where: any = {};

        if (search) {
            where.OR = [
                { telegramId: { equals: BigInt(search) || BigInt(0) } },
                { auraId: { contains: search, mode: 'insensitive' as const } },
                { reason: { contains: search, mode: 'insensitive' as const } },
            ];
        }

        const [blacklist, total] = await Promise.all([
            this.prisma.blacklist.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.blacklist.count({ where }),
        ]);

        return {
            data: blacklist.map((item) => ({
                ...item,
                telegramId: item.telegramId?.toString() || null,
            })),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async getBlacklistItemById(id: string) {
        const item = await this.prisma.blacklist.findUnique({
            where: { id },
        });

        if (!item) {
            return null;
        }

        return {
            ...item,
            telegramId: item.telegramId?.toString() || null,
        };
    }

    async addToBlacklist(data: {
        telegramId?: bigint;
        auraId?: string;
        reason?: string;
        createdBy?: string;
    }) {
        if (!data.telegramId && !data.auraId) {
            throw new BadRequestException('Either telegramId or auraId must be provided');
        }

        // Check if already exists
        const existing = await this.prisma.blacklist.findFirst({
            where: {
                OR: [
                    data.telegramId ? { telegramId: data.telegramId } : {},
                    data.auraId ? { auraId: data.auraId } : {},
                ],
            },
        });

        if (existing) {
            throw new BadRequestException('User is already in blacklist');
        }

        return this.prisma.blacklist.create({
            data: {
                ...data,
                isActive: true,
            },
        });
    }

    async updateBlacklistItem(id: string, data: {
        reason?: string;
        isActive?: boolean;
    }) {
        const item = await this.prisma.blacklist.findUnique({
            where: { id },
        });

        if (!item) {
            throw new NotFoundException('Blacklist item not found');
        }

        return this.prisma.blacklist.update({
            where: { id },
            data,
        });
    }

    async removeFromBlacklist(id: string) {
        return this.prisma.blacklist.delete({
            where: { id },
        });
    }

    async isBlacklisted(telegramId?: bigint, auraId?: string): Promise<boolean> {
        if (!telegramId && !auraId) {
            return false;
        }

        const item = await this.prisma.blacklist.findFirst({
            where: {
                isActive: true,
                OR: [
                    telegramId ? { telegramId } : {},
                    auraId ? { auraId } : {},
                ],
            },
        });

        return !!item;
    }
}

