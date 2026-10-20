import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule } from "./app.module";
import { APP_CONFIG, AppConfiguration } from "./config/configuration";
import { loadEnvironmentFile } from "./config/load-environment";

async function bootstrap() {
  loadEnvironmentFile();
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configuration = app.get<AppConfiguration>(APP_CONFIG);

  app.disable("x-powered-by");
  app.enableShutdownHooks();
  app.setGlobalPrefix("api");
  app.enableCors({ origin: configuration.frontendOrigin });

  await app.listen(configuration.port);
}

void bootstrap();
