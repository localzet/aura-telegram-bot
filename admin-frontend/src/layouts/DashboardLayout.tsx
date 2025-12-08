import { Outlet, NavLink } from 'react-router-dom';
import {
    AppShell,
    Group,
    Button,
    Text,
    NavLink as MantineNavLink,
    Stack,
} from '@mantine/core';
import { IconUsers, IconShoppingCart, IconChartBar, IconTicket, IconBan, IconLogout, IconNetwork, IconSettings } from '@tabler/icons-react';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';

const navItems = [
    { to: '/users', label: 'Пользователи', icon: IconUsers },
    { to: '/purchases', label: 'Транзакции', icon: IconShoppingCart },
    { to: '/analytics', label: 'Аналитика', icon: IconChartBar },
    { to: '/referrals', label: 'Реферальная сеть', icon: IconNetwork },
    { to: '/promocodes', label: 'Промокоды', icon: IconTicket },
    { to: '/blacklist', label: 'Черный список', icon: IconBan },
    { to: '/config', label: 'Конфигурация', icon: IconSettings },
];

export function DashboardLayout() {
    const logout = useAuthStore((state) => state.logout);
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <AppShell
            navbar={{
                width: 250,
                breakpoint: 'sm',
            }}
            header={{
                height: 60,
            }}
            padding="md"
        >
            <AppShell.Header>
                <Group h="100%" px="md" justify="space-between">
                    <Text fw={700} size="lg">
                        Aura Bot Admin
                    </Text>
                    <Button variant="subtle" leftSection={<IconLogout size={16} />} onClick={handleLogout}>
                        Выйти
                    </Button>
                </Group>
            </AppShell.Header>

            <AppShell.Navbar p="md">
                <Stack gap="xs">
                    {navItems.map((item) => (
                        <MantineNavLink
                            key={item.to}
                            component={NavLink}
                            to={item.to}
                            label={item.label}
                            leftSection={<item.icon size={20} />}
                        />
                    ))}
                </Stack>
            </AppShell.Navbar>

            <AppShell.Main>
                <Outlet />
            </AppShell.Main>
        </AppShell>
    );
}

