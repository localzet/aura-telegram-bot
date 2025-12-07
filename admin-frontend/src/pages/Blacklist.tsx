import { useState, useEffect } from 'react';
import {
    Container,
    Table,
    TextInput,
    Button,
    Group,
    Badge,
    ActionIcon,
    Modal,
    Stack,
    Title,
    Pagination,
    Switch,
} from '@mantine/core';
import { IconSearch, IconEdit, IconTrash, IconPlus } from '@tabler/icons-react';
import { api } from '../api/client';
import { notifications } from '@mantine/notifications';
import dayjs from 'dayjs';

export function BlacklistPage() {
    const [blacklist, setBlacklist] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [editingItem, setEditingItem] = useState<any>(null);
    const [opened, setOpened] = useState(false);
    const [isNew, setIsNew] = useState(false);

    const loadBlacklist = async () => {
        try {
            const response = await api.get('/admin/blacklist', {
                params: { page, limit: 50, search: search || undefined },
            });
            setBlacklist(response.data.data);
            setTotal(response.data.total);
        } catch (error: any) {
            notifications.show({
                color: 'red',
                title: 'Ошибка',
                message: error.response?.data?.message || 'Не удалось загрузить черный список',
            });
        }
    };

    useEffect(() => {
        loadBlacklist();
    }, [page, search]);

    const handleCreate = () => {
        setEditingItem({
            telegramId: '',
            auraId: '',
            reason: '',
            isActive: true,
        });
        setIsNew(true);
        setOpened(true);
    };

    const handleEdit = (item: any) => {
        setEditingItem({ ...item });
        setIsNew(false);
        setOpened(true);
    };

    const handleSave = async () => {
        try {
            if (isNew) {
                await api.post('/admin/blacklist', editingItem);
                notifications.show({
                    color: 'green',
                    title: 'Успешно',
                    message: 'Запись добавлена в черный список',
                });
            } else {
                await api.put(`/admin/blacklist/${editingItem.id}`, editingItem);
                notifications.show({
                    color: 'green',
                    title: 'Успешно',
                    message: 'Запись обновлена',
                });
            }
            setOpened(false);
            loadBlacklist();
        } catch (error: any) {
            notifications.show({
                color: 'red',
                title: 'Ошибка',
                message: error.response?.data?.message || 'Не удалось сохранить запись',
            });
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Удалить из черного списка?')) return;
        try {
            await api.delete(`/admin/blacklist/${id}`);
            notifications.show({
                color: 'green',
                title: 'Успешно',
                message: 'Запись удалена из черного списка',
            });
            loadBlacklist();
        } catch (error: any) {
            notifications.show({
                color: 'red',
                title: 'Ошибка',
                message: error.response?.data?.message || 'Не удалось удалить запись',
            });
        }
    };

    return (
        <Container size="xl">
            <Group justify="space-between" mb="md">
                <Title>Черный список</Title>
                <Button leftSection={<IconPlus size={16} />} onClick={handleCreate}>
                    Добавить
                </Button>
            </Group>

            <Group mb="md">
                <TextInput
                    placeholder="Поиск..."
                    leftSection={<IconSearch size={16} />}
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(1);
                    }}
                    style={{ flex: 1 }}
                />
            </Group>

            <Table striped highlightOnHover>
                <Table.Thead>
                    <Table.Tr>
                        <Table.Th>Telegram ID</Table.Th>
                        <Table.Th>Aura ID</Table.Th>
                        <Table.Th>Причина</Table.Th>
                        <Table.Th>Активен</Table.Th>
                        <Table.Th>Дата добавления</Table.Th>
                        <Table.Th>Действия</Table.Th>
                    </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                    {blacklist.map((item) => (
                        <Table.Tr key={item.id}>
                            <Table.Td>{item.telegramId || '-'}</Table.Td>
                            <Table.Td>{item.auraId || '-'}</Table.Td>
                            <Table.Td>{item.reason || '-'}</Table.Td>
                            <Table.Td>
                                <Badge color={item.isActive ? 'red' : 'gray'}>
                                    {item.isActive ? 'Да' : 'Нет'}
                                </Badge>
                            </Table.Td>
                            <Table.Td>
                                {dayjs(item.createdAt).format('DD.MM.YYYY HH:mm')}
                            </Table.Td>
                            <Table.Td>
                                <Group gap="xs">
                                    <ActionIcon
                                        variant="subtle"
                                        onClick={() => handleEdit(item)}
                                    >
                                        <IconEdit size={16} />
                                    </ActionIcon>
                                    <ActionIcon
                                        variant="subtle"
                                        color="red"
                                        onClick={() => handleDelete(item.id)}
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

            <Modal
                opened={opened}
                onClose={() => setOpened(false)}
                title={isNew ? 'Добавить в черный список' : 'Редактировать запись'}
            >
                {editingItem && (
                    <Stack>
                        <TextInput
                            label="Telegram ID"
                            value={editingItem.telegramId || ''}
                            onChange={(e) =>
                                setEditingItem({ ...editingItem, telegramId: e.target.value })
                            }
                            placeholder="123456789"
                        />
                        <TextInput
                            label="Aura ID"
                            value={editingItem.auraId || ''}
                            onChange={(e) =>
                                setEditingItem({ ...editingItem, auraId: e.target.value })
                            }
                            placeholder="user123"
                        />
                        <TextInput
                            label="Причина"
                            value={editingItem.reason || ''}
                            onChange={(e) =>
                                setEditingItem({ ...editingItem, reason: e.target.value })
                            }
                            placeholder="Нарушение правил"
                        />
                        <Switch
                            label="Активен"
                            checked={editingItem.isActive}
                            onChange={(e) =>
                                setEditingItem({
                                    ...editingItem,
                                    isActive: e.currentTarget.checked,
                                })
                            }
                        />
                        <Button onClick={handleSave}>Сохранить</Button>
                    </Stack>
                )}
            </Modal>
        </Container>
    );
}

