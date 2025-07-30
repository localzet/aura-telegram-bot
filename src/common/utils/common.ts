export function prettyLevel(level: string) {
    return {
        ferrum: '🥉 Базовый',
        argentum: '🥈 Серебряный',
        aurum: '🥇 Золотой',
        platinum: '💎 Платиновый',
    }[level]
}

export function formatExpire(date: Date): string {
    return `до ${new Date(date).toLocaleDateString('ru-RU')}`
}
