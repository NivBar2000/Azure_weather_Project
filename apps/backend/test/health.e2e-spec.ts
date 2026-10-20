import { INestApplication } from "@nestjs/common";
import { getDataSourceToken } from "@nestjs/typeorm";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { HealthResponse } from "../src/health/health.service";
import { createTestDataSource } from "./test-data-source";
import { configureTestEnvironment } from "./test-environment";

describe("GET /api/health", () => {
  let app: INestApplication;
  const dataSource = createTestDataSource();

  beforeAll(async () => {
    configureTestEnvironment();
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(getDataSourceToken())
      .useValue(dataSource)
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api");
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    expect(dataSource.destroy).toHaveBeenCalledTimes(1);
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
