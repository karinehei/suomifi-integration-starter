import { STORAGE_KEY, STORAGE_VERSION } from "./constants";
import { SCENARIO_IDS, STEP_IDS } from "./types";
import type {
  AuditRecord,
  DemoRun,
  FictionalProfile,
  HttpExample,
  PersistedState,
  PlaceholderClaims,
  ScenarioId,
} from "./types";

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export class StorageUnavailableError extends Error {
  constructor() {
    super("Demo storage is unavailable");
    this.name = "StorageUnavailableError";
  }
}

export function createMemoryStorage(initial?: Record<string, string>): KeyValueStorage & {
  snapshot(): Record<string, string>;
} {
  const data = { ...initial };
  return {
    getItem(key: string) {
      return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null;
    },
    setItem(key: string, value: string) {
      data[key] = value;
    },
    removeItem(key: string) {
      delete data[key];
    },
    snapshot() {
      return { ...data };
    },
  };
}

export function emptyPersistedState(): PersistedState {
  return {
    version: STORAGE_VERSION,
    scenarioId: "success",
    activeRunId: null,
    inspectedRunId: null,
    runs: [],
  };
}

export interface LoadResult {
  state: PersistedState;
  rewritten: boolean;
}

export function loadPersisted(storage: KeyValueStorage): LoadResult {
  let raw: string | null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    throw new StorageUnavailableError();
  }
  if (raw === null || raw.trim() === "") {
    return { state: emptyPersistedState(), rewritten: false };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { state: emptyPersistedState(), rewritten: true };
  }
  const state = parseState(parsed);
  if (!state) {
    return { state: emptyPersistedState(), rewritten: true };
  }
  const rewritten = JSON.stringify(state) !== JSON.stringify(parsed);
  return { state, rewritten };
}

export function savePersisted(storage: KeyValueStorage, state: PersistedState): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function parseState(value: unknown): PersistedState | null {
  const record = asRecord(value);
  if (!record || record.version !== STORAGE_VERSION) return null;
  const runsValue = record.runs;
  if (!Array.isArray(runsValue)) return null;
  const runs = runsValue.map(parseRun).filter((run): run is DemoRun => run !== null);
  const scenarioId = isScenarioId(record.scenarioId) ? record.scenarioId : "success";
  const activeRunId = optionalString(record.activeRunId);
  const inspectedRunId = optionalString(record.inspectedRunId);
  return {
    version: STORAGE_VERSION,
    scenarioId,
    activeRunId: runs.some((run) => run.id === activeRunId) ? activeRunId : null,
    inspectedRunId: runs.some((run) => run.id === inspectedRunId) ? inspectedRunId : null,
    runs,
  };
}

function parseRun(value: unknown): DemoRun | null {
  const record = asRecord(value);
  if (!record) return null;
  if (typeof record.id !== "string" || typeof record.correlationId !== "string") return null;
  if (!isScenarioId(record.scenarioId)) return null;
  if (!isRunPhase(record.phase)) return null;
  if (typeof record.expectedState !== "string") return null;
  const requestsValue = record.requests;
  const auditsValue = record.audits;
  if (!Array.isArray(requestsValue) || !Array.isArray(auditsValue)) return null;
  const requests = requestsValue.map(parseRequest).filter((item): item is HttpExample => item !== null);
  const audits = auditsValue.map(parseAudit).filter((item): item is AuditRecord => item !== null);
  if (requests.length !== requestsValue.length || audits.length !== auditsValue.length) return null;
  return {
    id: record.id,
    scenarioId: record.scenarioId,
    correlationId: record.correlationId,
    phase: record.phase,
    personaId: optionalString(record.personaId),
    expectedState: record.expectedState,
    returnedState: optionalString(record.returnedState),
    code: optionalString(record.code),
    accessToken: optionalString(record.accessToken),
    idTokenPlaceholder: optionalString(record.idTokenPlaceholder),
    resourceTokenPlaceholder: optionalString(record.resourceTokenPlaceholder),
    claims: parseClaims(record.claims),
    profile: parseProfile(record.profile),
    failure: parseFailure(record.failure),
    requests,
    audits,
  };
}

function parseRequest(value: unknown): HttpExample | null {
  const record = asRecord(value);
  if (!record) return null;
  if (
    typeof record.id !== "string" ||
    typeof record.runId !== "string" ||
    typeof record.correlationId !== "string" ||
    typeof record.method !== "string" ||
    typeof record.endpoint !== "string" ||
    typeof record.statusLabel !== "string" ||
    typeof record.recordedAt !== "string" ||
    typeof record.timingNote !== "string" ||
    typeof record.note !== "string"
  ) {
    return null;
  }
  if (!isScenarioId(record.scenarioId) || !isStepId(record.stepId)) return null;
  if (record.endpointKind !== "repository-api" && record.endpointKind !== "illustrative-provider") {
    return null;
  }
  if (!(record.status === null || typeof record.status === "number")) return null;
  if (!(record.transportFailure === null || typeof record.transportFailure === "string")) return null;
  if (typeof record.illustrativeTimingMs !== "number") return null;
  if (!Array.isArray(record.headers)) return null;
  const headers = record.headers.map(parseHeader).filter((item): item is HttpExample["headers"][number] => item !== null);
  if (headers.length !== record.headers.length) return null;
  return {
    id: record.id,
    runId: record.runId,
    correlationId: record.correlationId,
    scenarioId: record.scenarioId,
    stepId: record.stepId,
    method: record.method,
    endpoint: record.endpoint,
    endpointKind: record.endpointKind,
    status: record.status,
    statusLabel: record.statusLabel,
    transportFailure: record.transportFailure,
    headers,
    requestBody: sanitizeJson(record.requestBody),
    responseBody: sanitizeJson(record.responseBody),
    recordedAt: record.recordedAt,
    illustrativeTimingMs: record.illustrativeTimingMs,
    timingNote: record.timingNote,
    note: record.note,
  };
}

function parseHeader(value: unknown): { name: string; value: string } | null {
  const record = asRecord(value);
  if (!record || typeof record.name !== "string" || typeof record.value !== "string") return null;
  return { name: record.name, value: record.value };
}

function parseAudit(value: unknown): AuditRecord | null {
  const record = asRecord(value);
  if (!record) return null;
  if (
    typeof record.id !== "string" ||
    typeof record.runId !== "string" ||
    typeof record.ts !== "string" ||
    typeof record.actor !== "string" ||
    typeof record.action !== "string" ||
    typeof record.correlationId !== "string"
  ) {
    return null;
  }
  if (record.actionOrigin !== "backend-action" && record.actionOrigin !== "simulator-only") return null;
  if (record.outcome !== "success" && record.outcome !== "failure" && record.outcome !== "info") {
    return null;
  }
  if (!(record.target === null || typeof record.target === "string")) return null;
  const details = asRecord(record.details);
  if (!details) return null;
  const safeDetails: Record<string, string | number | boolean> = {};
  for (const [key, detail] of Object.entries(details)) {
    if (key === "__proto__" || key === "constructor") continue;
    if (typeof detail === "string" || typeof detail === "number" || typeof detail === "boolean") {
      safeDetails[key] = detail;
    }
  }
  return {
    id: record.id,
    runId: record.runId,
    ts: record.ts,
    actor: record.actor,
    action: record.action,
    actionOrigin: record.actionOrigin,
    outcome: record.outcome,
    target: record.target,
    correlationId: record.correlationId,
    details: safeDetails,
  };
}

function parseProfile(value: unknown): FictionalProfile | null {
  if (value === null) return null;
  const record = asRecord(value);
  if (!record) return null;
  if (
    typeof record.givenName !== "string" ||
    typeof record.familyName !== "string" ||
    typeof record.dateOfBirth !== "string" ||
    typeof record.nationalIdentifier !== "string" ||
    record.assuranceLevel !== "demo-only" ||
    typeof record.email !== "string"
  ) {
    return null;
  }
  return {
    givenName: record.givenName,
    familyName: record.familyName,
    dateOfBirth: record.dateOfBirth,
    nationalIdentifier: record.nationalIdentifier,
    assuranceLevel: "demo-only",
    email: record.email,
  };
}

function parseClaims(value: unknown): PlaceholderClaims | null {
  if (value === null) return null;
  const record = asRecord(value);
  if (!record) return null;
  if (
    typeof record.sub !== "string" ||
    record.iss !== "demo-simulator.invalid" ||
    record.aud !== "demo-client-id" ||
    typeof record.iat !== "number" ||
    typeof record.exp !== "number" ||
    record.purpose !== "illustrative-claims-not-a-signed-token"
  ) {
    return null;
  }
  return {
    sub: record.sub,
    iss: "demo-simulator.invalid",
    aud: "demo-client-id",
    iat: record.iat,
    exp: record.exp,
    purpose: "illustrative-claims-not-a-signed-token",
  };
}

function parseFailure(value: unknown): DemoRun["failure"] {
  if (value === null) return null;
  const record = asRecord(value);
  if (!record) return null;
  if (
    (record.code !== "user_cancelled" &&
      record.code !== "state_mismatch" &&
      record.code !== "token_expired" &&
      record.code !== "provider_timeout") ||
    !isStepId(record.stepId) ||
    typeof record.title !== "string" ||
    typeof record.message !== "string" ||
    typeof record.recovery !== "string"
  ) {
    return null;
  }
  return {
    code: record.code,
    stepId: record.stepId,
    title: record.title,
    message: record.message,
    recovery: record.recovery,
  };
}

function sanitizeJson(value: unknown, depth = 0): unknown {
  if (value === null || depth > 8) return value === null ? null : null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.map((item) => sanitizeJson(item, depth + 1));
  if (typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      if (key === "__proto__" || key === "constructor") continue;
      output[key] = sanitizeJson(item, depth + 1);
    }
    return output;
  }
  return null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function optionalString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function isScenarioId(value: unknown): value is ScenarioId {
  return typeof value === "string" && (SCENARIO_IDS as readonly string[]).includes(value);
}

function isStepId(value: unknown): value is HttpExample["stepId"] {
  return typeof value === "string" && (STEP_IDS as readonly string[]).includes(value);
}

function isRunPhase(value: unknown): value is DemoRun["phase"] {
  return (
    value === "session_started" ||
    value === "provider_completed" ||
    value === "callback_accepted" ||
    value === "exchanged" ||
    value === "profile_ready" ||
    value === "ended" ||
    value === "blocked"
  );
}
