import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthenticatedRequest } from "./auth.types";
import { EntraTokenService } from "./entra-token.service";
import { IS_PUBLIC_ROUTE } from "./public-route.decorator";

@Injectable()
export class EntraAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokenService: EntraTokenService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_ROUTE,
      [context.getHandler(), context.getClass()],
    );
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = readBearerToken(request.headers.authorization);
    request.authenticatedPrincipal =
      await this.tokenService.validateAccessToken(token);
    return true;
  }
}

function readBearerToken(header: string | undefined): string {
  if (!header) {
    throw new UnauthorizedException("Bearer access token is required");
  }
  const match = /^Bearer ([^\s]+)$/i.exec(header);
  if (!match) {
    throw new UnauthorizedException("Authorization header is malformed");
  }
  return match[1];
}
