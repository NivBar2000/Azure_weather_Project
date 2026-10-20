import {
  Configuration,
  PublicClientApplication,
  RedirectRequest,
} from "@azure/msal-browser";

export interface AuthenticationConfiguration {
  clientId: string;
  authority: string;
  knownAuthority: string;
  apiScope: string;
}

export const apiTokenRequest: RedirectRequest = {
  scopes: [readRequiredEnvironmentValue("VITE_ENTRA_API_SCOPE")],
};

let initializationPromise: Promise<PublicClientApplication> | undefined;

export function initializeAuthentication(): Promise<PublicClientApplication> {
  initializationPromise ??= createAndInitializeClient(
    readAuthenticationConfiguration(),
  );
  return initializationPromise;
}

export function readAuthenticationConfiguration(): AuthenticationConfiguration {
  const authority = readRequiredEnvironmentValue("VITE_ENTRA_AUTHORITY");
  const knownAuthority = readRequiredEnvironmentValue(
    "VITE_ENTRA_KNOWN_AUTHORITY",
  );
  const authorityUrl = new URL(authority);
  if (authorityUrl.protocol !== "https:") {
    throw new Error("VITE_ENTRA_AUTHORITY must be an HTTPS URL");
  }
  if (authorityUrl.hostname !== knownAuthority) {
    throw new Error(
      "VITE_ENTRA_KNOWN_AUTHORITY must match the authority hostname",
    );
  }

  return {
    clientId: readRequiredEnvironmentValue("VITE_ENTRA_CLIENT_ID"),
    authority: authorityUrl.href,
    knownAuthority,
    apiScope: apiTokenRequest.scopes[0]!,
  };
}

async function createAndInitializeClient(
  authentication: AuthenticationConfiguration,
): Promise<PublicClientApplication> {
  const configuration: Configuration = {
    auth: {
      clientId: authentication.clientId,
      authority: authentication.authority,
      knownAuthorities: [authentication.knownAuthority],
      redirectUri: `${window.location.origin}/`,
      postLogoutRedirectUri: `${window.location.origin}/`,
    },
    cache: {
      cacheLocation: "sessionStorage",
    },
  };

  const client = new PublicClientApplication(configuration);
  await client.initialize();
  const redirectResult = await client.handleRedirectPromise();
  if (redirectResult?.account) {
    client.setActiveAccount(redirectResult.account);
  } else if (!client.getActiveAccount()) {
    client.setActiveAccount(client.getAllAccounts()[0] ?? null);
  }
  return client;
}

function readRequiredEnvironmentValue(name: keyof ImportMetaEnv): string {
  const value = import.meta.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} must be configured`);
  }
  return value;
}
