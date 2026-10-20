import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_ROUTE = Symbol("IS_PUBLIC_ROUTE");

export const PublicRoute = () => SetMetadata(IS_PUBLIC_ROUTE, true);
