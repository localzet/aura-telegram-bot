import { Injectable } from "@nestjs/common";

@Injectable()
export class AdminService {
  async getStats() {
    // This can be used for dashboard stats
    return {
      message: "Admin API is running",
    };
  }
}
