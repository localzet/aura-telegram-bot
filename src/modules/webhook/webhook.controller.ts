import {
  Body,
  Controller,
  Headers,
  HttpException,
  HttpStatus,
  Post,
} from "@nestjs/common";
import { WebhookService } from "./webhook.service";
import { ConfigService } from "@nestjs/config";

@Controller("webhook")
export class WebhookController {
  constructor(
    private readonly webhookService: WebhookService,
    private readonly config: ConfigService,
  ) {}

  @Post()
  async handleWebhook(
    @Headers("X-Remnawave-Signature") signature: string,
    @Headers("X-Remnawave-Timestamp") timestamp: string,
    @Body() body: any,
  ) {
    await this.webhookService.notifyEvent(
      JSON.stringify({ signature, timestamp, body }, null, 1),
    );

    const secret = this.config.getOrThrow<string>("WEBHOOK_SECRET_AURA");
    if (!signature || !timestamp) {
      throw new HttpException("Missing headers", HttpStatus.BAD_REQUEST);
    }

    const valid = this.webhookService.verifySignature(body, signature, secret);
    if (!valid) {
      throw new HttpException("Invalid signature", HttpStatus.UNAUTHORIZED);
    }

    const { event, data } = body;

    if (!event || !data) {
      throw new HttpException("Invalid payload", HttpStatus.BAD_REQUEST);
    }

    try {
      await this.webhookService.handleEvent(event, data);
    } catch (e) {
      throw new HttpException("Bad event", HttpStatus.BAD_REQUEST);
    }

    return { status: "ok" };
  }

  @Post(`telegram`)
  async handleWebhookTelegram(
    @Headers("x-telegram-bot-api-secret-token") token: string,
    @Body() body: any,
  ) {
    const secret = this.config.getOrThrow<string>("WEBHOOK_SECRET_TELEGRAM");
    if (!token) {
      throw new HttpException("Missing headers", HttpStatus.BAD_REQUEST);
    }

    const valid = token == secret;
    if (!valid) {
      throw new HttpException("Invalid signature", HttpStatus.UNAUTHORIZED);
    }

    try {
      await this.webhookService.handleUpdate(body);
    } catch (e) {
      throw new HttpException("Bad update", HttpStatus.BAD_REQUEST);
    }

    return { status: "ok" };
  }
}
