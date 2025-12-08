import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const configSchema = z
  .object({
    APP_PORT: z
      .string()
      .default("3000")
      .transform((port) => parseInt(port, 10)),

    AURA_PANEL_URL: z.string(),
    AURA_API_TOKEN: z.optional(z.string()),
    CADDY_AUTH_API_TOKEN: z.optional(z.string()),

    TELEGRAM_TOKEN: z.string(),
    YOOKASSA_TOKEN: z.string(),
    MINI_APP_URL: z.optional(z.string()),

    ADMIN_PORT: z
      .string()
      .default("3001")
      .transform((port) => parseInt(port, 10)),
    ADMIN_USERNAME: z.string().default("admin"),
    ADMIN_PASSWORD: z.string().default("admin"),

    // Pricing configuration
    BASE_PRICE: z
      .string()
      .default("180")
      .transform((price) => parseFloat(price)),
    PRICE_DISCOUNT_3_MONTHS: z
      .string()
      .default("0.85")
      .transform((discount) => parseFloat(discount)),
    PRICE_DISCOUNT_6_MONTHS: z
      .string()
      .default("0.80")
      .transform((discount) => parseFloat(discount)),
    PRICE_DISCOUNT_12_MONTHS: z
      .string()
      .default("0.75")
      .transform((discount) => parseFloat(discount)),

    // Level discounts configuration
    LEVEL_FERRUM_MAX_DISCOUNT: z
      .string()
      .default("25")
      .transform((discount) => parseInt(discount, 10)),
    LEVEL_ARGENTUM_DISCOUNT: z
      .string()
      .default("25")
      .transform((discount) => parseInt(discount, 10)),
    LEVEL_ARGENTUM_MAX_DISCOUNT: z
      .string()
      .default("50")
      .transform((discount) => parseInt(discount, 10)),
    LEVEL_AURUM_DISCOUNT: z
      .string()
      .default("50")
      .transform((discount) => parseInt(discount, 10)),
    LEVEL_AURUM_MAX_DISCOUNT: z
      .string()
      .default("50")
      .transform((discount) => parseInt(discount, 10)),
    LEVEL_PLATINUM_DISCOUNT: z
      .string()
      .default("100")
      .transform((discount) => parseInt(discount, 10)),

    // Referral bonus
    REFERRAL_BONUS_PERCENT: z
      .string()
      .default("5")
      .transform((bonus) => parseInt(bonus, 10)),
    REFERRAL_MAX_BONUS: z
      .string()
      .default("25")
      .transform((max) => parseInt(max, 10)),

    // Closed mode
    CLOSED_MODE_ENABLED: z
      .string()
      .default("false")
      .transform((val) => val === "true" || val === "1"),
  })
  .superRefine((data, ctx) => {
    if (
      !data.AURA_PANEL_URL.startsWith("http://") &&
      !data.AURA_PANEL_URL.startsWith("https://")
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "AURA_PANEL_URL должен начинаться с http:// или https://",
        path: ["AURA_PANEL_URL"],
      });
    }
  });

export type ConfigSchema = z.infer<typeof configSchema>;

export class Env extends createZodDto(configSchema) {}
