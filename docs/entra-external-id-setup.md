# Microsoft Entra External ID Setup

## Registered resources

- External tenant: **Azure Weather Customers**
- Tenant ID: `79fb97ff-3c22-4210-b16d-e210b21db3e6`
- Tenant subdomain: `azureweatherexercise3`
- Primary domain: `azureweatherexercise3.onmicrosoft.com`
- CIAM host: `azureweatherexercise3.ciamlogin.com`
- SPA registration: **Azure Weather Frontend**
- SPA client ID: `ca698b88-3c0f-4279-bbb5-b60654497b31`
- Local redirect URI: `http://localhost:8080/`
- API registration: **Azure Weather API**
- API client ID: `637c9165-b368-48a7-aa3d-3b9852a51a67`
- Application ID URI: `api://637c9165-b368-48a7-aa3d-3b9852a51a67`
- Delegated permission: `api://637c9165-b368-48a7-aa3d-3b9852a51a67/access_as_user`
- Required `scp` value: `access_as_user`

The SPA uses authorization code with PKCE and has no client secret. Its API permission must remain granted for the delegated scope above.

## Endpoints

- Frontend authority: `https://azureweatherexercise3.ciamlogin.com/79fb97ff-3c22-4210-b16d-e210b21db3e6`
- Known authority: `azureweatherexercise3.ciamlogin.com`
- OIDC metadata: `https://azureweatherexercise3.ciamlogin.com/79fb97ff-3c22-4210-b16d-e210b21db3e6/v2.0/.well-known/openid-configuration`
- Expected issuer: `https://79fb97ff-3c22-4210-b16d-e210b21db3e6.ciamlogin.com/79fb97ff-3c22-4210-b16d-e210b21db3e6/v2.0`

These identifiers and endpoints are public configuration. Keep them configurable, but never add provider secrets or tokens to frontend variables, source control, logs, documentation, or image layers.

## User flow and providers

The **AzureWeatherSignUpSignIn** user flow is associated with the frontend registration. It enables Google, Microsoft Account, and Entra-managed email one-time passcode. Email OTP is a platform-required fallback; the application does not implement or store passwords.

Google authentication was manually verified during tenant setup. Testing also encountered Microsoft same-email account-collision behavior. The application does not attempt to merge or authorize identities by email: External ID must resolve any provider-level collision, while the application continues to key users only by validated issuer plus `oid` or the `sub` fallback. Re-test this scenario after any user-flow or provider change.

## Runtime validation rules

The backend obtains signing keys from the configured OIDC metadata and JWKS endpoints and accepts only tokens that have:

- a valid RS256 signature and unexpired lifetime;
- token version `2.0`;
- the exact configured issuer;
- API audience `637c9165-b368-48a7-aa3d-3b9852a51a67`;
- tenant `79fb97ff-3c22-4210-b16d-e210b21db3e6`;
- calling client `ca698b88-3c0f-4279-bbb5-b60654497b31` in `azp`;
- delegated scope `access_as_user` in `scp`.

Missing or invalid authentication returns HTTP 401. A cryptographically valid token without the required delegated scope returns HTTP 403. Health remains public; current and future business routes are protected by default.

## Privacy

`GET /api/auth/me` synchronizes the existing `users` table with the minimum identity data required by the application. It stores the validated issuer, `oid` (or `sub` fallback), display name, provider label, and timestamps. It returns only the local ID, display name, provider label, and timestamps.

The application stores no email addresses, access tokens, ID tokens, refresh tokens, or authorization codes. It does not log authorization headers or token claims. The provider label is informational and is never used for authorization.

## Manual integration test

1. Confirm the SPA registration has the exact redirect URI `http://localhost:8080/` and the frontend has the API's delegated `access_as_user` permission.
2. Populate the ignored local environment files from the committed examples without adding any secret to a `VITE_*` setting.
3. Run `docker compose up --build` and wait for all three services to become healthy.
4. Confirm `http://localhost:8080/api/health` works without authentication and a weather endpoint returns HTTP 401 without a bearer token.
5. In a private browser window, open `http://localhost:8080/`, select **Sign in**, and complete one configured provider flow.
6. Confirm the redirect returns to the application, the display name appears, `/api/auth/me` succeeds, and location and forecast requests work.
7. Refresh once to confirm silent token acquisition does not create a redirect loop or duplicate user.
8. Sign out and confirm weather functionality is gated again.
9. Inspect only sanitized application logs; never copy tokens or authorization headers into diagnostics.

## Troubleshooting

- `redirect_uri` errors: match the registered URI exactly, including scheme, port, and trailing slash.
- Sign-in does not start: confirm the frontend authority includes the tenant ID path. The host-only authority resolves discovery at the wrong endpoint and is not valid for this tenant.
- Issuer or tenant rejection: compare runtime configuration with the exact v2 issuer and tenant ID above.
- Audience rejection: request the API scope and confirm `aud` is the API client ID GUID, not the SPA client ID or Application ID URI.
- HTTP 403: confirm the frontend permission is granted and the token's `scp` contains `access_as_user`.
- Wrong-client rejection: confirm the token was requested by the registered SPA client and carries its ID in `azp`.
- Stale browser configuration: rebuild the frontend image after changing `VITE_*` values, then clear the site's session storage.

## Provider-secret rotation

Provider credentials configured inside Microsoft Entra or an upstream identity provider must be inventoried with owners and expiry reminders outside this repository. Rotate them in the provider and Entra administration portals, use an overlap window where the platform supports multiple credentials, validate sign-in with the new credential, then revoke the old credential. Never retrieve a secret into project tooling, paste it into a prompt, place it in an environment example, or record its value in documentation. The SPA and delegated API configuration itself requires no client secret.
