import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "@common/services/prisma.service";

@Injectable()
export class AdminPromoCodesService {
  constructor(private prisma: PrismaService) {}

  async getPromoCodes(page: number = 1, limit: number = 50, search?: string) {
    const skip = (page - 1) * limit;
    const where = search
      ? {
          code: { contains: search, mode: "insensitive" as const },
        }
      : {};

    const [promoCodes, total] = await Promise.all([
      this.prisma.promoCode.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
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
          orderBy: { createdAt: "desc" },
        },
      },
    });
  }

  async createPromoCode(data: {
    code: string;
    discount: number;
    maxUses?: number;
    expiresAt?: Date;
    description?: string;
  }) {
    const existing = await this.prisma.promoCode.findUnique({
      where: { code: data.code },
    });

    if (existing) {
      throw new BadRequestException("Promo code already exists");
    }

    return this.prisma.promoCode.create({
      data: {
        ...data,
        isActive: true,
      },
    });
  }

  async updatePromoCode(
    id: string,
    data: {
      discount?: number;
      maxUses?: number;
      expiresAt?: Date | null;
      isActive?: boolean;
      description?: string;
    },
  ) {
    const promoCode = await this.prisma.promoCode.findUnique({
      where: { id },
    });

    if (!promoCode) {
      throw new NotFoundException("Promo code not found");
    }

    return this.prisma.promoCode.update({
      where: { id },
      data,
    });
  }

  async deletePromoCode(id: string) {
    return this.prisma.promoCode.delete({
      where: { id },
    });
  }

  async validatePromoCode(code: string): Promise<{
    valid: boolean;
    discount: number;
    message?: string;
  }> {
    const promoCode = await this.prisma.promoCode.findUnique({
      where: { code },
    });

    if (!promoCode) {
      return { valid: false, discount: 0, message: "Promo code not found" };
    }

    if (!promoCode.isActive) {
      return { valid: false, discount: 0, message: "Promo code is inactive" };
    }

    if (promoCode.expiresAt && promoCode.expiresAt < new Date()) {
      return { valid: false, discount: 0, message: "Promo code expired" };
    }

    if (promoCode.maxUses && promoCode.usedCount >= promoCode.maxUses) {
      return {
        valid: false,
        discount: 0,
        message: "Promo code usage limit reached",
      };
    }

    return { valid: true, discount: promoCode.discount };
  }
}
