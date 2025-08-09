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
