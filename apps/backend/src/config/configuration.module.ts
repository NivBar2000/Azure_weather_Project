import { Global, Module } from "@nestjs/common";
import { APP_CONFIG, createAppConfiguration } from "./configuration";

@Global()
@Module({
  providers: [
    {
      provide: APP_CONFIG,
      useFactory: createAppConfiguration,
    },
  ],
  exports: [APP_CONFIG],
})
export class ConfigurationModule {}
