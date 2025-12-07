import { useState, useEffect } from 'react';
import {
    Container,
    Title,
    Grid,
    Paper,
    Text,
    Stack,
    Group,
    Button,
    Card,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { BarChart, LineChart } from '@mantine/charts';
import { api } from '../api/client';
import { notifications } from '@mantine/notifications';

export function AnalyticsPage() {
    const [financialData, setFinancialData] = useState<any>(null);
    const [tariffRating, setTariffRating] = useState<any>(null);
    const [levelRating, setLevelRating] = useState<any>(null);
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [loading, setLoading] = useState(false);

    const loadAnalytics = async () => {
        setLoading(true);
        try {
            const [financial, tariff, level] = await Promise.all([
                api.get('/admin/analytics/financial', {
                    params: {
                        startDate: startDate?.toISOString(),
                        endDate: endDate?.toISOString(),
                    },
                }),
                api.get('/admin/analytics/tariff-rating'),
                api.get('/admin/analytics/level-rating'),
            ]);

            setFinancialData(financial.data);
            setTariffRating(tariff.data);
            setLevelRating(level.data);
        } catch (error: any) {
            notifications.show({
                color: 'red',
                title: 'Ошибка',
                message: error.response?.data?.message || 'Не удалось загрузить аналитику',
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAnalytics();
    }, []);

    const currencyData = financialData?.byCurrency
        ? Object.entries(financialData.byCurrency).map(([currency, amount]) => ({
              currency,
              amount: Number(amount),
          }))
        : [];

    const typeData = financialData?.byType
        ? Object.entries(financialData.byType).map(([type, amount]) => ({
              type,
              amount: Number(amount),
          }))
        : [];

    const levelData = financialData?.byLevel
        ? Object.entries(financialData.byLevel).map(([level, amount]) => ({
              level,
              amount: Number(amount),
          }))
        : [];

    const monthData = financialData?.byMonth
        ? Object.entries(financialData.byMonth)
              .sort()
              .map(([month, amount]) => ({
                  month,
                  amount: Number(amount),
              }))
        : [];

    return (
        <Container size="xl">
            <Title mb="md">Аналитика</Title>

            <Group mb="md">
                <DatePickerInput
                    label="Начало периода"
                    value={startDate}
                    onChange={(value: Date | null) => setStartDate(value)}
                    clearable
                />
                <DatePickerInput
                    label="Конец периода"
                    value={endDate}
                    onChange={(value: Date | null) => setEndDate(value)}
                    clearable
                />
                <Button onClick={loadAnalytics} loading={loading} mt="auto">
                    Обновить
                </Button>
            </Group>

            <Grid>
                <Grid.Col span={12}>
                    <Paper p="md" withBorder>
                        <Stack>
                            <Text size="xl" fw={700}>
                                Общая статистика
                            </Text>
                            <Grid>
                                <Grid.Col span={4}>
                                    <Card>
                                        <Text size="sm" c="dimmed">
                                            Общая выручка
                                        </Text>
                                        <Text size="xl" fw={700}>
                                            {financialData?.totalRevenue?.toFixed(2) || 0}
                                        </Text>
                                    </Card>
                                </Grid.Col>
                                <Grid.Col span={4}>
                                    <Card>
                                        <Text size="sm" c="dimmed">
                                            Всего покупок
                                        </Text>
                                        <Text size="xl" fw={700}>
                                            {financialData?.totalPurchases || 0}
                                        </Text>
                                    </Card>
                                </Grid.Col>
                                <Grid.Col span={4}>
                                    <Card>
                                        <Text size="sm" c="dimmed">
                                            Средний чек
                                        </Text>
                                        <Text size="xl" fw={700}>
                                            {financialData?.avgPurchaseAmount?.toFixed(2) || 0}
                                        </Text>
                                    </Card>
                                </Grid.Col>
                            </Grid>
                        </Stack>
                    </Paper>
                </Grid.Col>

                {currencyData.length > 0 && (
                    <Grid.Col span={6}>
                        <Paper p="md" withBorder>
                            <Text fw={700} mb="md">
                                Выручка по валютам
                            </Text>
                            <BarChart
                                data={currencyData}
                                dataKey="currency"
                                series={[{ name: 'amount', color: 'cyan' }]}
                                h={300}
                            />
                        </Paper>
                    </Grid.Col>
                )}

                {typeData.length > 0 && (
                    <Grid.Col span={6}>
                        <Paper p="md" withBorder>
                            <Text fw={700} mb="md">
                                Выручка по типам оплаты
                            </Text>
                            <BarChart
                                data={typeData}
                                dataKey="type"
                                series={[{ name: 'amount', color: 'blue' }]}
                                h={300}
                            />
                        </Paper>
                    </Grid.Col>
                )}

                {levelData.length > 0 && (
                    <Grid.Col span={6}>
                        <Paper p="md" withBorder>
                            <Text fw={700} mb="md">
                                Выручка по уровням
                            </Text>
                            <BarChart
                                data={levelData}
                                dataKey="level"
                                series={[{ name: 'amount', color: 'green' }]}
                                h={300}
                            />
                        </Paper>
                    </Grid.Col>
                )}

                {monthData.length > 0 && (
                    <Grid.Col span={6}>
                        <Paper p="md" withBorder>
                            <Text fw={700} mb="md">
                                Выручка по месяцам
                            </Text>
                            <LineChart
                                data={monthData}
                                dataKey="month"
                                series={[{ name: 'amount', color: 'violet' }]}
                                h={300}
                            />
                        </Paper>
                    </Grid.Col>
                )}

                {tariffRating && (
                    <Grid.Col span={12}>
                        <Paper p="md" withBorder>
                            <Text fw={700} mb="md">
                                Рейтинг тарифов
                            </Text>
                            <Grid>
                                {Object.entries(tariffRating.levels || {}).map(([level, data]: [string, any]) => (
                                    <Grid.Col key={level} span={3}>
                                        <Card>
                                            <Text size="sm" c="dimmed">
                                                {level}
                                            </Text>
                                            <Text size="lg" fw={700}>
                                                {data.revenue?.toFixed(2) || 0}
                                            </Text>
                                            <Text size="xs" c="dimmed">
                                                Покупок: {data.purchases || 0}
                                            </Text>
                                            <Text size="xs" c="dimmed">
                                                Пользователей: {data.users || 0}
                                            </Text>
                                        </Card>
                                    </Grid.Col>
                                ))}
                            </Grid>
                        </Paper>
                    </Grid.Col>
                )}

                {levelRating && (
                    <Grid.Col span={12}>
                        <Paper p="md" withBorder>
                            <Text fw={700} mb="md">
                                Рейтинг уровней
                            </Text>
                            <Grid>
                                {Object.entries(levelRating).map(([level, data]: [string, any]) => (
                                    <Grid.Col key={level} span={3}>
                                        <Card>
                                            <Text size="sm" c="dimmed">
                                                {level}
                                            </Text>
                                            <Text size="lg" fw={700}>
                                                {data.totalRevenue?.toFixed(2) || 0}
                                            </Text>
                                            <Text size="xs" c="dimmed">
                                                Пользователей: {data.count || 0}
                                            </Text>
                                            <Text size="xs" c="dimmed">
                                                Покупок: {data.totalPurchases || 0}
                                            </Text>
                                            <Text size="xs" c="dimmed">
                                                Средняя выручка: {data.avgRevenue?.toFixed(2) || 0}
                                            </Text>
                                        </Card>
                                    </Grid.Col>
                                ))}
                            </Grid>
                        </Paper>
                    </Grid.Col>
                )}
            </Grid>
        </Container>
    );
}

