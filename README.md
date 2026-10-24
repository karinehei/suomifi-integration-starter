# Suomi.fi Integration Starter

Educational prototype of an identity-integration adapter. It is a portfolio project for learning OAuth-style flows, adapter boundaries, correlation IDs, and audit logging. It is not a production integration and it is not connected to Suomi.fi.

The Kotlin API talks to local stubs. A separate browser demo under `web/` simulates the same ideas without starting Java, PostgreSQL, WireMock, or an identity provider.

## Browser demo

The Identity Integration Explorer is a static React app. It shows a simulated session, fictional personas, failure scenarios, example HTTP records, and a local audit trail. Simulated authentication never leaves the browser.

Limitations:

- It does not authenticate users, validate identities, or provide production security.
- It does not call this repository's API, WireMock, or any external identity service.
- Placeholder codes and tokens are nonfunctional. They are not credentials.
- Persona identifiers look like `DEMO-PERSON-001`. They are not personal identity codes.
- The page is an independent portfolio demo. It does not use official Suomi.fi branding and it is not endorsed by any authority.

### Local commands

From `web/`:

```bash
npm ci
npm test
npm run dev
npm run build:demo
npm run preview:demo
```

- `npm run dev` serves the app at http://127.0.0.1:5173/suomifi-integration-starter/
- `npm run build:demo` typechecks and writes the Pages bundle to `web/dist`
- `npm run preview:demo` serves that bundle at http://127.0.0.1:4173/suomifi-integration-starter/

The Vite base path is `/suomifi-integration-starter/`. Routes use the URL hash, for example `#/audit`.

### GitHub Pages

Hosting has not been enabled or deployed by this change. To publish later:

1. In the GitHub repository, open Settings → Pages → Build and deployment, and set Source to GitHub Actions.
2. Run `.github/workflows/pages.yml` manually from the Actions tab. The workflow trigger is `workflow_dispatch` only.
3. The workflow uses Node 22, runs `npm ci`, `npm test`, and `npm run build:demo` in `web/`, then uploads only `web/dist`.
4. Expected URL after a successful manual run: https://karinehei.github.io/suomifi-integration-starter/

The workflow does not publish the repository root, backend configuration, certificates, or environment secrets. The existing backend workflow in `.github/workflows/ci.yml` is unchanged.

## What the backend actually does

`apps/api` is a Kotlin Spring Boot service. `libs/suomifi-client` is an adapter that calls whatever base URL is configured. In local Docker that URL is WireMock.

Implemented:

- `POST /api/v1/auth/session` returns a random `state` and an authorization URL built from `suomifi.client.base-url`.
- `GET /api/v1/auth/callback` exchanges a code at `{baseUrl}/oauth/token` and fetches `{baseUrl}/verified-profile`.
- `GET /api/v1/profile` requires a bearer token that `DemoJwtDecoder` can parse.
- `GET /api/v1/health` reports the process status.
- `X-Correlation-Id` is read or generated and stored on audit rows.
- Audit rows are written to PostgreSQL through Flyway's `audit_event` table when the API is running against Postgres.
- The adapter maps HTTP 401 and 403 to `SuomifiAuthException`, and retries HTTP 5xx responses with a fixed delay.

Not implemented, despite earlier wording in this file:

- JWT signature verification. `DemoJwtDecoder` base64url-decodes the header and payload and, when `exp` is present, rejects an expired instant. It does not check the signature. `scripts/generate-jwt.ps1` appends the literal `signature-placeholder`.
- Callback state checks. The API generates and logs `state`. `AuthService.handleCallback` does not store or compare it. The adapter does not send `state` to the token endpoint.
- ID-token validation. `TokenResponse` and the WireMock fixture include `id_token`. The callback response drops it. The authorization URL has no `nonce`.
- mTLS. Certificate properties exist. `buildSslContext` returns null, and private-key loading throws `UnsupportedOperationException`. The WebClient uses plain HTTP.
- A real Suomi.fi client. Paths `/authorize`, `/oauth/token`, and `/verified-profile` are local stub shapes. WireMock has no `/authorize` mapping.
- Connection-error retries. The retry predicate names `SuomifiNetworkException`, but that type is applied after the retry operator, so connection failures are not retried. The delay is fixed, not exponential.
- A browser client for the API. Swagger and curl are the existing clients. The new `web/` app does not call them.

`ProfileService` does not use the caller's JWT as an access token. It calls the stub with the fixed placeholder `demo-access-token`.

## Backend quick start

Prerequisites: Java 21, Docker, and the included Gradle wrapper.

```bash
docker compose -f infra/docker-compose.yml up -d
docker compose -f infra/docker-compose.yml logs -f
curl http://localhost:8080/api/v1/health
```

Swagger UI: http://localhost:8080/swagger-ui.html

Start a stub session:

```bash
curl -X POST http://localhost:8080/api/v1/auth/session
```

The response contains `authUrl` and `state`. `authUrl` points at the configured base URL. With Docker that is WireMock, not Suomi.fi.

Callback, using the `state` from the previous response and any code the token stub accepts:

```bash
curl "http://localhost:8080/api/v1/auth/callback?code=test-code&state=<state-from-the-session-response>"
```

The callback does not check that `state` matches a stored value. A matching `state` in this example only shows the query shape.

Profile route, after generating an unsigned demo token:

```powershell
.\scripts\generate-jwt.ps1
```

```bash
curl -H "Authorization: Bearer <token-from-the-script>" http://localhost:8080/api/v1/profile
```

The script does not sign the token. `DemoJwtDecoder` accepts that shape when `exp` is still in the future. The profile body comes from the WireMock fixture via the placeholder access token inside `ProfileService`.

### API routes

| Method | Route | Auth in this codebase |
| --- | --- | --- |
| GET | `/api/v1/health` | Open |
| POST | `/api/v1/auth/session` | Open |
| GET | `/api/v1/auth/callback` | Open |
| GET | `/api/v1/profile` | Bearer token parsed by `DemoJwtDecoder` |

### Run the API without Compose

1. Start PostgreSQL on port 5432 with database `suomifi_db`, user `suomifi_user`, and password `suomifi_pass`.
2. Start WireMock with `infra/wiremock/mappings` mounted, published on port 8089.
3. Run `./gradlew :apps:api:bootRun` with `SUOMIFI_BASE_URL=http://localhost:8089`.

`application-local.yml` points the client at `http://localhost:8089`. The default `application.yml` value `http://wiremock:8080` is the Docker network name.

### Tests and build

```bash
./gradlew test
./gradlew build
```

Controller and integration tests use H2. Flyway is disabled in `application-test.yml`. Testcontainers is on the test classpath, and CI starts a PostgreSQL service container, but the inspected tests do not launch Testcontainers. `./gradlew test` was not run for the browser-demo change because the Kotlin sources were not modified.

## Configuration

Values in `apps/api/src/main/resources/application.yml` are local placeholders:

- `suomifi.client.base-url` defaults to `http://wiremock:8080` inside Compose and should be `http://localhost:8089` for a host-run WireMock.
- `client-id` defaults to `demo-client-id`.
- `client-secret` defaults to `demo-client-secret`.
- `redirect-uri` defaults to `http://localhost:8080/api/v1/auth/callback`.

Replacing the base URL and these placeholders does not create a working Suomi.fi integration. A real relying party has to register metadata, implement the provider's current protocol, validate tokens, store browser state, and handle errors. Those steps are not done here. The commented certificate paths do not turn on mTLS.

## Suomi.fi documentation checked on 24 October 2026

These official pages were retrieved on that date:

- Technical description (OIDC), updated 7 October 2026: https://kehittajille.suomi.fi/palvelut/tunnistus/tekninen-kuvaus-oidc
- English introduction: https://kehittajille.suomi.fi/services/e-identification/technical-description
- Schedule announcement, published 7 October 2026: https://kehittajille.suomi.fi/ajankohtaista/tarkennus-suomi-fi-tunnistuksen-oidc-rajapinnan-julkaisuaikatauluun
- OIDC interface comparison, updated 7 October 2026: https://kehittajille.suomi.fi/services/e-identification/technical-description/oidc-interface

The schedule announcement still says:

- OIDC test environment: 3 December 2026
- OIDC production environment: 28 January 2027
- SAML transition ends: 1 June 2028

The comparison page describes the current identification interface as SAML 2.0, with OIDC using JSON and JWT, trust established through OIDC metadata, and key publication through a `jwks_uri` registered in Suomi.fi Service Management. The technical-description response retrieved on 24 October 2026 was the introduction only. It names authentication steps, metadata, attributes, and key management, and it does not include an endpoint list in the text that was returned. Endpoint URLs, scopes, and claim names from that guide are therefore omitted. Compatibility of this repository with Suomi.fi has not been validated.

Generic OAuth ideas in the browser demo, such as an authorization code, a `state` value, and an access token, are teaching examples. They are not a statement of Suomi.fi requirements. The repository paths `/authorize`, `/oauth/token`, and `/verified-profile` are stub shapes.

## Observability in the API

Logs include the correlation id from the mapped diagnostic context. Audit rows store `ts`, `actor`, `action`, `target`, `correlation_id`, and `details`. The actor is the authenticated name or `anonymous`. Recorded action names are `AUTH_SESSION_STARTED`, `AUTH_CALLBACK_RECEIVED`, `AUTH_CALLBACK_COMPLETED`, and `PROFILE_FETCHED`.

The browser demo reuses those names when the simulated moment matches. It also writes simulator-only names such as `SIMULATOR_STATE_REJECTED`. Those rows stay in `sessionStorage` for the tab. Reset removes the demo key `suomifi-integration-starter.identity-explorer.v1` and does not clear other storage.

## Project layout

```
apps/api              Spring Boot service
libs/suomifi-client   Adapter interface and WebClient implementation
infra/                Compose file and WireMock mappings
web/                  Browser-only Identity Integration Explorer
scripts/              Unsigned demo JWT helpers
docs/architecture.md  Backend and demo boundaries
```

## License

MIT. See [LICENSE](LICENSE). This is an educational prototype. It contains demo placeholders only.
