import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ConfigService } from "@nestjs/config";
import { Logger } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { join } from "path";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);
  const logger = new Logger("Bootstrap");

  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Serve admin panel static files
  const adminPath = join(__dirname, "admin");
  try {
    // Get Express instance for custom routing
    const expressApp = app.getHttpAdapter().getInstance();

    // Helper function to check if request is for API
    const isApiRequest = (path: string): boolean => {
      const apiPaths = [
        "/admin/auth",
        "/admin/users",
        "/admin/purchases",
        "/admin/analytics",
        "/admin/promocodes",
        "/admin/blacklist",
        "/admin/referrals",
        "/admin/stats",
      ];
      return apiPaths.some((apiPath) => path.startsWith(apiPath));
    };

    // Middleware to skip static files for API requests
    expressApp.use("/admin", (req: any, res: any, next: any) => {
      if (isApiRequest(req.path)) {
        return next(); // Let NestJS controllers handle API requests
      }
      next();
    });

    // Serve static assets (CSS, JS, images, etc.) from /admin/assets
    app.useStaticAssets(adminPath, {
      prefix: "/admin",
      index: false,
    });

    // Serve admin panel index.html for SPA routes
    expressApp.get("/admin", (req: any, res: any, next: any) => {
      // Let API requests pass through to NestJS controllers
      if (isApiRequest(req.path)) {
        return next();
      }
      res.sendFile(join(adminPath, "index.html"));
    });

    expressApp.get("/admin/*", (req: any, res: any, next: any) => {
      // Let API requests pass through to NestJS controllers
      if (isApiRequest(req.path)) {
        return next();
      }

      // If it's a file request (has extension), it should have been handled by static assets
      if (req.path.match(/\.[^/]+$/)) {
        return next();
      }

      // Otherwise serve index.html for SPA routing
      res.sendFile(join(adminPath, "index.html"));
    });
  } catch (error) {
    logger.warn("Admin panel static files not found, skipping...");
  }

  const port = config.get<number>("APP_PORT", 3000);
  await app.listen(port, "0.0.0.0");

  logger.log(`Bot server listening on port ${port}`);
  logger.log(`Admin panel available at http://localhost:${port}/admin`);
}

bootstrap();
