import { useState, useEffect } from 'react';
import {
    Container,
    Title,
    Paper,
    Text,
    Select,
    Group,
    Card,
    Stack,
    Badge,
    NumberInput,
    Button,
    Loader,
    Center,
} from '@mantine/core';
import { IconNetwork, IconUsers, IconChartBar } from '@tabler/icons-react';
import { api } from '../api/client';
import { notifications } from '@mantine/notifications';
import ForceGraph2D from 'react-force-graph-2d';

interface Node {
    id: string;
    label: string;
    telegramId: string;
    username?: string;
    fullName?: string;
    level: string;
    createdAt: string;
    group: number;
}

interface Edge {
    from: string;
    to: string;
    id: string;
    createdAt: string;
}

export function ReferralsPage() {
    const [network, setNetwork] = useState<{ nodes: Node[]; edges: Edge[] } | null>(null);
    const [stats, setStats] = useState<any>(null);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [depth, setDepth] = useState(3);
    const [loading, setLoading] = useState(false);
    const [users, setUsers] = useState<any[]>([]);

    const loadUsers = async () => {
        try {
            const response = await api.get('/admin/users', { params: { limit: 1000 } });
            setUsers(response.data.data);
        } catch (error: any) {
            notifications.show({
                color: 'red',
                title: 'Ошибка',
                message: 'Не удалось загрузить пользователей',
            });
        }
    };

    const loadNetwork = async () => {
        setLoading(true);
        try {
            const [networkResponse, statsResponse] = await Promise.all([
                api.get('/admin/referrals/network', {
                    params: {
                        userId: selectedUserId || undefined,
                        depth,
                    },
                }),
                api.get('/admin/referrals/stats'),
            ]);

            setNetwork(networkResponse.data);
            setStats(statsResponse.data);
        } catch (error: any) {
            notifications.show({
                color: 'red',
                title: 'Ошибка',
                message: error.response?.data?.message || 'Не удалось загрузить реферальную сеть',
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUsers();
        loadNetwork();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        loadNetwork();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedUserId, depth]);


    const getLevelColor = (level: string): string => {
        switch (level) {
            case 'platinum':
                return '#e8e8e8';
            case 'aurum':
                return '#ffd700';
            case 'argentum':
                return '#c0c0c0';
            case 'ferrum':
            default:
                return '#cd7f32';
        }
    };


    if (loading && !network) {
        return (
            <Container size="xl">
                <Center h="60vh">
                    <Loader size="lg" />
                </Center>
            </Container>
        );
    }

    return (
        <Container size="xl">
            <Title mb="md">Реферальная сеть</Title>

            {stats && (
                <Group mb="md">
                    <Card withBorder p="md" style={{ flex: 1 }}>
                        <Group>
                            <IconUsers size={24} />
                            <div>
                                <Text size="sm" c="dimmed">
                                    Всего рефералов
                                </Text>
                                <Text size="xl" fw={700}>
                                    {stats.totalReferrals}
                                </Text>
                            </div>
                        </Group>
                    </Card>
                    <Card withBorder p="md" style={{ flex: 1 }}>
                        <Group>
                            <IconChartBar size={24} />
                            <div>
                                <Text size="sm" c="dimmed">
                                    Среднее на пользователя
                                </Text>
                                <Text size="xl" fw={700}>
                                    {stats.averageReferralsPerUser.toFixed(2)}
                                </Text>
                            </div>
                        </Group>
                    </Card>
                </Group>
            )}

            <Paper p="md" withBorder mb="md">
                <Stack>
                    <Group>
                        <Select
                            label="Фильтр по пользователю"
                            placeholder="Все пользователи"
                            data={users.map((u) => ({
                                value: u.id,
                                label: `${u.fullName || u.username || u.telegramId} (${u.level})`,
                            }))}
                            value={selectedUserId}
                            onChange={(value) => setSelectedUserId(value)}
                            clearable
                            searchable
                            style={{ flex: 1 }}
                        />
                        <NumberInput
                            label="Глубина"
                            value={depth}
                            onChange={(value) => setDepth(Number(value) || 3)}
                            min={1}
                            max={10}
                            style={{ width: 120 }}
                        />
                        <Button onClick={loadNetwork} mt="auto" loading={loading}>
                            Обновить
                        </Button>
                    </Group>
                </Stack>
            </Paper>

            {network && network.nodes.length > 0 ? (
                <Paper p="md" withBorder>
                    <Text fw={700} mb="md">
                        Граф реферальной сети ({network.nodes.length} узлов, {network.edges.length} связей)
                    </Text>
                    <div style={{ border: '1px solid #373a40', borderRadius: '8px', overflow: 'hidden' }}>
                        <ForceGraph2D
                            graphData={{
                                nodes: network.nodes.map((n) => ({
                                    ...n,
                                    color: getLevelColor(n.level),
                                })),
                                links: network.edges.map((e) => ({
                                    source: e.from,
                                    target: e.to,
                                    id: e.id,
                                })),
                            }}
                            nodeLabel={(node) =>
                                `${node.label}\nTelegram ID: ${node.telegramId}\nУровень: ${node.level}`
                            }
                            nodeColor={(node) => getLevelColor(node.level)}
                            nodeVal={() => 8}
                            linkDirectionalArrowLength={6}
                            linkDirectionalArrowRelPos={1}
                            linkWidth={2}
                            linkColor={() => 'rgba(255, 255, 255, 0.3)'}
                            backgroundColor="#1a1b1e"
                            width={typeof window !== 'undefined' ? window.innerWidth - 100 : 1200}
                            height={600}
                            onNodeClick={(node) => {
                                setSelectedUserId(node.id);
                            }}
                            onNodeRightClick={() => {
                                setSelectedUserId(null);
                            }}
                        />
                    </div>

                    <Group mt="md" gap="xs">
                        <Badge color="gray">Platinum</Badge>
                        <Badge color="yellow">Aurum</Badge>
                        <Badge color="gray" variant="light">Argentum</Badge>
                        <Badge color="orange">Ferrum</Badge>
                    </Group>
                </Paper>
            ) : (
                <Paper p="md" withBorder>
                    <Center h={400}>
                        <Stack align="center">
                            <IconNetwork size={48} stroke={1.5} />
                            <Text c="dimmed">Реферальная сеть пуста</Text>
                        </Stack>
                    </Center>
                </Paper>
            )}

            {stats && stats.topInviters && stats.topInviters.length > 0 && (
                <Paper p="md" withBorder mt="md">
                    <Text fw={700} mb="md">
                        Топ приглашающих
                    </Text>
                    <Stack gap="xs">
                        {stats.topInviters.map((item: any, index: number) => (
                            <Group key={item.user?.id || index} justify="space-between" p="xs" style={{ border: '1px solid #373a40', borderRadius: '4px' }}>
                                <div>
                                    <Text fw={500}>
                                        {item.user?.fullName || item.user?.username || `ID: ${item.user?.telegramId}`}
                                    </Text>
                                    <Text size="xs" c="dimmed">
                                        {item.user?.level} • Telegram ID: {item.user?.telegramId}
                                    </Text>
                                </div>
                                <Badge size="lg" variant="light">
                                    {item.referralsCount} рефералов
                                </Badge>
                            </Group>
                        ))}
                    </Stack>
                </Paper>
            )}
        </Container>
    );
}

