import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as crypto from "crypto";

@Injectable()
export class AdminAuthService {
  constructor(private config: ConfigService) {}

  private generateSessionToken(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  private sessions = new Map<string, { expiresAt: number }>();

  async login(username: string, password: string): Promise<{ token: string }> {
    const adminUsername = this.config.getOrThrow<string>("ADMIN_USERNAME");
    const adminPassword = this.config.getOrThrow<string>("ADMIN_PASSWORD");

    if (username !== adminUsername || password !== adminPassword) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const token = this.generateSessionToken();
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    this.sessions.set(token, { expiresAt });

    // Cleanup expired sessions
    this.cleanupSessions();

    return { token };
  }

  async validateToken(token: string): Promise<boolean> {
    const session = this.sessions.get(token);
    if (!session) {
      return false;
    }

    if (Date.now() > session.expiresAt) {
      this.sessions.delete(token);
      return false;
    }

    return true;
  }

  async logout(token: string): Promise<void> {
    this.sessions.delete(token);
  }

  private cleanupSessions(): void {
    const now = Date.now();
    for (const [token, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        this.sessions.delete(token);
      }
    }
  }
}
