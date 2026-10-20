import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { HealthResponse } from "../src/health/health.service";

describe("GET /api/health", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api");
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns the service health", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/health")
      .expect(200);
    const body = response.body as HealthResponse;

    expect(body.status).toBe("ok");
    expect(body.service).toBe("azure-weather-backend");
    expect(typeof body.timestamp).toBe("string");
    expect(Number.isNaN(Date.parse(body.timestamp))).toBe(false);
  });
});
