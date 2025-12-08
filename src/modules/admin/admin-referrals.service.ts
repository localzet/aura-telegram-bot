import { Injectable } from '@nestjs/common';
import { PrismaService } from '@common/services/prisma.service';

@Injectable()
export class AdminReferralsService {
    constructor(private prisma: PrismaService) {}

    async getReferralNetwork(userId?: string, depth: number = 3) {
        // Get all referrals
        const referrals = await this.prisma.referral.findMany({
            include: {
                inviter: {
                    select: {
                        id: true,
                        telegramId: true,
                        username: true,
                        fullName: true,
                        level: true,
                        createdAt: true,
                    },
                },
                invited: {
                    select: {
                        id: true,
                        telegramId: true,
                        username: true,
                        fullName: true,
                        level: true,
                        createdAt: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        // Build graph structure
        const nodes = new Map<string, any>();
        const edges: any[] = [];

        // Add all users as nodes
        referrals.forEach((ref) => {
            // Add inviter node
            if (!nodes.has(ref.inviter.id)) {
                nodes.set(ref.inviter.id, {
                    id: ref.inviter.id,
                    label: ref.inviter.fullName || ref.inviter.username || `ID: ${ref.inviter.telegramId.toString()}`,
                    telegramId: ref.inviter.telegramId.toString(),
                    username: ref.inviter.username,
                    fullName: ref.inviter.fullName,
                    level: ref.inviter.level,
                    createdAt: ref.inviter.createdAt,
                    group: this.getLevelGroup(ref.inviter.level),
                });
            }

            // Add invited node
            if (!nodes.has(ref.invited.id)) {
                nodes.set(ref.invited.id, {
                    id: ref.invited.id,
                    label: ref.invited.fullName || ref.invited.username || `ID: ${ref.invited.telegramId.toString()}`,
                    telegramId: ref.invited.telegramId.toString(),
                    username: ref.invited.username,
                    fullName: ref.invited.fullName,
                    level: ref.invited.level,
                    createdAt: ref.invited.createdAt,
                    group: this.getLevelGroup(ref.invited.level),
                });
            }

            // Add edge
            edges.push({
                from: ref.inviter.id,
                to: ref.invited.id,
                id: ref.id,
                createdAt: ref.createdAt,
            });
        });

        // If userId specified, filter to show only that user's network
        if (userId) {
            const userNetwork = this.buildUserNetwork(userId, Array.from(nodes.values()), edges, depth);
            return {
                nodes: userNetwork.nodes,
                edges: userNetwork.edges,
                totalNodes: nodes.size,
                totalEdges: edges.length,
            };
        }

        return {
            nodes: Array.from(nodes.values()),
            edges,
            totalNodes: nodes.size,
            totalEdges: edges.length,
        };
    }

    private buildUserNetwork(
        userId: string,
        allNodes: any[],
        allEdges: any[],
        depth: number,
    ): { nodes: any[]; edges: any[] } {
        const nodeMap = new Map(allNodes.map((n) => [n.id, n]));
        const edgeMap = new Map<string, any>();
        allEdges.forEach((e) => {
            const key = `${e.from}-${e.to}`;
            if (!edgeMap.has(key)) {
                edgeMap.set(key, e);
            }
        });

        const visitedNodes = new Set<string>();
        const visitedEdges = new Set<string>();
        const resultNodes: any[] = [];
        const resultEdges: any[] = [];

        const traverse = (currentUserId: string, currentDepth: number) => {
            if (currentDepth < 0 || visitedNodes.has(currentUserId)) {
                return;
            }

            const node = nodeMap.get(currentUserId);
            if (!node) {
                return;
            }

            visitedNodes.add(currentUserId);
            resultNodes.push(node);

            // Find all edges where this user is inviter (outgoing)
            allEdges.forEach((edge) => {
                if (edge.from === currentUserId) {
                    const edgeKey = `${edge.from}-${edge.to}`;
                    if (!visitedEdges.has(edgeKey)) {
                        visitedEdges.add(edgeKey);
                        resultEdges.push(edge);
                        traverse(edge.to, currentDepth - 1);
                    }
                }
            });

            // Find edge where this user is invited (incoming)
            allEdges.forEach((edge) => {
                if (edge.to === currentUserId) {
                    const edgeKey = `${edge.from}-${edge.to}`;
                    if (!visitedEdges.has(edgeKey)) {
                        visitedEdges.add(edgeKey);
                        resultEdges.push(edge);
                        if (!visitedNodes.has(edge.from)) {
                            traverse(edge.from, currentDepth - 1);
                        }
                    }
                }
            });
        };

        traverse(userId, depth);

        return {
            nodes: resultNodes,
            edges: resultEdges,
        };
    }

    private getLevelGroup(level: string): number {
        switch (level) {
            case 'platinum':
                return 1;
            case 'aurum':
                return 2;
            case 'argentum':
                return 3;
            case 'ferrum':
            default:
                return 4;
        }
    }

    async getReferralStats() {
        const [totalReferrals, totalUsers, topInviters] = await Promise.all([
            this.prisma.referral.count(),
            this.prisma.user.count(),
            this.prisma.referral.groupBy({
                by: ['inviterId'],
                _count: {
                    id: true,
                },
                orderBy: {
                    _count: {
                        id: 'desc',
                    },
                },
                take: 10,
            }),
        ]);

        const topInvitersWithDetails = await Promise.all(
            topInviters.map(async (item) => {
                const user = await this.prisma.user.findUnique({
                    where: { id: item.inviterId },
                    select: {
                        id: true,
                        telegramId: true,
                        username: true,
                        fullName: true,
                        level: true,
                    },
                });
                return {
                    user: user
                        ? {
                              ...user,
                              telegramId: user.telegramId.toString(),
                          }
                        : null,
                    referralsCount: item._count.id,
                };
            }),
        );

        return {
            totalReferrals,
            totalUsers,
            averageReferralsPerUser: totalUsers > 0 ? totalReferrals / totalUsers : 0,
            topInviters: topInvitersWithDetails,
        };
    }
}

