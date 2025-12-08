import { Injectable } from '@nestjs/common';
import { Context } from 'grammy';
import { translations, TranslationKey } from './translations';

@Injectable()
export class I18nService {
    getLanguage(ctx: Context): 'ru' | 'en' {
        const langCode = ctx.from?.language_code || 'ru';
        // Если язык начинается с 'ru', возвращаем русский, иначе английский
        return langCode.startsWith('ru') ? 'ru' : 'en';
    }

    t(ctx: Context, key: TranslationKey, params?: Record<string, string | number>): string {
        const lang = this.getLanguage(ctx);
        let text = translations[lang][key] || translations.ru[key] || key;

        // Заменяем параметры в формате {param}
        if (params) {
            Object.entries(params).forEach(([paramKey, value]) => {
                text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(value));
            });
        }

        return text;
    }

    tByLang(lang: 'ru' | 'en', key: TranslationKey, params?: Record<string, string | number>): string {
        let text = translations[lang][key] || translations.ru[key] || key;

        if (params) {
            Object.entries(params).forEach(([paramKey, value]) => {
                text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(value));
            });
        }

        return text;
    }
}

