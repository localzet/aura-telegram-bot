import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@common/services/prisma.service';

@Injectable()
export class AdminPromoCodesService {
    constructor(private prisma: PrismaService) {}

    async getPromoCodes(page: number = 1, limit: number = 50, search?: string) {
        const skip = (page - 1) * limit;
        const where = search
            ? {
                  code: { contains: search, mode: 'insensitive' as const },
              }
            : {};

        const [promoCodes, total] = await Promise.all([
            this.prisma.promoCode.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    _count: {
                        select: {
                            purchases: true,
                        },
                    },
                },
            }),
            this.prisma.promoCode.count({ where }),
        ]);

        return {
            data: promoCodes.map((code) => ({
                ...code,
                usesCount: code._count.purchases,
            })),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async getPromoCodeById(id: string) {
        return this.prisma.promoCode.findUnique({
            where: { id },
            include: {
                purchases: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                username: true,
                                fullName: true,
                                telegramId: true,
                            },
                        },
                    },
                    orderBy: { createdAt: 'desc' },
                },
            },
        });
    }

    async createPromoCode(data: {
        code: string;
        type?: 'discount' | 'level';
        discount?: number;
        level?: string;
        maxUses?: number;
        expiresAt?: Date;
        description?: string;
    }) {
        const existing = await this.prisma.promoCode.findUnique({
            where: { code: data.code },
        });

        if (existing) {
            throw new BadRequestException('Promo code already exists');
        }

        const createData: any = {
            code: data.code,
            type: data.type || 'discount',
            isActive: true,
        };

        if (data.type === 'level') {
            createData.level = data.level;
            createData.discount = 0;
        } else {
            createData.discount = data.discount || 0;
        }

        if (data.maxUses !== undefined) createData.maxUses = data.maxUses;
        if (data.expiresAt) createData.expiresAt = data.expiresAt;
        if (data.description) createData.description = data.description;

        return this.prisma.promoCode.create({
            data: createData,
        });
    }

    async updatePromoCode(id: string, data: {
        type?: 'discount' | 'level';
        discount?: number;
        level?: string;
        maxUses?: number;
        expiresAt?: Date | null;
        isActive?: boolean;
        description?: string;
    }) {
        const promoCode = await this.prisma.promoCode.findUnique({
            where: { id },
        });

        if (!promoCode) {
            throw new NotFoundException('Promo code not found');
        }

        const updateData: any = {};
        
        if (data.type !== undefined) updateData.type = data.type;
        if (data.level !== undefined) updateData.level = data.level;
        if (data.discount !== undefined) updateData.discount = data.discount;
        if (data.maxUses !== undefined) updateData.maxUses = data.maxUses;
        if (data.expiresAt !== undefined) updateData.expiresAt = data.expiresAt;
        if (data.isActive !== undefined) updateData.isActive = data.isActive;
        if (data.description !== undefined) updateData.description = data.description;

        return this.prisma.promoCode.update({
            where: { id },
            data: updateData,
        });
    }

    async deletePromoCode(id: string) {
        return this.prisma.promoCode.delete({
            where: { id },
        });
    }

    async validatePromoCode(code: string): Promise<{
        valid: boolean;
        discount?: number;
        level?: string;
        type?: string;
        message?: string;
    }> {
        const promoCode = await this.prisma.promoCode.findUnique({
            where: { code },
        });

        if (!promoCode) {
            return { valid: false, message: 'Promo code not found' };
        }

        if (!promoCode.isActive) {
            return { valid: false, message: 'Promo code is inactive' };
        }

        if (promoCode.expiresAt && promoCode.expiresAt < new Date()) {
            return { valid: false, message: 'Promo code expired' };
        }

        if (promoCode.maxUses && promoCode.usedCount >= promoCode.maxUses) {
            return { valid: false, message: 'Promo code usage limit reached' };
        }

        if (promoCode.type === 'level') {
            return { 
                valid: true, 
                type: 'level',
                level: promoCode.level || undefined,
            };
        }

        return { 
            valid: true, 
            type: 'discount',
            discount: promoCode.discount,
        };
    }
}

