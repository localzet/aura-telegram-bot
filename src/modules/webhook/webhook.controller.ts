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
    @Headers("x-aura-signature") signature: string,
    @Headers("x-aura-timestamp") timestamp: string,
    @Body() body: any,
  ) {
    const secret = this.config.getOrThrow<string>("WEBHOOK_SECRET_HEADER");
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

    this.webhookService.handleEvent(event, data);
    return { status: "ok" };
  }
}
