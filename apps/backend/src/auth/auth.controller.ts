import { Controller, Get } from "@nestjs/common";
import { CurrentPrincipal } from "./current-principal.decorator";
import { AuthenticatedPrincipal, CurrentUserResponse } from "./auth.types";
import { UserService } from "./user.service";

@Controller("auth")
export class AuthController {
  constructor(private readonly userService: UserService) {}

  @Get("me")
  getCurrentUser(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ): Promise<CurrentUserResponse> {
    return this.userService.synchronizeUser(principal);
  }
}
