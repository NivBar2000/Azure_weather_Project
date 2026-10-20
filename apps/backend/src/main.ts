import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { APP_CONFIG, AppConfiguration } from "./config/configuration";
import { loadEnvironmentFile } from "./config/load-environment";

async function bootstrap() {
  loadEnvironmentFile();
  const app = await NestFactory.create(AppModule);
  const configuration = app.get<AppConfiguration>(APP_CONFIG);

  app.setGlobalPrefix("api");
  app.enableCors({ origin: configuration.frontendOrigin });

  await app.listen(configuration.port);
}

void bootstrap();
