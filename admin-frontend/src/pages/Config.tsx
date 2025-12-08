import { useState, useEffect } from "react";
import {
  Container,
  Title,
  Paper,
  Stack,
  Group,
  Button,
  NumberInput,
  Switch,
  Text,
  Divider,
  Badge,
  Alert,
} from "@mantine/core";
import {
  IconSettings,
  IconDeviceFloppy,
  IconAlertCircle,
} from "@tabler/icons-react";
import { api } from "../api/client";
import { notifications } from "@mantine/notifications";

interface PricingConfig {
  basePrice: number;
  discounts: {
    1: number;
    3: number;
    6: number;
    12: number;
  };
  levels: {
    ferrum: { persistDiscount: number; maxDiscount: number };
    argentum: { persistDiscount: number; maxDiscount: number };
    aurum: { persistDiscount: number; maxDiscount: number };
    platinum: { persistDiscount: number; maxDiscount: number };
  };
  referral: {
    bonusPercent: number;
    maxBonus: number;
  };
}

export function ConfigPage() {
  const [config, setConfig] = useState<any>(null);
  const [pricing, setPricing] = useState<PricingConfig | null>(null);
  const [closedMode, setClosedMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const response = await api.get("/admin/config");
      setConfig(response.data);
      if (response.data.pricing) {
        setPricing(response.data.pricing);
      }
      if (response.data.closedMode !== undefined) {
        setClosedMode(response.data.closedMode);
      }
    } catch (error: any) {
      notifications.show({
        color: "red",
        title: "Ошибка",
        message:
          error.response?.data?.message || "Не удалось загрузить конфигурацию",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const handleSavePricing = async () => {
    if (!pricing) return;
    setSaving(true);
    try {
      await api.put("/admin/config", {
        pricing,
      });
      notifications.show({
        color: "green",
        title: "Успешно",
        message: "Ценовая политика обновлена",
      });
      loadConfig();
    } catch (error: any) {
      notifications.show({
        color: "red",
        title: "Ошибка",
        message:
          error.response?.data?.message || "Не удалось сохранить конфигурацию",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveClosedMode = async () => {
    setSaving(true);
    try {
      await api.put("/admin/config", {
        closedMode,
      });
      notifications.show({
        color: "green",
        title: "Успешно",
        message: "Режим закрытого доступа обновлен",
      });
      loadConfig();
    } catch (error: any) {
      notifications.show({
        color: "red",
        title: "Ошибка",
        message:
          error.response?.data?.message || "Не удалось сохранить конфигурацию",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Container size="xl">
        <Title mb="md">Загрузка...</Title>
      </Container>
    );
  }

  return (
    <Container size="xl">
      <Title mb="md">Конфигурация</Title>

      <Stack gap="md">
        {/* Закрытый режим */}
        <Paper p="md" withBorder>
          <Stack gap="md">
            <Group justify="space-between">
              <div>
                <Text fw={700} size="lg" mb={4}>
                  Закрытый режим
                </Text>
                <Text size="sm" c="dimmed">
                  При включении доступ к боту только по приглашениям
                </Text>
              </div>
              <Switch
                checked={closedMode}
                onChange={(e) => setClosedMode(e.currentTarget.checked)}
              />
            </Group>
            <Button
              onClick={handleSaveClosedMode}
              loading={saving}
              leftSection={<IconDeviceFloppy size={16} />}
            >
              Сохранить
            </Button>
          </Stack>
        </Paper>

        {/* Ценовая политика */}
        {pricing && (
          <Paper p="md" withBorder>
            <Stack gap="md">
              <Group justify="space-between">
                <div>
                  <Text fw={700} size="lg" mb={4}>
                    Ценовая политика
                  </Text>
                  <Text size="sm" c="dimmed">
                    Настройка базовой цены, скидок и уровней
                  </Text>
                </div>
              </Group>

              <Divider />

              <NumberInput
                label="Базовая цена (руб/мес)"
                value={pricing.basePrice}
                onChange={(value) =>
                  setPricing({
                    ...pricing,
                    basePrice: Number(value) || 0,
                  })
                }
                min={0}
              />

              <Text fw={600} mt="md">
                Скидки за период:
              </Text>
              <Group grow>
                <NumberInput
                  label="3 месяца (коэффициент)"
                  value={pricing.discounts[3]}
                  onChange={(value) =>
                    setPricing({
                      ...pricing,
                      discounts: {
                        ...pricing.discounts,
                        3: Number(value) || 1,
                      },
                    })
                  }
                  min={0}
                  max={1}
                  step={0.01}
                  decimalScale={2}
                />
                <NumberInput
                  label="6 месяцев (коэффициент)"
                  value={pricing.discounts[6]}
                  onChange={(value) =>
                    setPricing({
                      ...pricing,
                      discounts: {
                        ...pricing.discounts,
                        6: Number(value) || 1,
                      },
                    })
                  }
                  min={0}
                  max={1}
                  step={0.01}
                  decimalScale={2}
                />
                <NumberInput
                  label="12 месяцев (коэффициент)"
                  value={pricing.discounts[12]}
                  onChange={(value) =>
                    setPricing({
                      ...pricing,
                      discounts: {
                        ...pricing.discounts,
                        12: Number(value) || 1,
                      },
                    })
                  }
                  min={0}
                  max={1}
                  step={0.01}
                  decimalScale={2}
                />
              </Group>

              <Text fw={600} mt="md">
                Уровни пользователей:
              </Text>

              {(["ferrum", "argentum", "aurum", "platinum"] as const).map(
                (level) => (
                  <Paper key={level} p="sm" withBorder>
                    <Stack gap="xs">
                      <Group justify="space-between">
                        <Badge size="lg">{level.toUpperCase()}</Badge>
                      </Group>
                      <Group grow>
                        <NumberInput
                          label="Постоянная скидка (%)"
                          value={pricing.levels[level].persistDiscount}
                          onChange={(value) =>
                            setPricing({
                              ...pricing,
                              levels: {
                                ...pricing.levels,
                                [level]: {
                                  ...pricing.levels[level],
                                  persistDiscount: Number(value) || 0,
                                },
                              },
                            })
                          }
                          min={0}
                          max={100}
                        />
                        <NumberInput
                          label="Максимальная скидка (%)"
                          value={pricing.levels[level].maxDiscount}
                          onChange={(value) =>
                            setPricing({
                              ...pricing,
                              levels: {
                                ...pricing.levels,
                                [level]: {
                                  ...pricing.levels[level],
                                  maxDiscount: Number(value) || 0,
                                },
                              },
                            })
                          }
                          min={0}
                          max={100}
                        />
                      </Group>
                    </Stack>
                  </Paper>
                ),
              )}

              <Text fw={600} mt="md">
                Реферальная система:
              </Text>
              <Group grow>
                <NumberInput
                  label="Бонус за реферала (%)"
                  value={pricing.referral.bonusPercent}
                  onChange={(value) =>
                    setPricing({
                      ...pricing,
                      referral: {
                        ...pricing.referral,
                        bonusPercent: Number(value) || 0,
                      },
                    })
                  }
                  min={0}
                  max={100}
                />
                <NumberInput
                  label="Максимальный бонус (%)"
                  value={pricing.referral.maxBonus}
                  onChange={(value) =>
                    setPricing({
                      ...pricing,
                      referral: {
                        ...pricing.referral,
                        maxBonus: Number(value) || 0,
                      },
                    })
                  }
                  min={0}
                  max={100}
                />
              </Group>

              <Alert
                icon={<IconAlertCircle size={16} />}
                color="yellow"
                mt="md"
              >
                Изменения вступят в силу после сохранения. Текущие цены будут
                пересчитаны при следующей покупке.
              </Alert>

              <Button
                onClick={handleSavePricing}
                loading={saving}
                leftSection={<IconDeviceFloppy size={16} />}
                mt="md"
              >
                Сохранить ценовую политику
              </Button>
            </Stack>
          </Paper>
        )}
      </Stack>
    </Container>
  );
}
