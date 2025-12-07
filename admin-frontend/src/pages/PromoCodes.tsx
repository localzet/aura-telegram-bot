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
  Stack,
  Title,
  Pagination,
  NumberInput,
  Switch,
  Text,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { IconSearch, IconEdit, IconTrash, IconPlus } from "@tabler/icons-react";
import { api } from "../api/client";
import { notifications } from "@mantine/notifications";
import dayjs from "dayjs";

export function PromoCodesPage() {
  const [promoCodes, setPromoCodes] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [editingCode, setEditingCode] = useState<any>(null);
  const [opened, setOpened] = useState(false);
  const [isNew, setIsNew] = useState(false);

  const loadPromoCodes = async () => {
    try {
      const response = await api.get("/admin/promocodes", {
        params: { page, limit: 50, search: search || undefined },
      });
      setPromoCodes(response.data.data);
      setTotal(response.data.total);
    } catch (error: any) {
      notifications.show({
        color: "red",
        title: "Ошибка",
        message:
          error.response?.data?.message || "Не удалось загрузить промокоды",
      });
    }
  };

  useEffect(() => {
    loadPromoCodes();
  }, [page, search]);

  const handleCreate = () => {
    setEditingCode({
      code: "",
      discount: 0,
      maxUses: null,
      expiresAt: null,
      isActive: true,
      description: "",
    });
    setIsNew(true);
    setOpened(true);
  };

  const handleEdit = (code: any) => {
    setEditingCode({ ...code });
    setIsNew(false);
    setOpened(true);
  };

  const handleSave = async () => {
    try {
      if (isNew) {
        await api.post("/admin/promocodes", editingCode);
        notifications.show({
          color: "green",
          title: "Успешно",
          message: "Промокод создан",
        });
      } else {
        await api.put(`/admin/promocodes/${editingCode.id}`, editingCode);
        notifications.show({
          color: "green",
          title: "Успешно",
          message: "Промокод обновлен",
        });
      }
      setOpened(false);
      loadPromoCodes();
    } catch (error: any) {
      notifications.show({
        color: "red",
        title: "Ошибка",
        message:
          error.response?.data?.message || "Не удалось сохранить промокод",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Удалить промокод?")) return;
    try {
      await api.delete(`/admin/promocodes/${id}`);
      notifications.show({
        color: "green",
        title: "Успешно",
        message: "Промокод удален",
      });
      loadPromoCodes();
    } catch (error: any) {
      notifications.show({
        color: "red",
        title: "Ошибка",
        message: error.response?.data?.message || "Не удалось удалить промокод",
      });
    }
  };

  return (
    <Container size="xl">
      <Group justify="space-between" mb="md">
        <Title>Промокоды</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={handleCreate}>
          Создать
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
            <Table.Th>Код</Table.Th>
            <Table.Th>Скидка</Table.Th>
            <Table.Th>Использований</Table.Th>
            <Table.Th>Макс. использований</Table.Th>
            <Table.Th>Активен</Table.Th>
            <Table.Th>Истекает</Table.Th>
            <Table.Th>Дата создания</Table.Th>
            <Table.Th>Действия</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {promoCodes.map((code) => (
            <Table.Tr key={code.id}>
              <Table.Td>
                <Text fw={500}>{code.code}</Text>
              </Table.Td>
              <Table.Td>{code.discount}%</Table.Td>
              <Table.Td>{code.usesCount || 0}</Table.Td>
              <Table.Td>{code.maxUses || "∞"}</Table.Td>
              <Table.Td>
                <Badge color={code.isActive ? "green" : "red"}>
                  {code.isActive ? "Да" : "Нет"}
                </Badge>
              </Table.Td>
              <Table.Td>
                {code.expiresAt
                  ? dayjs(code.expiresAt).format("DD.MM.YYYY")
                  : "Никогда"}
              </Table.Td>
              <Table.Td>
                {dayjs(code.createdAt).format("DD.MM.YYYY HH:mm")}
              </Table.Td>
              <Table.Td>
                <Group gap="xs">
                  <ActionIcon variant="subtle" onClick={() => handleEdit(code)}>
                    <IconEdit size={16} />
                  </ActionIcon>
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    onClick={() => handleDelete(code.id)}
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
        title={isNew ? "Создать промокод" : "Редактировать промокод"}
      >
        {editingCode && (
          <Stack>
            <TextInput
              label="Код"
              value={editingCode.code}
              onChange={(e) =>
                setEditingCode({ ...editingCode, code: e.target.value })
              }
              required
            />
            <NumberInput
              label="Скидка (%)"
              value={editingCode.discount}
              onChange={(value) =>
                setEditingCode({ ...editingCode, discount: Number(value) })
              }
              min={0}
              max={100}
              required
            />
            <NumberInput
              label="Максимум использований"
              value={editingCode.maxUses || ""}
              onChange={(value) =>
                setEditingCode({
                  ...editingCode,
                  maxUses: value ? Number(value) : null,
                })
              }
              min={1}
            />
            <DatePickerInput
              label="Дата истечения"
              value={
                editingCode.expiresAt ? new Date(editingCode.expiresAt) : null
              }
              onChange={(value) => {
                const dateValue = value as Date | null;
                setEditingCode({
                  ...editingCode,
                  expiresAt: dateValue ? dateValue.toISOString() : null,
                });
              }}
              clearable
            />
            <TextInput
              label="Описание"
              value={editingCode.description || ""}
              onChange={(e) =>
                setEditingCode({ ...editingCode, description: e.target.value })
              }
            />
            <Switch
              label="Активен"
              checked={editingCode.isActive}
              onChange={(e) =>
                setEditingCode({
                  ...editingCode,
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
