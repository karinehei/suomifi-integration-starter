import type { StatusReport, StatusRow } from "./types";

const rows: readonly StatusRow[] = [
  {
    topic: "Stub authentication flow",
    status: "Stubbed",
    evidence:
      "POST /api/v1/auth/session returns a generated state and an authorization URL. GET /api/v1/auth/callback exchanges a code and fetches a profile through the adapter. WireMock stubs POST /oauth/token and GET /verified-profile. There is no /authorize stub.",
    paths: [
      "apps/api/src/main/kotlin/fi/demo/api/controller/AuthController.kt",
      "apps/api/src/main/kotlin/fi/demo/api/service/AuthService.kt",
      "infra/wiremock/mappings/token-exchange.json",
      "infra/wiremock/mappings/verified-profile.json",
    ],
  },
  {
    topic: "Callback state handling",
    status: "Not implemented",
    evidence:
      "The session route generates a state and the callback logs it. AuthService.handleCallback does not store or compare state. WebClientSuomifiAdapter accepts state and does not send it on the token request. The browser mismatch stop is a simulation of this missing control.",
    paths: [
      "apps/api/src/main/kotlin/fi/demo/api/service/AuthService.kt",
      "libs/suomifi-client/src/main/kotlin/fi/demo/suomifi/client/impl/WebClientSuomifiAdapter.kt",
    ],
  },
  {
    topic: "JWT payload parsing",
    status: "Implemented",
    evidence:
      "DemoJwtDecoder splits a token on dots, base64url-decodes the header and payload, and builds a Spring Jwt. It does not check the signature segment.",
    paths: ["apps/api/src/main/kotlin/fi/demo/api/config/DemoJwtDecoder.kt"],
  },
  {
    topic: "JWT signature verification",
    status: "Not implemented",
    evidence:
      "DemoJwtDecoder documents and performs no signature verification. scripts/generate-jwt.ps1 appends the literal signature-placeholder. The resource-server configuration installs this decoder.",
    paths: [
      "apps/api/src/main/kotlin/fi/demo/api/config/DemoJwtDecoder.kt",
      "apps/api/src/main/kotlin/fi/demo/api/config/SecurityConfiguration.kt",
      "scripts/generate-jwt.ps1",
    ],
  },
  {
    topic: "JWT expiry check",
    status: "Implemented",
    evidence:
      "When an exp claim is present, DemoJwtDecoder rejects it if it is before the current time. ProfileService does not apply that check to its placeholder access token.",
    paths: [
      "apps/api/src/main/kotlin/fi/demo/api/config/DemoJwtDecoder.kt",
      "apps/api/src/main/kotlin/fi/demo/api/service/ProfileService.kt",
    ],
  },
  {
    topic: "ID token validation",
    status: "Not implemented",
    evidence:
      "TokenResponse requires an id_token field and the WireMock token fixture returns one. AuthService does not return or validate it. The authorization URL has no nonce.",
    paths: [
      "libs/suomifi-client/src/main/kotlin/fi/demo/suomifi/client/TokenResponse.kt",
      "apps/api/src/main/kotlin/fi/demo/api/service/AuthService.kt",
      "infra/wiremock/mappings/token-exchange.json",
    ],
  },
  {
    topic: "mTLS",
    status: "Not implemented",
    evidence:
      "Certificate path properties exist. buildSslContext returns null even when paths are set, and loadPrivateKey throws UnsupportedOperationException. The WebClient uses plain HTTP. Comments describe a future KeyManager setup.",
    paths: [
      "libs/suomifi-client/src/main/kotlin/fi/demo/suomifi/client/config/SuomifiClientConfiguration.kt",
      "libs/suomifi-client/src/main/kotlin/fi/demo/suomifi/client/config/SuomifiClientProperties.kt",
    ],
  },
  {
    topic: "Correlation IDs",
    status: "Implemented",
    evidence:
      "CorrelationIdFilter uses the X-Correlation-Id request header or a new UUID, puts it in the logging context, and returns it on the response. AuditService copies that value onto audit rows.",
    paths: [
      "apps/api/src/main/kotlin/fi/demo/api/config/CorrelationIdFilter.kt",
      "apps/api/src/main/kotlin/fi/demo/api/service/AuditService.kt",
    ],
  },
  {
    topic: "Database audit logging",
    status: "Implemented",
    evidence:
      "AuditService persists actor, action, target, correlation id, and details. Flyway creates audit_event. Recorded actions are AUTH_SESSION_STARTED, AUTH_CALLBACK_RECEIVED, AUTH_CALLBACK_COMPLETED, and PROFILE_FETCHED. The actor is the security name or anonymous.",
    paths: [
      "apps/api/src/main/kotlin/fi/demo/api/service/AuditService.kt",
      "apps/api/src/main/resources/db/migration/V1__create_audit_event_table.sql",
    ],
  },
  {
    topic: "Adapter error mapping",
    status: "Implemented",
    evidence:
      "WebClientSuomifiAdapter maps 401 and 403 to SuomifiAuthException, HTTP 5xx to SuomifiNetworkException, and other transport failures to SuomifiNetworkException. Typed exceptions also include SuomifiParseException.",
    paths: [
      "libs/suomifi-client/src/main/kotlin/fi/demo/suomifi/client/impl/WebClientSuomifiAdapter.kt",
      "libs/suomifi-client/src/main/kotlin/fi/demo/suomifi/client/SuomifiExceptions.kt",
    ],
  },
  {
    topic: "Retries for HTTP 5xx",
    status: "Implemented",
    evidence:
      "When retry is enabled, the adapter retries WebClientResponseException responses whose status is 5xx, up to max-retry-attempts, waiting retry-initial-delay-ms each time. The delay is fixed, not exponential.",
    paths: [
      "libs/suomifi-client/src/main/kotlin/fi/demo/suomifi/client/impl/WebClientSuomifiAdapter.kt",
      "apps/api/src/main/resources/application.yml",
    ],
  },
  {
    topic: "Connection-error retry",
    status: "Not implemented",
    evidence:
      "The retry predicate also names SuomifiNetworkException, but that type is assigned after the retry operator. Connection failures therefore do not match the predicate while retries are decided.",
    paths: ["libs/suomifi-client/src/main/kotlin/fi/demo/suomifi/client/impl/WebClientSuomifiAdapter.kt"],
  },
  {
    topic: "API error response contract",
    status: "Not verified",
    evidence:
      "The inspected source has no ControllerAdvice and no dedicated error body for callback or profile failures. Adapter exceptions are not mapped to a documented API error schema in the files reviewed.",
    paths: ["apps/api/src/main/kotlin/fi/demo/api/controller/AuthController.kt"],
  },
  {
    topic: "Real-provider integration",
    status: "Not verified",
    evidence:
      "Configured paths are /authorize, /oauth/token, and /verified-profile on a local base URL. Official Suomi.fi OIDC material checked on 24 October 2026 did not supply an endpoint list in the retrieved technical-description text. Compatibility has not been validated. Replacing the base URL and demo credentials does not create a working integration.",
    paths: [
      "apps/api/src/main/resources/application.yml",
      "libs/suomifi-client/src/main/kotlin/fi/demo/suomifi/client/config/SuomifiClientProperties.kt",
    ],
  },
];

export function getStatusReport(): StatusReport {
  return {
    checkedOn: "24 October 2026",
    rows,
    providerNote:
      "Official pages checked on 24 October 2026: the OIDC technical description updated 7 October 2026, and the schedule announcement published 7 October 2026. That announcement still lists an OIDC test environment on 3 December 2026, production on 28 January 2027, and the end of the SAML transition on 1 June 2028. The retrieved technical-description body was an introduction only, so endpoint URLs, scopes, and claim names are omitted here. This repository has not been validated against Suomi.fi.",
  };
}
