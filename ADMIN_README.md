# Aura Bot Admin Panel

Админ-панель для управления ботом Aura.

## Возможности

- **Управление пользователями**: просмотр, редактирование, удаление пользователей
- **Управление транзакциями**: просмотр всех покупок, изменение статусов
- **Аналитика финансов**: анализ выручки, статистика по валютам, типам оплаты, уровням
- **Рейтинг тарифов и уровней**: статистика по тарифам и уровням пользователей
- **Управление промокодами**: создание, редактирование, удаление промокодов
- **Управление черным списком**: добавление/удаление пользователей из ЧС

## Настройка

### Переменные окружения

Добавьте в `.env`:

```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_password
ADMIN_PORT=3001
```

### Запуск в разработке

1. Установите зависимости админки:
```bash
cd admin-frontend
npm install
```

2. Запустите frontend в режиме разработки:
```bash
npm run dev
```

3. Backend должен быть запущен на порту 3000

### Сборка для production

Админка автоматически собирается в Docker контейнере. После сборки она будет доступна по адресу:

```
http://localhost:3000/admin
```

## API Endpoints

Все API endpoints находятся под префиксом `/admin`:

- `POST /admin/auth/login` - вход
- `POST /admin/auth/logout` - выход
- `GET /admin/auth/validate` - проверка токена
- `GET /admin/users` - список пользователей
- `GET /admin/purchases` - список транзакций
- `GET /admin/analytics/financial` - финансовая аналитика
- `GET /admin/analytics/tariff-rating` - рейтинг тарифов
- `GET /admin/analytics/level-rating` - рейтинг уровней
- `GET /admin/promocodes` - список промокодов
- `GET /admin/blacklist` - черный список

Полный список endpoints см. в `src/modules/admin/admin.controller.ts`

