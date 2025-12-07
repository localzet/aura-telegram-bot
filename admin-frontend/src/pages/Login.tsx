import { useState } from 'react';
import {
    Container,
    Paper,
    TextInput,
    PasswordInput,
    Button,
    Title,
    Stack,
    Alert,
} from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';

export function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const login = useAuthStore((state) => state.login);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await login(username, password);
            navigate('/');
        } catch (err: any) {
            setError(err.message || 'Ошибка входа');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container size={420} style={{ marginTop: '10vh' }}>
            <Paper withBorder shadow="md" p={30} radius="md">
                <Title order={2} ta="center" mb="xl">
                    Aura Bot Admin
                </Title>

                {error && (
                    <Alert icon={<IconAlertCircle size={16} />} color="red" mb="md">
                        {error}
                    </Alert>
                )}

                <form onSubmit={handleSubmit}>
                    <Stack>
                        <TextInput
                            label="Имя пользователя"
                            placeholder="admin"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                        <PasswordInput
                            label="Пароль"
                            placeholder="Пароль"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <Button type="submit" fullWidth loading={loading}>
                            Войти
                        </Button>
                    </Stack>
                </form>
            </Paper>
        </Container>
    );
}

