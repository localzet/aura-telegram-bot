import { Injectable } from "@nestjs/common";
import { PrismaService } from "@common/services/prisma.service";
import { UserLevel } from "@prisma/client";

@Injectable()
export class AdminUsersService {
  constructor(private prisma: PrismaService) {}

  async getUsers(page: number = 1, limit: number = 50, search?: string) {
    const skip = (page - 1) * limit;
    const where = search
      ? {
          OR: [
            { username: { contains: search, mode: "insensitive" as const } },
            { fullName: { contains: search, mode: "insensitive" as const } },
            { telegramId: { equals: BigInt(search) || BigInt(0) } },
            { auraId: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
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
      data: users.map((user) => ({
        ...user,
        telegramId: user.telegramId.toString(),
        referralsCount: user._count.referrals,
        purchasesCount: user._count.purchase,
      })),
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
          orderBy: { createdAt: "desc" },
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

    return {
      ...user,
      telegramId: user.telegramId.toString(),
    };
  }

  async updateUser(
    id: string,
    data: {
      level?: UserLevel;
      discount?: number;
      discountExpiresAt?: Date | null;
      grantedArgentum?: number;
      grantedAurum?: number;
      grantedPlatinum?: number;
    },
  ) {
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
