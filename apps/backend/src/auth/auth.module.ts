import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UserEntity } from "../database/entities/user.entity";
import { AuthController } from "./auth.controller";
import { EntraAuthGuard } from "./entra-auth.guard";
import { EntraTokenService } from "./entra-token.service";
import { OidcJwksService } from "./oidc-jwks.service";
import { UserService } from "./user.service";

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity])],
  controllers: [AuthController],
  providers: [
    OidcJwksService,
    EntraTokenService,
    UserService,
    { provide: APP_GUARD, useClass: EntraAuthGuard },
  ],
  exports: [EntraTokenService, UserService],
})
export class AuthModule {}
