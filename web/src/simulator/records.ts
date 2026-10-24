import {
  APP_ORIGIN,
  PLACEHOLDER_ACCESS_TOKEN,
  PLACEHOLDER_ID_TOKEN,
  PLACEHOLDER_RESOURCE_TOKEN,
  PROVIDER_ORIGIN,
  REDIRECT_PATH,
  TIMEOUT_ILLUSTRATIVE_MS,
} from "./constants";
import type {
  AuditRecord,
  HeaderExample,
  HttpExample,
  Outcome,
  Persona,
  PlaceholderClaims,
  ScenarioId,
} from "./types";

export interface RecordContext {
  createId: (prefix: string) => string;
  stamp: () => string;
  runId: string;
  correlationId: string;
  scenarioId: ScenarioId;
}

function correlationHeaders(correlationId: string, extra: HeaderExample[] = []): HeaderExample[] {
  return [{ name: "X-Correlation-Id", value: correlationId }, ...extra];
}

function baseExample(
  ctx: RecordContext,
  fields: Omit<HttpExample, "id" | "runId" | "correlationId" | "scenarioId" | "recordedAt">,
): HttpExample {
  return {
    id: ctx.createId("demo-req"),
    runId: ctx.runId,
    correlationId: ctx.correlationId,
    scenarioId: ctx.scenarioId,
    recordedAt: ctx.stamp(),
    ...fields,
  };
}

export function sessionRequest(ctx: RecordContext, state: string): HttpExample {
  const authUrl =
    `${PROVIDER_ORIGIN}/authorize?response_type=code` +
    `&client_id=demo-client-id` +
    `&redirect_uri=${encodeURIComponent(APP_ORIGIN + REDIRECT_PATH)}` +
    `&state=${encodeURIComponent(state)}` +
    `&scope=openid%20profile`;
  return baseExample(ctx, {
    stepId: "session",
    method: "POST",
    endpoint: "/api/v1/auth/session",
    endpointKind: "repository-api",
    status: 200,
    statusLabel: "200 OK — example of the repository response shape",
    transportFailure: null,
    headers: correlationHeaders(ctx.correlationId, [
      { name: "Content-Type", value: "application/json" },
    ]),
    requestBody: null,
    responseBody: {
      authUrl,
      state,
      note: "authUrl is illustrative. AuthService builds this shape from suomifi.client.base-url. The host identity-stub.invalid is not routable and is not a Suomi.fi endpoint.",
    },
    illustrativeTimingMs: 8,
    timingNote: "Illustrative timing, not a measurement.",
    note: "Repository route. Local development listens on port 8080. This demo does not call it.",
  });
}

export function providerAuthorizeRequest(
  ctx: RecordContext,
  input: {
    state: string;
    outcome: "code" | "cancelled" | "timeout";
    code: string | null;
  },
): HttpExample {
  const endpoint =
    `${PROVIDER_ORIGIN}/authorize?response_type=code` +
    `&client_id=demo-client-id` +
    `&redirect_uri=${encodeURIComponent(APP_ORIGIN + REDIRECT_PATH)}` +
    `&state=${encodeURIComponent(input.state)}` +
    `&scope=openid%20profile`;
  if (input.outcome === "timeout") {
    return baseExample(ctx, {
      stepId: "provider",
      method: "GET",
      endpoint,
      endpointKind: "illustrative-provider",
      status: null,
      statusLabel: "Simulated transport failure",
      transportFailure: "Simulated timeout before any response",
      headers: correlationHeaders(ctx.correlationId),
      requestBody: null,
      responseBody: null,
      illustrativeTimingMs: TIMEOUT_ILLUSTRATIVE_MS,
      timingNote:
        "Illustrative label only. The page did not wait 10 seconds and did not open a connection.",
      note: "Illustrative provider interaction. WireMock has no /authorize mapping. Not a verified Suomi.fi contract. Backend retries were not executed.",
    });
  }
  if (input.outcome === "cancelled") {
    return baseExample(ctx, {
      stepId: "provider",
      method: "GET",
      endpoint,
      endpointKind: "illustrative-provider",
      status: 400,
      statusLabel: "400 Simulated cancellation — not an API response",
      transportFailure: null,
      headers: correlationHeaders(ctx.correlationId),
      requestBody: null,
      responseBody: {
        error: "access_denied",
        error_description: "Simulated visitor cancelled at the fictional provider.",
      },
      illustrativeTimingMs: 12,
      timingNote: "Illustrative timing, not a measurement.",
      note: "Illustrative provider interaction. The backend has no cancel handler. Not a verified Suomi.fi contract.",
    });
  }
  return baseExample(ctx, {
    stepId: "provider",
    method: "GET",
    endpoint,
    endpointKind: "illustrative-provider",
    status: 200,
    statusLabel: "200 Simulated provider response — not an API response",
    transportFailure: null,
    headers: correlationHeaders(ctx.correlationId),
    requestBody: null,
    responseBody: {
      code: input.code,
      state: input.state,
      note: "Nonfunctional placeholder code. The repository never receives this browser event.",
    },
    illustrativeTimingMs: 12,
    timingNote: "Illustrative timing, not a measurement.",
    note: "Illustrative provider interaction using the /authorize path shape from AuthService. Not a verified Suomi.fi contract.",
  });
}

export function callbackRequest(
  ctx: RecordContext,
  input: { code: string; returnedState: string; expectedState: string; rejected: boolean },
): HttpExample {
  const endpoint =
    `/api/v1/auth/callback?code=${encodeURIComponent(input.code)}` +
    `&state=${encodeURIComponent(input.returnedState)}`;
  return baseExample(ctx, {
    stepId: "callback",
    method: "GET",
    endpoint,
    endpointKind: "repository-api",
    status: input.rejected ? 400 : 200,
    statusLabel: input.rejected
      ? "400 Simulated — the backend does not return this"
      : "200 Simulated acceptance — exchange has not run yet",
    transportFailure: null,
    headers: correlationHeaders(ctx.correlationId),
    requestBody: null,
    responseBody: input.rejected
      ? {
          error: "simulated_state_mismatch",
          expectedState: input.expectedState,
          returnedState: input.returnedState,
          message:
            "The browser simulator stopped before token exchange. AuthService.handleCallback does not perform this check.",
        }
      : {
          message:
            "Callback parameters accepted by the simulator. Token exchange has not run yet. The backend would continue inside the same handler.",
          state: input.returnedState,
        },
    illustrativeTimingMs: 11,
    timingNote: "Illustrative timing, not a measurement.",
    note: "Repository route shape. This demo does not call it. A simulated 400 is not a response the current controller produces.",
  });
}

export function exchangeRequest(
  ctx: RecordContext,
  input: { code: string; expired: boolean },
): HttpExample {
  return baseExample(ctx, {
    stepId: "exchange",
    method: "POST",
    endpoint: `${PROVIDER_ORIGIN}/oauth/token`,
    endpointKind: "illustrative-provider",
    status: 200,
    statusLabel: "200 Simulated token response — not an API response",
    transportFailure: null,
    headers: correlationHeaders(ctx.correlationId, [
      { name: "Content-Type", value: "application/x-www-form-urlencoded" },
    ]),
    requestBody: {
      grant_type: "authorization_code",
      code: input.code,
      redirect_uri: `${APP_ORIGIN}${REDIRECT_PATH}`,
      client_id: "demo-client-id",
      client_secret: "<repository-demo-placeholder>",
      encoding_note:
        "WebClientSuomifiAdapter sends these fields as a form, not as JSON. state is not included. The repository default client secret is a demo placeholder and is not shown here.",
    },
    responseBody: {
      access_token: PLACEHOLDER_ACCESS_TOKEN,
      id_token: PLACEHOLDER_ID_TOKEN,
      token_type: "Bearer",
      expires_in: input.expired ? 0 : 3600,
      scope: "openid profile",
      id_token_note:
        "TokenResponse and the WireMock stub include an id_token field. AuthController does not return it. No ID-token validation is implemented.",
    },
    illustrativeTimingMs: 18,
    timingNote: "Illustrative timing, not a measurement.",
    note: "Illustrative provider call. The adapter uses {configured base URL}/oauth/token, which is WireMock in local development. This host is not a verified Suomi.fi endpoint.",
  });
}

export function profileApiRequest(
  ctx: RecordContext,
  input: { denied: boolean; profile: unknown; claims: PlaceholderClaims },
): HttpExample {
  return baseExample(ctx, {
    stepId: "profile",
    method: "GET",
    endpoint: "/api/v1/profile",
    endpointKind: "repository-api",
    status: input.denied ? 401 : 200,
    statusLabel: input.denied
      ? "401 Simulated expiry — not an API response"
      : "200 Example profile response shape",
    transportFailure: null,
    headers: correlationHeaders(ctx.correlationId, [
      { name: "Authorization", value: `Bearer ${PLACEHOLDER_RESOURCE_TOKEN}` },
    ]),
    requestBody: null,
    responseBody: input.denied
      ? {
          error: "simulated_token_expired",
          illustrativeClaims: input.claims,
          message:
            "The browser simulator denied the profile step because the placeholder exp is in the past. DemoJwtDecoder would reject that exp and would still not verify a signature. ProfileService would not run. This body was not produced by the API.",
        }
      : {
          profile: input.profile,
          authorization: PLACEHOLDER_RESOURCE_TOKEN,
          parsing_note:
            "Showing parsed placeholder claims is not cryptographic verification. The signature segment is the text signature-not-checked.",
          claims: input.claims,
        },
    illustrativeTimingMs: 9,
    timingNote: "Illustrative timing, not a measurement.",
    note: "Repository route. The demo does not send the placeholder bearer token.",
  });
}

export function profileProviderRequest(
  ctx: RecordContext,
  profile: unknown,
): HttpExample {
  return baseExample(ctx, {
    stepId: "profile",
    method: "GET",
    endpoint: `${PROVIDER_ORIGIN}/verified-profile`,
    endpointKind: "illustrative-provider",
    status: 200,
    statusLabel: "200 Simulated stub profile — not an API response",
    transportFailure: null,
    headers: correlationHeaders(ctx.correlationId, [
      { name: "Authorization", value: `Bearer ${PLACEHOLDER_ACCESS_TOKEN}` },
    ]),
    requestBody: null,
    responseBody: profile,
    illustrativeTimingMs: 14,
    timingNote: "Illustrative timing, not a measurement.",
    note: "Illustrative provider call. ProfileService uses the fixed placeholder demo-access-token against {baseUrl}/verified-profile. Not a verified Suomi.fi userinfo contract. The body here is a fictional persona, not the WireMock fixture.",
  });
}

export function auditEvent(
  ctx: RecordContext,
  input: {
    actor: string;
    action: string;
    actionOrigin: AuditRecord["actionOrigin"];
    outcome: Outcome;
    target?: string | null;
    details: Record<string, string | number | boolean>;
  },
): AuditRecord {
  return {
    id: ctx.createId("demo-audit"),
    runId: ctx.runId,
    ts: ctx.stamp(),
    actor: input.actor,
    action: input.action,
    actionOrigin: input.actionOrigin,
    outcome: input.outcome,
    target: input.target ?? null,
    correlationId: ctx.correlationId,
    details: input.details,
  };
}

export function profileFromPersona(persona: Persona) {
  return {
    givenName: persona.givenName,
    familyName: persona.familyName,
    dateOfBirth: persona.dateOfBirth,
    nationalIdentifier: persona.id,
    assuranceLevel: "demo-only" as const,
    email: persona.email,
  };
}

export function claimsFor(persona: Persona, nowMs: number, expired: boolean): PlaceholderClaims {
  const issued = Math.floor(nowMs / 1000) - 120;
  return {
    sub: persona.subject,
    iss: "demo-simulator.invalid",
    aud: "demo-client-id",
    iat: issued,
    exp: expired ? issued + 30 : issued + 3600,
    purpose: "illustrative-claims-not-a-signed-token",
  };
}
