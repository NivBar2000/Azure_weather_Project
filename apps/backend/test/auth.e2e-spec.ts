import { ForbiddenException, INestApplication } from "@nestjs/common";
import { getDataSourceToken, getRepositoryToken } from "@nestjs/typeorm";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { EntraTokenService } from "../src/auth/entra-token.service";
import { CurrentUserResponse } from "../src/auth/auth.types";
import { UserEntity } from "../src/database/entities/user.entity";
import { createTestDataSource } from "./test-data-source";
import { configureTestEnvironment } from "./test-environment";

describe("authentication endpoints", () => {
  let app: INestApplication;
  let storedUser: UserEntity | undefined;
  const dataSource = createTestDataSource();
  const principal = {
    issuer:
      "https://11111111-1111-4111-8111-111111111111.ciamlogin.test/11111111-1111-4111-8111-111111111111/v2.0",
    externalSubjectIdentifier: "stable-object-id",
    displayName: "Authenticated User",
    identityProvider: "google.com",
  };
  const tokenService = {
    validateAccessToken: jest.fn((token: string) => {
      if (token === "insufficient-scope") {
        return Promise.reject(
          new ForbiddenException("Required delegated scope is missing"),
        );
      }
      return Promise.resolve(principal);
    }),
  };
  const userRepository = {
    upsert: jest.fn((user: Partial<UserEntity>) => {
      const now = new Date("2026-10-20T10:00:00.000Z");
      storedUser ??= Object.assign(new UserEntity(), {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        createdAt: now,
        updatedAt: now,
      });
      Object.assign(storedUser, user, { updatedAt: now });
      return Promise.resolve({ identifiers: [], generatedMaps: [], raw: [] });
    }),
    findOneByOrFail: jest.fn(() => {
      if (!storedUser) {
        return Promise.reject(new Error("User was not synchronized"));
      }
      return Promise.resolve(storedUser);
    }),
  };

  beforeAll(async () => {
    configureTestEnvironment();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(getDataSourceToken())
      .useValue(dataSource)
      .overrideProvider(getRepositoryToken(UserEntity))
      .useValue(userRepository)
      .overrideProvider(EntraTokenService)
      .useValue(tokenService)
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api");
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    storedUser = undefined;
  });

  afterAll(async () => {
    await app.close();
    expect(dataSource.destroy).toHaveBeenCalledTimes(1);
  });

  it("keeps the health endpoint public", async () => {
    await request(app.getHttpServer()).get("/api/health").expect(200);
    expect(tokenService.validateAccessToken).not.toHaveBeenCalled();
  });

  it("rejects a protected endpoint without a token", async () => {
    await request(app.getHttpServer()).get("/api/auth/me").expect(401);
  });

  it("returns forbidden for a valid token without the required scope", async () => {
    await request(app.getHttpServer())
      .get("/api/auth/me")
      .set("Authorization", "Bearer insufficient-scope")
      .expect(403);
  });

  it("creates a privacy-safe user and returns the same user repeatedly", async () => {
    const first = await request(app.getHttpServer())
      .get("/api/auth/me")
      .set("Authorization", "Bearer valid-token")
      .expect(200);
    const second = await request(app.getHttpServer())
      .get("/api/auth/me")
      .set("Authorization", "Bearer valid-token")
      .expect(200);

    expect(first.body as CurrentUserResponse).toEqual(second.body);
    expect(first.body).toEqual({
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      displayName: "Authenticated User",
      identityProvider: "google.com",
      createdAt: "2026-10-20T10:00:00.000Z",
      updatedAt: "2026-10-20T10:00:00.000Z",
    });
    expect(userRepository.upsert).toHaveBeenCalledTimes(2);
    expect(storedUser).toBeDefined();
    expect(JSON.stringify(storedUser)).not.toContain("email");
    expect(JSON.stringify(storedUser)).not.toContain("valid-token");
  });

  it("safely synchronizes simultaneous first requests without duplicate users", async () => {
    const [first, second] = await Promise.all([
      request(app.getHttpServer())
        .get("/api/auth/me")
        .set("Authorization", "Bearer valid-token"),
      request(app.getHttpServer())
        .get("/api/auth/me")
        .set("Authorization", "Bearer valid-token"),
    ]);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect((first.body as CurrentUserResponse).id).toBe(
      (second.body as CurrentUserResponse).id,
    );
    expect(storedUser?.id).toBe("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
  });
});
