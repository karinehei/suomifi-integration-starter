export const SCENARIO_IDS = [
  "success",
  "cancel",
  "state-mismatch",
  "expired-token",
  "timeout",
] as const;

export type ScenarioId = (typeof SCENARIO_IDS)[number];

export const STEP_IDS = [
  "session",
  "provider",
  "callback",
  "exchange",
  "profile",
  "end",
] as const;

export type StepId = (typeof STEP_IDS)[number];

export type RunPhase =
  | "session_started"
  | "provider_completed"
  | "callback_accepted"
  | "exchanged"
  | "profile_ready"
  | "ended"
  | "blocked";

export type SnapshotPhase = "idle" | RunPhase;

export type StepState = "upcoming" | "current" | "complete" | "failed" | "skipped";

export type ActionOrigin = "backend-action" | "simulator-only";

export type Outcome = "success" | "failure" | "info";

export type PersistenceMode = "browser-session" | "memory";

export type EndpointKind = "repository-api" | "illustrative-provider";

export interface Persona {
  id: string;
  givenName: string;
  familyName: string;
  dateOfBirth: string;
  email: string;
  subject: string;
}

export interface FictionalProfile {
  givenName: string;
  familyName: string;
  dateOfBirth: string;
  nationalIdentifier: string;
  assuranceLevel: "demo-only";
  email: string;
}

export interface PlaceholderClaims {
  sub: string;
  iss: "demo-simulator.invalid";
  aud: "demo-client-id";
  iat: number;
  exp: number;
  purpose: "illustrative-claims-not-a-signed-token";
}

export interface ScenarioDefinition {
  id: ScenarioId;
  title: string;
  summary: string;
  productionResponsibility: string;
  recovery: string;
  recoveryLabel: string;
}

export interface FailureRecord {
  code: "user_cancelled" | "state_mismatch" | "token_expired" | "provider_timeout";
  stepId: StepId;
  title: string;
  message: string;
  recovery: string;
}

export interface HeaderExample {
  name: string;
  value: string;
}

export interface HttpExample {
  id: string;
  runId: string;
  correlationId: string;
  scenarioId: ScenarioId;
  stepId: StepId;
  method: string;
  endpoint: string;
  endpointKind: EndpointKind;
  status: number | null;
  statusLabel: string;
  transportFailure: string | null;
  headers: HeaderExample[];
  requestBody: unknown;
  responseBody: unknown;
  recordedAt: string;
  illustrativeTimingMs: number;
  timingNote: string;
  note: string;
}

export interface AuditRecord {
  id: string;
  runId: string;
  ts: string;
  actor: string;
  action: string;
  actionOrigin: ActionOrigin;
  outcome: Outcome;
  target: string | null;
  correlationId: string;
  details: Record<string, string | number | boolean>;
}

export interface DemoRun {
  id: string;
  scenarioId: ScenarioId;
  correlationId: string;
  phase: RunPhase;
  personaId: string | null;
  expectedState: string;
  returnedState: string | null;
  code: string | null;
  accessToken: string | null;
  idTokenPlaceholder: string | null;
  resourceTokenPlaceholder: string | null;
  claims: PlaceholderClaims | null;
  profile: FictionalProfile | null;
  failure: FailureRecord | null;
  requests: HttpExample[];
  audits: AuditRecord[];
}

export interface StepView {
  id: StepId;
  label: string;
  note: string;
  state: StepState;
}

export interface SimulatorSnapshot {
  scenarioId: ScenarioId;
  scenario: ScenarioDefinition;
  scenarios: readonly ScenarioDefinition[];
  personas: readonly Persona[];
  phase: SnapshotPhase;
  activeRun: DemoRun | null;
  runs: readonly DemoRun[];
  inspectedRunId: string | null;
  pending: boolean;
  inlineError: string | null;
  announcement: string;
  persistence: PersistenceMode;
  steps: readonly StepView[];
  canNext: boolean;
  canRun: boolean;
  canEnd: boolean;
  canStartNew: boolean;
  canSelectPersona: boolean;
}

export interface ArchitectureComponent {
  id: string;
  title: string;
  layer: "demo" | "backend";
  responsibility: string;
  paths: readonly string[];
  relatedRequests: readonly string[];
  status: string;
}

export interface ArchitectureModel {
  components: readonly ArchitectureComponent[];
  separationNote: string;
}

export type StatusValue =
  | "Implemented"
  | "Stubbed"
  | "Planned"
  | "Not implemented"
  | "Not verified";

export interface StatusRow {
  topic: string;
  status: StatusValue;
  evidence: string;
  paths: readonly string[];
}

export interface StatusReport {
  checkedOn: string;
  rows: readonly StatusRow[];
  providerNote: string;
}

export interface IdentitySimulator {
  getSnapshot(): SimulatorSnapshot;
  subscribe(listener: () => void): () => void;
  selectScenario(id: ScenarioId): void;
  selectPersona(id: string): void;
  nextStep(): void;
  runScenario(): void;
  endSession(): void;
  startNewSession(): void;
  reset(): void;
  inspectRun(runId: string | null): void;
  getArchitecture(): ArchitectureModel;
  getStatus(): StatusReport;
}

export interface PersistedState {
  version: 1;
  scenarioId: ScenarioId;
  activeRunId: string | null;
  inspectedRunId: string | null;
  runs: DemoRun[];
}
