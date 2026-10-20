import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthenticatedPrincipal, AuthenticatedRequest } from "./auth.types";

export const CurrentPrincipal = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedPrincipal => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.authenticatedPrincipal) {
      throw new UnauthorizedException("Authenticated principal is unavailable");
    }
    return request.authenticatedPrincipal;
  },
);
