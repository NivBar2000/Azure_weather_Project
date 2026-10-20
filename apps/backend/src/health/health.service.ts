import { Injectable } from "@nestjs/common";

export interface HealthResponse {
  status: "ok";
  service: string;
  timestamp: string;
}

@Injectable()
export class HealthService {
  getHealth(): HealthResponse {
    return {
      status: "ok",
      service: "azure-weather-backend",
      timestamp: new Date().toISOString(),
    };
  }
}
