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
    app.useStaticAssets(adminPath, {
      prefix: "/admin",
    });

    // Serve admin panel index.html for all /admin routes (SPA routing)
    app.use("/admin", (req: any, res: any, next: any) => {
      if (!req.path.includes(".") && req.path.startsWith("/admin")) {
        res.sendFile(join(adminPath, "index.html"));
      } else {
        next();
      }
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
