import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UserEntity } from "../database/entities/user.entity";
import { AuthenticatedPrincipal, CurrentUserResponse } from "./auth.types";

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
  ) {}

  async synchronizeUser(
    principal: AuthenticatedPrincipal,
  ): Promise<CurrentUserResponse> {
    const user = await this.resolveUser(principal);

    return {
      id: user.id,
      displayName: user.displayName,
      identityProvider: user.identityProvider,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async resolveUser(principal: AuthenticatedPrincipal): Promise<UserEntity> {
    await this.users.upsert(
      {
        identityIssuer: principal.issuer,
        externalSubjectIdentifier: principal.externalSubjectIdentifier,
        displayName: principal.displayName,
        identityProvider: principal.identityProvider,
      },
      {
        conflictPaths: ["identityIssuer", "externalSubjectIdentifier"],
        skipUpdateIfNoValuesChanged: true,
      },
    );

    return this.users.findOneByOrFail({
      identityIssuer: principal.issuer,
      externalSubjectIdentifier: principal.externalSubjectIdentifier,
    });
  }
}
