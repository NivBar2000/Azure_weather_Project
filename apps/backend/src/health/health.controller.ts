import { Controller, Get } from "@nestjs/common";
import { PublicRoute } from "../auth/public-route.decorator";
import { HealthResponse, HealthService } from "./health.service";

@Controller("health")
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @PublicRoute()
  getHealth(): HealthResponse {
    return this.healthService.getHealth();
  }
}
