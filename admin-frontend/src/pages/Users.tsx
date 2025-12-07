import { useState, useEffect } from "react";
import {
  Container,
  Table,
  TextInput,
  Button,
  Group,
  Badge,
  ActionIcon,
  Modal,
  Select,
  NumberInput,
  Stack,
  Title,
  Pagination,
} from "@mantine/core";
import { IconSearch, IconEdit, IconTrash } from "@tabler/icons-react";
import { api } from "../api/client";
import { notifications } from "@mantine/notifications";
import dayjs from "dayjs";

const USER_LEVELS = [
  { value: "ferrum", label: "Ferrum" },
  { value: "argentum", label: "Argentum" },
  { value: "aurum", label: "Aurum" },
  { value: "platinum", label: "Platinum" },
];

export function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [editingUser, setEditingUser] = useState<any>(null);
  const [opened, setOpened] = useState(false);

  const loadUsers = async () => {
    try {
      const response = await api.get("/admin/users", {
        params: { page, limit: 50, search: search || undefined },
      });
      setUsers(response.data.data);
      setTotal(response.data.total);
    } catch (error: any) {
      notifications.show({
        color: "red",
        title: "Ошибка",
        message:
          error.response?.data?.message || "Не удалось загрузить пользователей",
      });
    }
  };

  useEffect(() => {
    loadUsers();
  }, [page, search]);

  const handleEdit = (user: any) => {
    setEditingUser(user);
    setOpened(true);
  };

  const handleSave = async () => {
    try {
      await api.put(`/admin/users/${editingUser.id}`, editingUser);
      notifications.show({
        color: "green",
        title: "Успешно",
        message: "Пользователь обновлен",
      });
      setOpened(false);
      loadUsers();
    } catch (error: any) {
      notifications.show({
        color: "red",
        title: "Ошибка",
        message:
          error.response?.data?.message || "Не удалось обновить пользователя",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Удалить пользователя?")) return;
    try {
      await api.delete(`/admin/users/${id}`);
      notifications.show({
        color: "green",
        title: "Успешно",
        message: "Пользователь удален",
      });
      loadUsers();
    } catch (error: any) {
      notifications.show({
        color: "red",
        title: "Ошибка",
        message:
          error.response?.data?.message || "Не удалось удалить пользователя",
      });
    }
  };

  return (
    <Container size="xl">
      <Title mb="md">Пользователи</Title>

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
            <Table.Th>ID</Table.Th>
            <Table.Th>Telegram ID</Table.Th>
            <Table.Th>Имя</Table.Th>
            <Table.Th>Уровень</Table.Th>
            <Table.Th>Скидка</Table.Th>
            <Table.Th>Рефералов</Table.Th>
            <Table.Th>Покупок</Table.Th>
            <Table.Th>Дата создания</Table.Th>
            <Table.Th>Действия</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {users.map((user) => (
            <Table.Tr key={user.id}>
              <Table.Td>{user.id.substring(0, 8)}...</Table.Td>
              <Table.Td>{user.telegramId}</Table.Td>
              <Table.Td>{user.fullName || user.username || "-"}</Table.Td>
              <Table.Td>
                <Badge>{user.level}</Badge>
              </Table.Td>
              <Table.Td>{user.discount}%</Table.Td>
              <Table.Td>{user.referralsCount || 0}</Table.Td>
              <Table.Td>{user.purchasesCount || 0}</Table.Td>
              <Table.Td>
                {dayjs(user.createdAt).format("DD.MM.YYYY HH:mm")}
              </Table.Td>
              <Table.Td>
                <Group gap="xs">
                  <ActionIcon variant="subtle" onClick={() => handleEdit(user)}>
                    <IconEdit size={16} />
                  </ActionIcon>
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    onClick={() => handleDelete(user.id)}
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
        title="Редактировать пользователя"
      >
        {editingUser && (
          <Stack>
            <Select
              label="Уровень"
              data={USER_LEVELS}
              value={editingUser.level}
              onChange={(value) =>
                setEditingUser({ ...editingUser, level: value })
              }
            />
            <NumberInput
              label="Скидка (%)"
              value={editingUser.discount}
              onChange={(value) =>
                setEditingUser({ ...editingUser, discount: Number(value) })
              }
            />
            <NumberInput
              label="Granted Argentum"
              value={editingUser.grantedArgentum}
              onChange={(value) =>
                setEditingUser({
                  ...editingUser,
                  grantedArgentum: Number(value),
                })
              }
            />
            <NumberInput
              label="Granted Aurum"
              value={editingUser.grantedAurum}
              onChange={(value) =>
                setEditingUser({ ...editingUser, grantedAurum: Number(value) })
              }
            />
            <NumberInput
              label="Granted Platinum"
              value={editingUser.grantedPlatinum}
              onChange={(value) =>
                setEditingUser({
                  ...editingUser,
                  grantedPlatinum: Number(value),
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
