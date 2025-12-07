import { useState, useEffect } from 'react';
import {
    Container,
    Table,
    Select,
    Button,
    Group,
    Badge,
    ActionIcon,
    Modal,
    Stack,
    Title,
    Pagination,
    TextInput,
} from '@mantine/core';
import { IconEdit, IconTrash } from '@tabler/icons-react';
import { api } from '../api/client';
import { notifications } from '@mantine/notifications';
import dayjs from 'dayjs';

const STATUSES = [
    { value: 'new', label: 'Новый' },
    { value: 'pending', label: 'В обработке' },
    { value: 'paid', label: 'Оплачен' },
    { value: 'cancel', label: 'Отменен' },
];

const TYPES = [
    { value: 'crypto', label: 'Криптовалюта' },
    { value: 'yookasa', label: 'YooKassa' },
    { value: 'telegram', label: 'Telegram' },
];

export function PurchasesPage() {
    const [purchases, setPurchases] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState<string | null>(null);
    const [typeFilter, setTypeFilter] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [editingPurchase, setEditingPurchase] = useState<any>(null);
    const [opened, setOpened] = useState(false);

    const loadPurchases = async () => {
        setLoading(true);
        try {
            const response = await api.get('/admin/purchases', {
                params: {
                    page,
                    limit: 50,
                    status: statusFilter || undefined,
                    type: typeFilter || undefined,
                },
            });
            setPurchases(response.data.data);
            setTotal(response.data.total);
        } catch (error: any) {
            notifications.show({
                color: 'red',
                title: 'Ошибка',
                message: error.response?.data?.message || 'Не удалось загрузить транзакции',
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPurchases();
    }, [page, statusFilter, typeFilter]);

    const handleStatusChange = async (id: string, status: string) => {
        try {
            await api.put(`/admin/purchases/${id}/status`, { status });
            notifications.show({
                color: 'green',
                title: 'Успешно',
                message: 'Статус обновлен',
            });
            loadPurchases();
        } catch (error: any) {
            notifications.show({
                color: 'red',
                title: 'Ошибка',
                message: error.response?.data?.message || 'Не удалось обновить статус',
            });
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Удалить транзакцию?')) return;
        try {
            await api.delete(`/admin/purchases/${id}`);
            notifications.show({
                color: 'green',
                title: 'Успешно',
                message: 'Транзакция удалена',
            });
            loadPurchases();
        } catch (error: any) {
            notifications.show({
                color: 'red',
                title: 'Ошибка',
                message: error.response?.data?.message || 'Не удалось удалить транзакцию',
            });
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'paid':
                return 'green';
            case 'pending':
                return 'yellow';
            case 'cancel':
                return 'red';
            default:
                return 'gray';
        }
    };

    return (
        <Container size="xl">
            <Title mb="md">Транзакции</Title>

            <Group mb="md">
                <Select
                    placeholder="Статус"
                    data={STATUSES}
                    value={statusFilter}
                    onChange={setStatusFilter}
                    clearable
                />
                <Select
                    placeholder="Тип"
                    data={TYPES}
                    value={typeFilter}
                    onChange={setTypeFilter}
                    clearable
                />
            </Group>

            <Table striped highlightOnHover>
                <Table.Thead>
                    <Table.Tr>
                        <Table.Th>ID</Table.Th>
                        <Table.Th>Пользователь</Table.Th>
                        <Table.Th>Тип</Table.Th>
                        <Table.Th>Статус</Table.Th>
                        <Table.Th>Сумма</Table.Th>
                        <Table.Th>Месяцев</Table.Th>
                        <Table.Th>Промокод</Table.Th>
                        <Table.Th>Дата создания</Table.Th>
                        <Table.Th>Действия</Table.Th>
                    </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                    {purchases.map((purchase) => (
                        <Table.Tr key={purchase.id}>
                            <Table.Td>{purchase.id.substring(0, 8)}...</Table.Td>
                            <Table.Td>
                                {purchase.user?.fullName || purchase.user?.username || '-'}
                            </Table.Td>
                            <Table.Td>{purchase.type}</Table.Td>
                            <Table.Td>
                                <Badge color={getStatusColor(purchase.status)}>
                                    {purchase.status}
                                </Badge>
                            </Table.Td>
                            <Table.Td>
                                {purchase.amount} {purchase.currency}
                            </Table.Td>
                            <Table.Td>{purchase.month}</Table.Td>
                            <Table.Td>
                                {purchase.promoCode?.code || '-'}
                            </Table.Td>
                            <Table.Td>
                                {dayjs(purchase.createdAt).format('DD.MM.YYYY HH:mm')}
                            </Table.Td>
                            <Table.Td>
                                <Group gap="xs">
                                    <Select
                                        data={STATUSES}
                                        value={purchase.status}
                                        onChange={(value) =>
                                            value && handleStatusChange(purchase.id, value)
                                        }
                                        size="xs"
                                        style={{ width: 120 }}
                                    />
                                    <ActionIcon
                                        variant="subtle"
                                        color="red"
                                        onClick={() => handleDelete(purchase.id)}
                                    >
                                        <IconTrash size={16} />
                                    </ActionIcon>
                                </Group>
                            </Table.Td>
                        </Table.Tr>
                    ))}
                </Table.Tbody>
            </Table>

            <Pagination
                value={page}
                onChange={setPage}
                total={Math.ceil(total / 50)}
                mt="md"
            />
        </Container>
    );
}

