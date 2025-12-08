export type TranslationKey = 
    | 'greeting'
    | 'welcome'
    | 'closed_mode'
    | 'level'
    | 'subscription'
    | 'not_active'
    | 'select_action'
    | 'buy'
    | 'extend'
    | 'connect'
    | 'invite_friend'
    | 'help_command'
    | 'help_example'
    | 'help_sent'
    | 'reply_usage'
    | 'reply_sent'
    | 'reply_error'
    | 'error_loading_tariffs'
    | 'error_creating_order'
    | 'payment_success'
    | 'payment_error'
    | 'subscription_active_until'
    | 'select_tariff'
    | 'your_discount'
    | 'month'
    | 'months'
    | 'referral_info'
    | 'your_level'
    | 'your_link'
    | 'invited_this_month'
    | 'current_discount'
    | 'referral_note'
    | 'invite_button'
    | 'my_refs'
    | 'manage'
    | 'levels_info'
    | 'back'
    | 'no_referrals'
    | 'your_referrals'
    | 'management_panel'
    | 'change_level'
    | 'select_level'
    | 'level_granted'
    | 'error_occurred'
    | 'access_denied'
    | 'not_your_referral'
    | 'promo_activated'
    | 'promo_not_found'
    | 'promo_expired'
    | 'promo_inactive'
    | 'promo_limit_reached'
    | 'promo_level_granted'
    | 'promo_discount_applied'
    | 'promo_usage'
    | 'blacklisted'
    | 'insufficient_permissions'
    | 'cannot_assign_level'
    | 'limit_reached';

export const translations: Record<'ru' | 'en', Record<TranslationKey, string>> = {
    ru: {
        greeting: '👋 Добро пожаловать, {name}!',
        welcome: '👋 Добро пожаловать!',
        closed_mode: '👋 Добро пожаловать!\n\nК сожалению, на данный момент проект работает в закрытом режиме. Доступ только по приглашениям участников.',
        level: '🔹 Уровень:',
        subscription: '⏳ Подписка:',
        not_active: 'не активна',
        select_action: 'Выберите действие:',
        buy: '📦 Купить',
        extend: '📦 Продлить',
        connect: '✨ Подключиться',
        invite_friend: '👥 Пригласить друга',
        help_command: '📖 Вы можете написать разработчикам через команду:\n<code>/help ваш_текст</code>\n\nПример:\n<code>/help Не работает оплата</code>',
        help_example: '/help Не работает оплата',
        help_sent: '✅ Ваше сообщение отправлено разработчикам.',
        reply_usage: 'Использование: /reply <user_id> <текст>',
        reply_sent: '✅ Сообщение отправлено пользователю.',
        reply_error: '⚠️ Не удалось отправить сообщение: {error}',
        error_loading_tariffs: '⚠️ Произошла ошибка при загрузке тарифов. Попробуйте позже.',
        error_creating_order: '⚠️ Не удалось сформировать заказ. Попробуйте позже.',
        payment_success: '✅ Оплата прошла успешно. Подписка активна до {date}',
        payment_error: '⚠️ Оплата прошла, но при активации произошла ошибка. Мы решим вопрос в ближайшее время.',
        subscription_active_until: 'до {date}',
        select_tariff: '📦 Выберите тариф для покупки:',
        your_discount: '🎁 Ваша скидка: {discount}%',
        month: 'месяц',
        months: 'месяцев',
        referral_info: '👥 Пригласите друзей и получите бонус:',
        your_level: 'Ваш уровень:',
        your_link: '🔗 Ваша ссылка:',
        invited_this_month: '👤 Приглашено в этом месяце:',
        current_discount: '📉 Текущая скидка:',
        referral_note: '<i>Важно! Скидка даётся только за друзей, приглашенных в текущем месяце (каждый месяц счетчик сбрасывается)</i>',
        invite_button: '📤 Пригласить',
        my_refs: '📈 Приглашённые',
        manage: '🧭 Управление',
        levels_info: '📜 Об уровнях',
        back: '⬅️ Назад',
        no_referrals: 'У вас нет приглашённых пользователей.',
        your_referrals: '📋 Ваши приглашённые:',
        management_panel: '🧭 Управление рефералами:',
        change_level: 'Вы можете изменить уровень доступа для своих приглашённых.',
        select_level: 'Выберите уровень, который хотите назначить пользователю {name}:',
        level_granted: '✅ Пользователю {name} успешно назначен уровень {level}.',
        error_occurred: 'Произошла ошибка',
        access_denied: 'Недоступно для вашего уровня',
        not_your_referral: 'Этот пользователь не является вашим приглашённым',
        promo_activated: '✅ Промокод активирован!',
        promo_not_found: '❌ Промокод не найден',
        promo_expired: '❌ Промокод истек',
        promo_inactive: '❌ Промокод неактивен',
        promo_limit_reached: '❌ Достигнут лимит использования промокода',
        promo_level_granted: '🎉 Вам назначен уровень {level}!',
        promo_discount_applied: '🎉 Вам применена скидка {discount}%!',
        promo_usage: 'Использование: /promo <код>',
        blacklisted: '🚫 Доступ запрещен',
        insufficient_permissions: 'Недостаточно прав для изменения уровня',
        cannot_assign_level: 'Вы не можете назначить этот уровень',
        limit_reached: 'Достигнут лимит назначений для уровня {level}',
    },
    en: {
        greeting: '👋 Welcome, {name}!',
        welcome: '👋 Welcome!',
        closed_mode: '👋 Welcome!\n\nUnfortunately, the project is currently in closed mode. Access is only available by invitation from participants.',
        level: '🔹 Level:',
        subscription: '⏳ Subscription:',
        not_active: 'not active',
        select_action: 'Select an action:',
        buy: '📦 Buy',
        extend: '📦 Extend',
        connect: '✨ Connect',
        invite_friend: '👥 Invite friend',
        help_command: '📖 You can contact developers using the command:\n<code>/help your_text</code>\n\nExample:\n<code>/help Payment not working</code>',
        help_example: '/help Payment not working',
        help_sent: '✅ Your message has been sent to developers.',
        reply_usage: 'Usage: /reply <user_id> <text>',
        reply_sent: '✅ Message sent to user.',
        reply_error: '⚠️ Failed to send message: {error}',
        error_loading_tariffs: '⚠️ An error occurred while loading tariffs. Please try again later.',
        error_creating_order: '⚠️ Failed to create order. Please try again later.',
        payment_success: '✅ Payment successful. Subscription active until {date}',
        payment_error: '⚠️ Payment completed, but an error occurred during activation. We will resolve this issue shortly.',
        subscription_active_until: 'until {date}',
        select_tariff: '📦 Select a tariff to purchase:',
        your_discount: '🎁 Your discount: {discount}%',
        month: 'month',
        months: 'months',
        referral_info: '👥 Invite friends and get a bonus:',
        your_level: 'Your level:',
        your_link: '🔗 Your link:',
        invited_this_month: '👤 Invited this month:',
        current_discount: '📉 Current discount:',
        referral_note: '<i>Important! Discount is only given for friends invited in the current month (counter resets every month)</i>',
        invite_button: '📤 Invite',
        my_refs: '📈 Invited',
        manage: '🧭 Manage',
        levels_info: '📜 About levels',
        back: '⬅️ Back',
        no_referrals: 'You have no invited users.',
        your_referrals: '📋 Your invited:',
        management_panel: '🧭 Referral management:',
        change_level: 'You can change the access level for your invited users.',
        select_level: 'Select the level you want to assign to user {name}:',
        level_granted: '✅ User {name} has been successfully assigned level {level}.',
        error_occurred: 'An error occurred',
        access_denied: 'Not available for your level',
        not_your_referral: 'This user is not your referral',
        promo_activated: '✅ Promo code activated!',
        promo_not_found: '❌ Promo code not found',
        promo_expired: '❌ Promo code expired',
        promo_inactive: '❌ Promo code inactive',
        promo_limit_reached: '❌ Promo code usage limit reached',
        promo_level_granted: '🎉 You have been granted level {level}!',
        promo_discount_applied: '🎉 You have been granted a {discount}% discount!',
        promo_usage: 'Usage: /promo <code>',
        blacklisted: '🚫 Access denied',
        insufficient_permissions: 'Insufficient permissions to change level',
        cannot_assign_level: 'You cannot assign this level',
        limit_reached: 'Assignment limit reached for level {level}',
    },
};

