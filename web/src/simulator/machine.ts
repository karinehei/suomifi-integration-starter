import { getArchitectureModel } from "./architecture";
import {
  DEFAULT_TIMEOUT_DELAY_MS,
  MAX_RUNS,
  PLACEHOLDER_ACCESS_TOKEN,
  PLACEHOLDER_CODE,
  PLACEHOLDER_ID_TOKEN,
  PLACEHOLDER_RESOURCE_TOKEN,
  STORAGE_KEY,
} from "./constants";
import { DEFAULT_PERSONA_ID, personaById, PERSONAS } from "./personas";
import {
  auditEvent,
  callbackRequest,
  claimsFor,
  exchangeRequest,
  profileApiRequest,
  profileFromPersona,
  profileProviderRequest,
  providerAuthorizeRequest,
  sessionRequest,
  type RecordContext,
} from "./records";
import { describeSteps, SCENARIOS, scenarioById } from "./scenarios";
import { getStatusReport } from "./status";
import {
  createMemoryStorage,
  emptyPersistedState,
  loadPersisted,
  savePersisted,
  type KeyValueStorage,
} from "./storage";
import type {
  DemoRun,
  IdentitySimulator,
  PersistedState,
  PersistenceMode,
  RunPhase,
  ScenarioId,
  SimulatorSnapshot,
} from "./types";
import { SCENARIO_IDS } from "./types";

export interface SimulatorOptions {
  now?: () => number;
  createId?: (prefix: string) => string;
  storage?: KeyValueStorage;
  schedule?: (callback: () => void, delayMs: number) => () => void;
  timeoutDelayMs?: number;
}

export function createIdentitySimulator(options: SimulatorOptions = {}): IdentitySimulator {
  const now = options.now ?? (() => Date.now());
  const createId = options.createId ?? ((prefix: string) => `${prefix}-${crypto.randomUUID()}`);
  const schedule =
    options.schedule ??
    ((callback, delayMs) => {
      const handle = setTimeout(callback, delayMs);
      return () => clearTimeout(handle);
    });
  const timeoutDelayMs = options.timeoutDelayMs ?? DEFAULT_TIMEOUT_DELAY_MS;

  const resolved = resolveStorage(options.storage);
  let storage = resolved.storage;
  let persistence: PersistenceMode = resolved.persistence;
  let storageWritable = resolved.writable;
  let clockOffset = 0;

  let scenarioId = resolved.initial.scenarioId;
  let runs = resolved.initial.runs;
  let activeRunId = resolved.initial.activeRunId;
  let inspectedRunId = resolved.initial.inspectedRunId;
  let inlineError: string | null = null;
  let announcement = resolved.restored
    ? "Restored saved demo history in this tab. Nothing was loaded from a server."
    : "Ready. This is a simulated session and it does not contact an identity provider.";
  let pending = false;
  let pendingToken = 0;
  let cancelTimer: (() => void) | null = null;
  let depth = 0;
  let generation = 0;
  let snapshot = materialize();
  const listeners = new Set<() => void>();

  if (resolved.rewritten && storageWritable) {
    persist();
  }

  function stamp(): string {
    clockOffset += 1;
    return new Date(now() + clockOffset).toISOString();
  }

  function activeRun(): DemoRun | null {
    return runs.find((run) => run.id === activeRunId) ?? null;
  }

  function materialize(): SimulatorSnapshot {
    const active = activeRun();
    const phase = active?.phase ?? "idle";
    const failureStep = phase === "blocked" ? active?.failure?.stepId ?? null : null;
    const canAdvance = phase !== "ended" && phase !== "blocked" && !pending;
    return {
      scenarioId,
      scenario: scenarioById(scenarioId),
      scenarios: SCENARIOS,
      personas: PERSONAS,
      phase,
      activeRun: active,
      runs,
      inspectedRunId,
      pending,
      inlineError,
      announcement,
      persistence,
      steps: describeSteps(phase, failureStep),
      canNext: canAdvance,
      canRun: canAdvance,
      canEnd: !pending && phase === "profile_ready",
      canStartNew: !pending && (phase === "ended" || phase === "blocked"),
      canSelectPersona: !pending && phase === "session_started",
    };
  }

  function emit(): void {
    snapshot = materialize();
    persist();
    for (const listener of listeners) listener();
  }

  function persist(): void {
    if (!storageWritable) return;
    try {
      savePersisted(storage, {
        version: 1,
        scenarioId,
        activeRunId,
        inspectedRunId,
        runs,
      });
    } catch {
      storageWritable = false;
      persistence = "memory";
      storage = createMemoryStorage();
      snapshot = materialize();
    }
  }

  function replaceRun(next: DemoRun): void {
    runs = runs.map((run) => (run.id === next.id ? next : run));
  }

  function remember(run: DemoRun): void {
    runs = [...runs, run].slice(-MAX_RUNS);
    if (activeRunId && !runs.some((item) => item.id === activeRunId)) {
      activeRunId = null;
    }
    if (inspectedRunId && !runs.some((item) => item.id === inspectedRunId)) {
      inspectedRunId = null;
    }
  }

  function contextFor(run: DemoRun): RecordContext {
    return {
      createId,
      stamp,
      runId: run.id,
      correlationId: run.correlationId,
      scenarioId: run.scenarioId,
    };
  }

  function cancelPending(): void {
    pendingToken += 1;
    cancelTimer?.();
    cancelTimer = null;
    pending = false;
  }

  function reject(message: string): void {
    inlineError = message;
    emit();
  }

  function advance(): void {
    const current = activeRun();
    if (!current) {
      startRun();
      return;
    }
    switch (current.phase) {
      case "session_started":
        advanceProvider(current);
        return;
      case "provider_completed":
        advanceCallback(current);
        return;
      case "callback_accepted":
        advanceExchange(current);
        return;
      case "exchanged":
        advanceProfile(current);
        return;
      case "profile_ready":
        finish(current);
        return;
      default:
        reject("This step is not available.");
    }
  }

  function startRun(): void {
    const run: DemoRun = {
      id: createId("demo-run"),
      scenarioId,
      correlationId: createId("demo-corr"),
      phase: "session_started",
      personaId: null,
      expectedState: createId("demo-state"),
      returnedState: null,
      code: null,
      accessToken: null,
      idTokenPlaceholder: null,
      resourceTokenPlaceholder: null,
      claims: null,
      profile: null,
      failure: null,
      requests: [],
      audits: [],
    };
    const ctx = contextFor(run);
    run.requests = [sessionRequest(ctx, run.expectedState)];
    run.audits = [
      auditEvent(ctx, {
        actor: "anonymous",
        action: "AUTH_SESSION_STARTED",
        actionOrigin: "backend-action",
        outcome: "success",
        details: {
          state: run.expectedState,
          note: "Matches the repository action name. The state was not stored by a server.",
        },
      }),
    ];
    remember(run);
    activeRunId = run.id;
    inspectedRunId = run.id;
    inlineError = null;
    announcement = "Simulated session started. Choose a fictional persona, then continue.";
    emit();
  }

  function advanceProvider(run: DemoRun): void {
    const scenario = scenarioById(run.scenarioId);
    const persona = personaById(run.personaId) ?? personaById(DEFAULT_PERSONA_ID);
    if (!persona) {
      reject("No fictional persona is available.");
      return;
    }
    const withPersona: DemoRun = { ...run, personaId: persona.id };
    if (scenario.id === "timeout") {
      const token = pendingToken;
      pending = true;
      inlineError = null;
      announcement = "Simulating a provider timeout locally. No network request was started.";
      replaceRun(withPersona);
      emit();
      cancelTimer = schedule(() => {
        if (token !== pendingToken) return;
        cancelTimer = null;
        pending = false;
        const latest = runs.find((item) => item.id === withPersona.id);
        if (!latest || latest.phase !== "session_started") return;
        const ctx = contextFor(latest);
        const failed: DemoRun = {
          ...latest,
          phase: "blocked",
          failure: {
            code: "provider_timeout",
            stepId: "provider",
            title: "Simulated provider timeout",
            message: scenario.summary,
            recovery: scenario.recovery,
          },
          requests: [
            ...latest.requests,
            providerAuthorizeRequest(ctx, {
              state: latest.expectedState,
              outcome: "timeout",
              code: null,
            }),
          ],
          audits: [
            ...latest.audits,
            auditEvent(ctx, {
              actor: "anonymous",
              action: "SIMULATOR_PROVIDER_TIMEOUT",
              actionOrigin: "simulator-only",
              outcome: "failure",
              details: {
                waitedMs: timeoutDelayMs,
                illustrativeTimingMs: 10000,
                networkRequest: false,
              },
            }),
          ],
        };
        replaceRun(failed);
        announcement = "Simulated provider timeout. No callback was processed. Start a new demo session to try again.";
        emit();
      }, timeoutDelayMs);
      return;
    }

    const ctx = contextFor(withPersona);
    if (scenario.id === "cancel") {
      const failed: DemoRun = {
        ...withPersona,
        phase: "blocked",
        returnedState: null,
        code: null,
        failure: {
          code: "user_cancelled",
          stepId: "provider",
          title: "Simulated cancellation",
          message: "The fictional visitor cancelled before an authorization code was issued.",
          recovery: scenario.recovery,
        },
        requests: [
          ...withPersona.requests,
          providerAuthorizeRequest(ctx, {
            state: withPersona.expectedState,
            outcome: "cancelled",
            code: null,
          }),
        ],
        audits: [
          ...withPersona.audits,
          auditEvent(ctx, {
            actor: "anonymous",
            action: "SIMULATOR_USER_CANCELLED",
            actionOrigin: "simulator-only",
            outcome: "failure",
            target: persona.id,
            details: {
              persona: persona.id,
              callbackStarted: false,
            },
          }),
        ],
      };
      replaceRun(failed);
      inlineError = null;
      announcement = "Simulated cancellation. No callback, token exchange, or profile was created.";
      emit();
      return;
    }

    const returnedState =
      scenario.id === "state-mismatch" ? createId("demo-state-mismatch") : withPersona.expectedState;
    const next: DemoRun = {
      ...withPersona,
      phase: "provider_completed",
      code: PLACEHOLDER_CODE,
      returnedState,
      requests: [
        ...withPersona.requests,
        providerAuthorizeRequest(ctx, {
          state: returnedState,
          outcome: "code",
          code: PLACEHOLDER_CODE,
        }),
      ],
      audits: [
        ...withPersona.audits,
        auditEvent(ctx, {
          actor: "anonymous",
          action: "SIMULATOR_IDP_RESPONSE",
          actionOrigin: "simulator-only",
          outcome: "success",
          target: persona.id,
          details: {
            persona: persona.id,
            returnedState,
            stateMatches: returnedState === withPersona.expectedState,
          },
        }),
      ],
    };
    replaceRun(next);
    inlineError = null;
    announcement =
      scenario.id === "state-mismatch"
        ? "Simulated provider response used a different state. The next step processes the callback and must stop before exchange."
        : `Simulated provider response for ${persona.id}. The placeholder code is not a credential.`;
    emit();
  }

  function advanceCallback(run: DemoRun): void {
    if (!run.code || !run.returnedState) {
      reject("The simulated callback is missing a code or state.");
      return;
    }
    const rejected = run.returnedState !== run.expectedState;
    const ctx = contextFor(run);
    const request = callbackRequest(ctx, {
      code: run.code,
      returnedState: run.returnedState,
      expectedState: run.expectedState,
      rejected,
    });
    const received = auditEvent(ctx, {
      actor: "anonymous",
      action: "AUTH_CALLBACK_RECEIVED",
      actionOrigin: "backend-action",
      outcome: "info",
      details: {
        state: run.returnedState,
        hasCode: true,
        simulatedStateMatch: !rejected,
      },
    });
    if (rejected) {
      const scenario = scenarioById(run.scenarioId);
      const failed: DemoRun = {
        ...run,
        phase: "blocked",
        failure: {
          code: "state_mismatch",
          stepId: "callback",
          title: "Simulated state mismatch",
          message:
            "The callback state does not match the state stored for this demo run. Token exchange and profile display were not run.",
          recovery: scenario.recovery,
        },
        requests: [...run.requests, request],
        audits: [
          ...run.audits,
          received,
          auditEvent(ctx, {
            actor: "anonymous",
            action: "SIMULATOR_STATE_REJECTED",
            actionOrigin: "simulator-only",
            outcome: "failure",
            details: {
              expectedState: run.expectedState,
              returnedState: run.returnedState,
              backendComparesState: false,
              exchangeStarted: false,
            },
          }),
        ],
      };
      replaceRun(failed);
      inlineError = null;
      announcement =
        "State mismatch stopped the simulation before token exchange. The backend does not implement this check.";
      emit();
      return;
    }
    const next: DemoRun = {
      ...run,
      phase: "callback_accepted",
      requests: [...run.requests, request],
      audits: [...run.audits, received],
    };
    replaceRun(next);
    inlineError = null;
    announcement = "Simulated callback accepted. Code exchange has not run yet.";
    emit();
  }

  function advanceExchange(run: DemoRun): void {
    if (!run.code) {
      reject("There is no placeholder code to exchange.");
      return;
    }
    const persona = personaById(run.personaId) ?? personaById(DEFAULT_PERSONA_ID);
    if (!persona) {
      reject("No fictional persona is available.");
      return;
    }
    const expired = run.scenarioId === "expired-token";
    const ctx = contextFor(run);
    const claims = claimsFor(persona, now(), expired);
    const next: DemoRun = {
      ...run,
      phase: "exchanged",
      accessToken: PLACEHOLDER_ACCESS_TOKEN,
      idTokenPlaceholder: PLACEHOLDER_ID_TOKEN,
      resourceTokenPlaceholder: PLACEHOLDER_RESOURCE_TOKEN,
      claims,
      requests: [...run.requests, exchangeRequest(ctx, { code: run.code, expired })],
      audits: [
        ...run.audits,
        auditEvent(ctx, {
          actor: "anonymous",
          action: "SIMULATOR_CODE_EXCHANGED",
          actionOrigin: "simulator-only",
          outcome: "success",
          details: {
            idTokenValidated: false,
            stateSentToTokenEndpoint: false,
          },
        }),
        auditEvent(ctx, {
          actor: "anonymous",
          action: "AUTH_CALLBACK_COMPLETED",
          actionOrigin: "backend-action",
          outcome: "success",
          details: {
            state: run.expectedState,
            success: true,
            ordering:
              "The backend writes this after exchange and the callback's own profile fetch. This demo still gates the visible profile on the next step.",
          },
        }),
      ],
    };
    replaceRun(next);
    inlineError = null;
    announcement = expired
      ? "Placeholder exchange finished. The illustrative exp is already in the past. Profile access must be denied."
      : "Placeholder code exchange finished. The id token field is not validated. The profile step is separate in this demo.";
    emit();
  }

  function advanceProfile(run: DemoRun): void {
    const persona = personaById(run.personaId);
    if (!persona || !run.claims) {
      reject("The profile step is missing placeholder claims.");
      return;
    }
    const ctx = contextFor(run);
    const expired = run.claims.exp * 1000 <= now();
    if (expired || run.scenarioId === "expired-token") {
      const scenario = scenarioById("expired-token");
      const failed: DemoRun = {
        ...run,
        phase: "blocked",
        profile: null,
        failure: {
          code: "token_expired",
          stepId: "profile",
          title: "Simulated expired token",
          message:
            "The profile step was denied because the placeholder exp is in the past. No fictional profile is shown.",
          recovery: scenario.recovery,
        },
        requests: [
          ...run.requests,
          profileApiRequest(ctx, { denied: true, profile: null, claims: run.claims }),
        ],
        audits: [
          ...run.audits,
          auditEvent(ctx, {
            actor: "anonymous",
            action: "SIMULATOR_PROFILE_DENIED",
            actionOrigin: "simulator-only",
            outcome: "failure",
            target: persona.subject,
            details: {
              reason: "expired-exp",
              signatureVerified: false,
              providerProfileCalled: false,
            },
          }),
        ],
      };
      replaceRun(failed);
      inlineError = null;
      announcement =
        "Profile access denied for the expired placeholder. Start a new demo session. Signature verification was not performed.";
      emit();
      return;
    }
    const profile = profileFromPersona(persona);
    const next: DemoRun = {
      ...run,
      phase: "profile_ready",
      profile,
      requests: [
        ...run.requests,
        profileApiRequest(ctx, { denied: false, profile, claims: run.claims }),
        profileProviderRequest(ctx, profile),
      ],
      audits: [
        ...run.audits,
        auditEvent(ctx, {
          actor: persona.subject,
          action: "PROFILE_FETCHED",
          actionOrigin: "backend-action",
          outcome: "success",
          target: persona.subject,
          details: {
            assuranceLevel: profile.assuranceLevel,
            fictional: true,
          },
        }),
      ],
    };
    replaceRun(next);
    inlineError = null;
    announcement = `Fictional profile ready for ${persona.id}. This is not an authenticated identity.`;
    emit();
  }

  function finish(run: DemoRun): void {
    const ctx = contextFor(run);
    const persona = personaById(run.personaId);
    const next: DemoRun = {
      ...run,
      phase: "ended",
      audits: [
        ...run.audits,
        auditEvent(ctx, {
          actor: persona?.subject ?? "anonymous",
          action: "SIMULATOR_SESSION_ENDED",
          actionOrigin: "simulator-only",
          outcome: "info",
          target: persona?.id ?? null,
          details: {
            serverLogout: false,
          },
        }),
      ],
    };
    replaceRun(next);
    inlineError = null;
    announcement = "Demo session ended. The fictional profile remains in this tab's history only.";
    emit();
  }

  function begin(): boolean {
    if (depth > 0) return false;
    depth += 1;
    return true;
  }

  function end(): void {
    depth -= 1;
  }

  return {
    getSnapshot() {
      return snapshot;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    selectScenario(id: ScenarioId) {
      if (!(SCENARIO_IDS as readonly string[]).includes(id)) return;
      if (id === scenarioId && !pending) return;
      if (!begin()) return;
      generation += 1;
      cancelPending();
      scenarioId = id;
      activeRunId = null;
      inlineError = null;
      announcement = `${scenarioById(id).title} selected. Any in-progress simulation was cancelled. Saved demo history was kept.`;
      emit();
      end();
    },
    selectPersona(id: string) {
      if (pending) {
        reject("That action is already in progress.");
        return;
      }
      if (!begin()) return;
      const persona = personaById(id);
      const run = activeRun();
      if (!persona) {
        reject("That persona is not part of this demo.");
        end();
        return;
      }
      if (!run || run.phase !== "session_started") {
        reject("Choose a persona after the simulated session starts and before the provider step.");
        end();
        return;
      }
      replaceRun({ ...run, personaId: persona.id });
      inlineError = null;
      announcement = `${persona.id} selected. The identifier is a fictional placeholder.`;
      emit();
      end();
    },
    nextStep() {
      if (pending) {
        reject("That action is already in progress.");
        return;
      }
      if (!begin()) return;
      const phase = activeRun()?.phase;
      if (phase === "ended" || phase === "blocked") {
        reject("This scenario has already finished. Start a new demo session or reset the demo.");
        end();
        return;
      }
      advance();
      end();
    },
    runScenario() {
      if (pending) {
        reject("That action is already in progress.");
        return;
      }
      if (!begin()) return;
      const phase = activeRun()?.phase;
      if (phase === "ended" || phase === "blocked") {
        reject("This scenario has already finished. Start a new demo session or reset the demo.");
        end();
        return;
      }
      const seen = generation;
      let guard = 0;
      while (guard < 8) {
        guard += 1;
        const before = `${activeRunId}:${activeRun()?.phase ?? "idle"}:${runs.length}`;
        advance();
        if (generation !== seen || pending) break;
        const after = `${activeRunId}:${activeRun()?.phase ?? "idle"}:${runs.length}`;
        if (before === after) break;
        const nextPhase: RunPhase | "idle" = activeRun()?.phase ?? "idle";
        if (nextPhase === "ended" || nextPhase === "blocked") break;
      }
      end();
    },
    endSession() {
      if (pending) {
        reject("That action is already in progress.");
        return;
      }
      if (!begin()) return;
      const run = activeRun();
      if (run?.phase !== "profile_ready") {
        reject("End session is available after a fictional profile is shown.");
        end();
        return;
      }
      finish(run);
      end();
    },
    startNewSession() {
      if (pending) {
        reject("Wait until the simulated step finishes, or reset the demo.");
        return;
      }
      if (!begin()) return;
      const phase = activeRun()?.phase;
      if (phase !== "ended" && phase !== "blocked") {
        reject("Start a new demo session after the current one finishes or fails.");
        end();
        return;
      }
      activeRunId = null;
      inlineError = null;
      announcement = "Ready for a new demo session. The previous run remains in this tab's demo history.";
      emit();
      end();
    },
    reset() {
      generation += 1;
      cancelPending();
      scenarioId = "success";
      runs = [];
      activeRunId = null;
      inspectedRunId = null;
      inlineError = null;
      clockOffset = 0;
      announcement = "Demo reset. Local demo history cleared. Initial scenario restored.";
      emit();
    },
    inspectRun(runId: string | null) {
      if (runId !== null && !runs.some((run) => run.id === runId)) {
        reject("That demo run is not in this tab's history.");
        return;
      }
      inspectedRunId = runId;
      inlineError = null;
      announcement = runId
        ? "Showing the selected demo run."
        : "Following the current demo session.";
      emit();
    },
    getArchitecture: getArchitectureModel,
    getStatus: getStatusReport,
  };
}

function resolveStorage(provided?: KeyValueStorage): {
  storage: KeyValueStorage;
  persistence: PersistenceMode;
  writable: boolean;
  initial: PersistedState;
  restored: boolean;
  rewritten: boolean;
} {
  if (!provided) {
    try {
      const browserStorage = window.sessionStorage;
      const probe = `${STORAGE_KEY}.probe`;
      browserStorage.setItem(probe, "1");
      browserStorage.removeItem(probe);
      provided = browserStorage;
    } catch {
      return {
        storage: createMemoryStorage(),
        persistence: "memory",
        writable: false,
        initial: emptyPersistedState(),
        restored: false,
        rewritten: false,
      };
    }
  }
  try {
    const loaded = loadPersisted(provided);
    return {
      storage: provided,
      persistence: "browser-session",
      writable: true,
      initial: loaded.state,
      restored: loaded.state.runs.length > 0,
      rewritten: loaded.rewritten,
    };
  } catch {
    return {
      storage: createMemoryStorage(),
      persistence: "memory",
      writable: false,
      initial: emptyPersistedState(),
      restored: false,
      rewritten: false,
    };
  }
}
