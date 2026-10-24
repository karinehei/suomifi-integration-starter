# Architecture

This repository is an educational prototype. The Spring Boot API and adapter exercise a stubbed authorization-code flow against WireMock. The browser app under `web/` is a separate simulator. It does not call the API.

Replacing `suomifi.client.base-url` does not turn the stub into a Suomi.fi client. Official onboarding and token validation are not implemented. See the README for what was checked in the public Suomi.fi developer material on 24 October 2026.

## Two separate pictures

```
Browser simulator (web/)
  Walkthrough, inspector, audit trail, architecture, status
  sessionStorage only
  No HTTP calls to the API or to an identity provider

Existing backend
  Browser or curl
    -> Spring Boot API
         -> AuthService / ProfileService
         -> DemoJwtDecoder and CorrelationIdFilter
         -> AuditService -> PostgreSQL
         -> SuomifiAdapter
              -> WebClientSuomifiAdapter (plain HTTP)
                   -> WireMock /oauth/token and /verified-profile
```

The simulator is not a client of the boxes below it.

## API

`apps/api` exposes:

- `GET /api/v1/health`
- `POST /api/v1/auth/session`
- `GET /api/v1/auth/callback`
- `GET /api/v1/profile`

`SecurityConfiguration` leaves health, Swagger, and the two auth routes open. Other routes require a JWT decoded by `DemoJwtDecoder`. There is no CSRF token because the API is stateless. That is not a substitute for checking the OAuth `state` value. The callback does not perform that check.

`AuthService.generateAuthUrl` concatenates `baseUrl`, `/authorize`, `response_type=code`, the demo client id, the redirect URI, `state`, and `scope=openid profile`. Nothing in this repository serves that authorize URL. WireMock has no authorize mapping.

`AuthService.handleCallback` always calls `exchangeAuthorizationCode` and then `fetchVerifiedProfile`. The `state` argument is not compared with a stored value.

`ProfileService.getProfileForSubject` logs that it is using a placeholder and calls the adapter with `demo-access-token`. It does not look up the access token from the callback.

## Adapter

`SuomifiAdapter` declares code exchange and profile fetch. `WebClientSuomifiAdapter` posts form fields to `{baseUrl}/oauth/token` (`grant_type`, `code`, `redirect_uri`, `client_id`, `client_secret`) and sends the access token to `{baseUrl}/verified-profile`. `state` is not placed on the token request.

`TokenResponse` requires `id_token`. The token stub returns one whose signature segment is the text `signature-placeholder`. The callback DTO returned to the caller keeps `accessToken` and a profile map. It does not return or validate the ID token. The authorize URL does not include `nonce`.

Retries: when enabled, HTTP 5xx `WebClientResponseException` responses are retried up to `max-retry-attempts`, waiting `retry-initial-delay-ms` each time. That wait is fixed. The predicate also mentions `SuomifiNetworkException`, but `onErrorMap` creates that type after the retry operator, so connection failures are not selected for retry.

mTLS: `SuomifiClientProperties` can hold certificate paths. `SuomifiClientConfiguration.buildSslContext` returns null even when those paths are set. `loadPrivateKey` throws `UnsupportedOperationException`. The `WebClient` connector is plain HTTP. Setting the properties does not enable mutual TLS.

Errors: 401 and 403 become `SuomifiAuthException`. HTTP 5xx and other transport failures become `SuomifiNetworkException`. `SuomifiParseException` exists as a type. The inspected API has no `ControllerAdvice`, so adapter failures do not have a documented JSON error body.

## Tokens

`DemoJwtDecoder` requires three dot-separated segments, decodes the first two as base64url JSON, and rejects a past `exp` when that claim exists. The third segment is ignored. This is parsing, not signature verification.

`GET /api/v1/profile` is the route that uses that decoder. The callback path does not. An expired resource-server token would fail in the decoder before `ProfileController` runs. The decoder would still not prove the token was signed.

## Audit storage

`AuditService` saves `actor`, `action`, `target`, `correlationId`, and `details` to `audit_event`. Flyway creates the table with JSONB details in PostgreSQL. The actor comes from the security context, or `anonymous`. `CorrelationIdFilter` supplies the id from `X-Correlation-Id` or a new UUID, and copies it to the response.

Action names written by the API:

- `AUTH_SESSION_STARTED`
- `AUTH_CALLBACK_RECEIVED`
- `AUTH_CALLBACK_COMPLETED`
- `PROFILE_FETCHED`

`AUTH_CALLBACK_COMPLETED` is written only after `handleCallback` returns. That method has already exchanged the code and fetched the stub profile. The browser demo splits those moments for inspection and labels the difference on the audit row.

Tests use H2 with Flyway disabled. The Compose stack uses PostgreSQL 16.

## WireMock

`infra/wiremock/mappings/token-exchange.json` answers `POST /oauth/token`. `verified-profile.json` answers `GET /verified-profile` for any bearer token. Both are fixtures. They are not a Suomi.fi contract. The profile fixture is sample data for the stub, not data used by the browser demo. The demo uses fictional personas such as `DEMO-PERSON-001`.

## Browser simulator

`web/` is a Vite app with hash routing and base path `/suomifi-integration-starter/`. Scenario logic lives behind `createIdentitySimulator`. Components render its snapshot.

The state machine can succeed, cancel, reject a mismatched callback state before exchange, deny a profile step when the illustrative `exp` is in the past, or record a timeout without a network request. Reset clears the versioned `sessionStorage` key for this demo and cancels a pending timeout. Malformed or unknown stored JSON is ignored. If `sessionStorage` throws, the page keeps history in memory.

The architecture and status views in the demo repeat the boundaries above and link to the files that support each status. They do not assign a readiness score.

## Local stack

```bash
docker compose -f infra/docker-compose.yml up
```

That starts PostgreSQL, WireMock, and the API. It does not start the browser demo. Use the `web/` commands in the README for the simulator.
