import { Request } from "express";

export interface AuthenticatedPrincipal {
  issuer: string;
  externalSubjectIdentifier: string;
  displayName: string;
  identityProvider: string;
}

export interface AuthenticatedRequest extends Request {
  authenticatedPrincipal?: AuthenticatedPrincipal;
}

export interface CurrentUserResponse {
  id: string;
  displayName: string;
  identityProvider: string;
  createdAt: Date;
  updatedAt: Date;
}
