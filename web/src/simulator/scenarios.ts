import type { ScenarioDefinition, ScenarioId, StepId, StepView } from "./types";

export const STEP_CATALOG: Record<StepId, { label: string; note: string }> = {
  session: {
    label: "Start a simulated session",
    note: "POST /api/v1/auth/session creates a random state and an authorization URL from suomifi.client.base-url. It does not redirect a browser and it does not store the state for later comparison. The audit action is AUTH_SESSION_STARTED. This page generates a placeholder state locally and does not call the endpoint.",
  },
  provider: {
    label: "Select a fictional persona and simulate the provider response",
    note: "There is no identity-provider session on this page. WireMock has no /authorize mapping. The URL uses the non-routable host identity-stub.invalid and the path shape from AuthService.generateAuthUrl. It is an illustration, not a Suomi.fi endpoint.",
  },
  callback: {
    label: "Process the simulated callback",
    note: "GET /api/v1/auth/callback accepts code and state, writes AUTH_CALLBACK_RECEIVED, then calls AuthService.handleCallback. That method does not compare state with a stored value. A mismatch on this page stops the flow before token exchange. That stop simulates a control the backend does not implement.",
  },
  exchange: {
    label: "Simulate code exchange",
    note: "WebClientSuomifiAdapter posts form fields to {baseUrl}/oauth/token. The state argument is unused. The stub body includes access_token and id_token. The API callback response keeps the access token and drops the id token. No ID-token validation is implemented. The host shown here is identity-stub.invalid.",
  },
  profile: {
    label: "Display a fictional profile",
    note: "GET /api/v1/profile expects a bearer JWT. DemoJwtDecoder base64url-decodes the payload, checks exp when it is present, and does not verify the signature. ProfileService then ignores that JWT and calls the adapter with the fixed placeholder demo-access-token. The profile on this page is fictional and is not returned by a service.",
  },
  end: {
    label: "End the demo session",
    note: "The repository has no logout endpoint. Ending the demo session closes the active walkthrough. Rows already recorded stay in this tab as demonstration history, not as a server audit log.",
  },
};

export const SCENARIOS: readonly ScenarioDefinition[] = [
  {
    id: "success",
    title: "Successful flow",
    summary:
      "Walks the teaching sequence through a fictional profile. The backend callback actually exchanges the code and fetches a stub profile in one handler. This page splits those moments so each one can be inspected.",
    productionResponsibility:
      "A relying party starts an authorization request, checks the callback state, redeems the code, validates tokens, and only then reads identity claims. This repository runs a stub of part of that sequence and does not validate token signatures.",
    recovery: "Start a new demo session to run the flow again.",
    recoveryLabel: "Start a new demo session",
  },
  {
    id: "cancel",
    title: "User cancels authentication",
    summary:
      "The fictional provider returns a cancellation after the session starts. No authorization code is issued, and the callback, token exchange, and profile steps do not run.",
    productionResponsibility:
      "A cancelled sign-in must not be followed by a code exchange. The application should show a safe message and wait for a new attempt. This backend has no cancel endpoint. The stop exists only in the browser simulation.",
    recovery: "Start a new demo session. The cancelled attempt does not continue to a callback.",
    recoveryLabel: "Start a new demo session",
  },
  {
    id: "state-mismatch",
    title: "Callback state mismatch",
    summary:
      "The simulated callback carries a different state from the one stored for this demo run. The simulator stops before token exchange and before any profile is shown.",
    productionResponsibility:
      "The server should store the expected state and reject the callback before redeeming a code. This backend generates a state, logs it, and passes it into the adapter, but it never stores or compares it. The adapter does not send state to the token endpoint. Stopping here simulates a control the backend does not implement.",
    recovery: "Discard this callback and start a new demo session. Do not exchange the code.",
    recoveryLabel: "Discard callback and start again",
  },
  {
    id: "expired-token",
    title: "Expired demo token",
    summary:
      "Code exchange completes with a nonfunctional placeholder whose illustrative exp is already in the past. The profile step is denied. No fictional profile is shown.",
    productionResponsibility:
      "An expired token should be rejected before protected profile data is returned. DemoJwtDecoder rejects a past exp and still does not verify a signature. ProfileService does not read that JWT; it calls the stub with the fixed placeholder demo-access-token. This denial is a browser simulation aligned with the decoder's expiry check, and it does not call the API.",
    recovery: "Start a new demo session. The expired placeholder cannot be used to show a profile.",
    recoveryLabel: "Start a new demo session",
  },
  {
    id: "timeout",
    title: "Identity provider timeout",
    summary:
      "The fictional provider does not answer. The page records a transport failure locally, without a network request and without waiting for a real timeout.",
    productionResponsibility:
      "A client needs a timeout, a visible failure, and a safe retry. WebClientSuomifiAdapter retries HTTP 5xx responses with a fixed delay. The network-exception clause is applied only after that retry operator, so it does not catch connection failures during retry. This scenario does not call the adapter and does not perform those retries.",
    recovery: "Start a new demo session. The timed-out attempt does not continue.",
    recoveryLabel: "Start a new demo session",
  },
];

export function scenarioById(id: ScenarioId): ScenarioDefinition {
  const found = SCENARIOS.find((scenario) => scenario.id === id);
  if (!found) {
    return SCENARIOS[0];
  }
  return found;
}

const STEP_ORDER: readonly StepId[] = [
  "session",
  "provider",
  "callback",
  "exchange",
  "profile",
  "end",
];

export function describeSteps(
  phase: "idle" | import("./types").RunPhase,
  failureStep: StepId | null,
): StepView[] {
  const current = currentStep(phase, failureStep);
  return STEP_ORDER.map((id) => {
    const catalog = STEP_CATALOG[id];
    let state: StepView["state"] = "upcoming";
    if (failureStep) {
      const failedIndex = STEP_ORDER.indexOf(failureStep);
      const index = STEP_ORDER.indexOf(id);
      if (index < failedIndex) state = "complete";
      else if (index === failedIndex) state = "failed";
      else state = "skipped";
    } else if (phase === "ended") {
      state = "complete";
    } else if (current === id) {
      state = "current";
    } else if (current && STEP_ORDER.indexOf(id) < STEP_ORDER.indexOf(current)) {
      state = "complete";
    }
    return { id, label: catalog.label, note: catalog.note, state };
  });
}

function currentStep(
  phase: "idle" | import("./types").RunPhase,
  failureStep: StepId | null,
): StepId | null {
  if (failureStep) return null;
  switch (phase) {
    case "idle":
      return "session";
    case "session_started":
      return "provider";
    case "provider_completed":
      return "callback";
    case "callback_accepted":
      return "exchange";
    case "exchanged":
      return "profile";
    case "profile_ready":
      return "end";
    case "ended":
    case "blocked":
      return null;
    default:
      return "session";
  }
}
