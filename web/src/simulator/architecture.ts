import type { ArchitectureComponent, ArchitectureModel } from "./types";

const components: readonly ArchitectureComponent[] = [
  {
    id: "simulator",
    title: "Browser simulator",
    layer: "demo",
    responsibility:
      "The Identity Integration Explorer runs entirely in the browser. It illustrates sessions, callbacks, token exchange, profile display, failures, example HTTP records, and audit rows. It does not call the Spring Boot API, WireMock, PostgreSQL, or any identity provider.",
    paths: [
      "web/src/simulator/machine.ts",
      "web/src/simulator/scenarios.ts",
      "web/src/simulator/storage.ts",
    ],
    relatedRequests: ["None are transmitted. Example records stay in this tab."],
    status: "New browser simulation",
  },
  {
    id: "client",
    title: "Browser / API client",
    layer: "backend",
    responsibility:
      "The existing repository has no application frontend. README and QUICK_START show curl and Swagger as the client. The new explorer is a separate simulator and is not that client.",
    paths: ["README.md", "QUICK_START.md"],
    relatedRequests: [
      "POST /api/v1/auth/session",
      "GET /api/v1/auth/callback",
      "GET /api/v1/profile",
    ],
    status: "Documented as curl and Swagger",
  },
  {
    id: "api",
    title: "Spring Boot API",
    layer: "backend",
    responsibility:
      "Serves health, auth session, auth callback, and profile routes. Security permits the health and auth routes and requires a JWT for other routes. There is no ControllerAdvice in the inspected code.",
    paths: [
      "apps/api/src/main/kotlin/fi/demo/api/controller/AuthController.kt",
      "apps/api/src/main/kotlin/fi/demo/api/controller/ProfileController.kt",
      "apps/api/src/main/kotlin/fi/demo/api/controller/HealthController.kt",
      "apps/api/src/main/kotlin/fi/demo/api/config/SecurityConfiguration.kt",
    ],
    relatedRequests: [
      "GET /api/v1/health",
      "POST /api/v1/auth/session",
      "GET /api/v1/auth/callback",
      "GET /api/v1/profile",
    ],
    status: "Implemented",
  },
  {
    id: "auth-service",
    title: "Authentication service",
    layer: "backend",
    responsibility:
      "Builds an authorization URL and, on callback, exchanges the code and fetches a profile through the adapter. It does not store or compare the state parameter.",
    paths: ["apps/api/src/main/kotlin/fi/demo/api/service/AuthService.kt"],
    relatedRequests: ["POST /api/v1/auth/session", "GET /api/v1/auth/callback"],
    status: "Implemented for the stub flow. State is not checked.",
  },
  {
    id: "profile-service",
    title: "Profile service",
    layer: "backend",
    responsibility:
      "Loads a profile for the JWT subject by calling the adapter with the fixed placeholder access token demo-access-token. It does not store the callback access token or refresh one.",
    paths: ["apps/api/src/main/kotlin/fi/demo/api/service/ProfileService.kt"],
    relatedRequests: ["GET /api/v1/profile", "GET {baseUrl}/verified-profile"],
    status: "Stubbed",
  },
  {
    id: "security",
    title: "JWT parsing and correlation ID",
    layer: "backend",
    responsibility:
      "DemoJwtDecoder base64url-decodes a three-part token, checks exp when present, and does not verify the signature. CorrelationIdFilter reads or creates X-Correlation-Id, stores it in the logging context, and echoes it on the response.",
    paths: [
      "apps/api/src/main/kotlin/fi/demo/api/config/DemoJwtDecoder.kt",
      "apps/api/src/main/kotlin/fi/demo/api/config/CorrelationIdFilter.kt",
    ],
    relatedRequests: ["GET /api/v1/profile"],
    status: "Parsing and correlation IDs are implemented. Signature verification is not.",
  },
  {
    id: "adapter-interface",
    title: "Adapter interface",
    layer: "backend",
    responsibility:
      "SuomifiAdapter declares exchangeAuthorizationCode and fetchVerifiedProfile. The interface comment mentions an ID token. The API does not validate one.",
    paths: ["libs/suomifi-client/src/main/kotlin/fi/demo/suomifi/client/SuomifiAdapter.kt"],
    relatedRequests: ["POST {baseUrl}/oauth/token", "GET {baseUrl}/verified-profile"],
    status: "Implemented interface. Not a verified Suomi.fi contract.",
  },
  {
    id: "adapter-impl",
    title: "WebClient adapter",
    layer: "backend",
    responsibility:
      "Posts the authorization code as a form to {baseUrl}/oauth/token and fetches {baseUrl}/verified-profile with a bearer access token. Retries HTTP 5xx responses with a fixed delay. mTLS configuration returns null and does not install a client certificate.",
    paths: [
      "libs/suomifi-client/src/main/kotlin/fi/demo/suomifi/client/impl/WebClientSuomifiAdapter.kt",
      "libs/suomifi-client/src/main/kotlin/fi/demo/suomifi/client/config/SuomifiClientConfiguration.kt",
    ],
    relatedRequests: ["POST {baseUrl}/oauth/token", "GET {baseUrl}/verified-profile"],
    status: "Stubbed HTTP client. mTLS is not implemented.",
  },
  {
    id: "wiremock",
    title: "WireMock provider stub",
    layer: "backend",
    responsibility:
      "Local stub for POST /oauth/token and GET /verified-profile. There is no authorize mapping. Responses are fixtures, including an id_token whose signature segment is the text signature-placeholder.",
    paths: [
      "infra/wiremock/mappings/token-exchange.json",
      "infra/wiremock/mappings/verified-profile.json",
    ],
    relatedRequests: ["POST /oauth/token", "GET /verified-profile"],
    status: "Stubbed",
  },
  {
    id: "postgres",
    title: "PostgreSQL audit storage",
    layer: "backend",
    responsibility:
      "AuditService writes actor, action, target, correlation id, and details to audit_event. The actor is the authenticated name or anonymous. The browser demo does not write to this table.",
    paths: [
      "apps/api/src/main/kotlin/fi/demo/api/service/AuditService.kt",
      "apps/api/src/main/kotlin/fi/demo/api/domain/AuditEvent.kt",
      "apps/api/src/main/resources/db/migration/V1__create_audit_event_table.sql",
    ],
    relatedRequests: ["No HTTP route. Rows are written by the API services."],
    status: "Implemented for the API process",
  },
];

export function getArchitectureModel(): ArchitectureModel {
  return {
    components,
    separationNote:
      "The browser simulator is not a client of the Spring Boot API. Nothing in the diagram's backend column runs when you use this page.",
  };
}
