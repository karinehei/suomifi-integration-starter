import { afterEach, describe, expect, it, vi } from "vitest";
import { STORAGE_KEY } from "./constants";
import { createIdentitySimulator } from "./machine";
import { createMemoryStorage, type KeyValueStorage } from "./storage";

function sequenceIds(): (prefix: string) => string {
  const counts = new Map<string, number>();
  return (prefix: string) => {
    const next = (counts.get(prefix) ?? 0) + 1;
    counts.set(prefix, next);
    return `${prefix}-${next}`;
  };
}

function createHarness(storage?: KeyValueStorage, now = () => 1_700_000_000_000) {
  return createIdentitySimulator({
    now,
    createId: sequenceIds(),
    storage: storage ?? createMemoryStorage(),
    schedule: (callback, delayMs) => {
      const handle = setTimeout(callback, delayMs);
      return () => clearTimeout(handle);
    },
    timeoutDelayMs: 200,
  });
}

afterEach(() => {
  vi.useRealTimers();
});

describe("successful and failed transitions", () => {
  it("walks the success scenario to a fictional profile and a closed session", () => {
    const sim = createHarness();
    sim.nextStep();
    expect(sim.getSnapshot().phase).toBe("session_started");
    sim.nextStep();
    expect(sim.getSnapshot().phase).toBe("provider_completed");
    expect(sim.getSnapshot().activeRun?.requests.some((item) => item.stepId === "exchange")).toBe(false);
    sim.nextStep();
    expect(sim.getSnapshot().phase).toBe("callback_accepted");
    expect(sim.getSnapshot().activeRun?.requests.some((item) => item.endpoint.includes("/oauth/token"))).toBe(false);
    sim.nextStep();
    expect(sim.getSnapshot().phase).toBe("exchanged");
    expect(sim.getSnapshot().activeRun?.profile).toBeNull();
    sim.nextStep();
    expect(sim.getSnapshot().phase).toBe("profile_ready");
    expect(sim.getSnapshot().activeRun?.profile?.nationalIdentifier).toBe("DEMO-PERSON-001");
    sim.nextStep();
    const run = sim.getSnapshot().activeRun;
    expect(sim.getSnapshot().phase).toBe("ended");
    expect(run?.audits.map((item) => item.action)).toEqual([
      "AUTH_SESSION_STARTED",
      "SIMULATOR_IDP_RESPONSE",
      "AUTH_CALLBACK_RECEIVED",
      "SIMULATOR_CODE_EXCHANGED",
      "AUTH_CALLBACK_COMPLETED",
      "PROFILE_FETCHED",
      "SIMULATOR_SESSION_ENDED",
    ]);
    expect(run?.requests.map((item) => item.stepId)).toEqual([
      "session",
      "provider",
      "callback",
      "exchange",
      "profile",
      "profile",
    ]);
  });

  it("uses the selected fictional persona", () => {
    const sim = createHarness();
    sim.nextStep();
    sim.selectPersona("DEMO-PERSON-002");
    sim.runScenario();
    expect(sim.getSnapshot().activeRun?.profile?.nationalIdentifier).toBe("DEMO-PERSON-002");
    expect(sim.getSnapshot().activeRun?.profile?.email).toBe("eero.example@example.invalid");
  });

  it("rejects a persona change before a session exists", () => {
    const sim = createHarness();
    sim.selectPersona("DEMO-PERSON-003");
    expect(sim.getSnapshot().activeRun).toBeNull();
    expect(sim.getSnapshot().inlineError).toBeTruthy();
  });

  it("does not repeat a finished success run", () => {
    const sim = createHarness();
    sim.runScenario();
    const count = sim.getSnapshot().activeRun?.audits.length;
    sim.runScenario();
    sim.nextStep();
    expect(sim.getSnapshot().activeRun?.audits.length).toBe(count);
    expect(sim.getSnapshot().inlineError).toBeTruthy();
  });
});

describe("failure scenarios", () => {
  it("stops a state mismatch before token exchange and profile display", () => {
    const sim = createHarness();
    sim.selectScenario("state-mismatch");
    sim.runScenario();
    const run = sim.getSnapshot().activeRun;
    expect(run?.phase).toBe("blocked");
    expect(run?.failure?.code).toBe("state_mismatch");
    expect(run?.profile).toBeNull();
    expect(run?.accessToken).toBeNull();
    expect(run?.requests.some((item) => item.stepId === "exchange" || item.stepId === "profile")).toBe(false);
    expect(run?.audits.some((item) => item.action === "AUTH_CALLBACK_COMPLETED")).toBe(false);
    expect(run?.audits.some((item) => item.action === "SIMULATOR_STATE_REJECTED")).toBe(true);
    expect(run?.returnedState).not.toBe(run?.expectedState);
  });

  it("denies profile access when the placeholder token is expired", () => {
    const sim = createHarness();
    sim.selectScenario("expired-token");
    sim.runScenario();
    const run = sim.getSnapshot().activeRun;
    expect(run?.phase).toBe("blocked");
    expect(run?.failure?.code).toBe("token_expired");
    expect(run?.profile).toBeNull();
    expect(run?.requests.some((item) => item.endpoint === "/api/v1/profile" && item.status === 401)).toBe(true);
    expect(run?.requests.some((item) => item.endpoint.includes("verified-profile"))).toBe(false);
    expect(run?.audits.some((item) => item.action === "PROFILE_FETCHED")).toBe(false);
    expect(run?.audits.some((item) => item.action === "SIMULATOR_PROFILE_DENIED")).toBe(true);
    sim.nextStep();
    expect(sim.getSnapshot().activeRun?.profile).toBeNull();
  });

  it("stops cancellation before the callback and allows a new session", () => {
    const sim = createHarness();
    sim.selectScenario("cancel");
    sim.runScenario();
    const failed = sim.getSnapshot().activeRun;
    expect(failed?.failure?.code).toBe("user_cancelled");
    expect(failed?.requests.some((item) => item.stepId === "callback")).toBe(false);
    sim.startNewSession();
    expect(sim.getSnapshot().phase).toBe("idle");
    sim.nextStep();
    expect(sim.getSnapshot().runs).toHaveLength(2);
    expect(sim.getSnapshot().activeRun?.id).not.toBe(failed?.id);
    expect(sim.getSnapshot().activeRun?.phase).toBe("session_started");
  });

  it("records one local timeout and ignores duplicate actions while it is pending", () => {
    vi.useFakeTimers();
    const sim = createHarness();
    sim.selectScenario("timeout");
    sim.runScenario();
    expect(sim.getSnapshot().pending).toBe(true);
    expect(sim.getSnapshot().activeRun?.requests.some((item) => item.stepId === "provider")).toBe(false);
    sim.nextStep();
    sim.runScenario();
    vi.advanceTimersByTime(200);
    const run = sim.getSnapshot().activeRun;
    expect(sim.getSnapshot().pending).toBe(false);
    expect(run?.failure?.code).toBe("provider_timeout");
    expect(run?.requests.filter((item) => item.transportFailure)).toHaveLength(1);
    expect(run?.requests.some((item) => item.stepId === "callback")).toBe(false);
    expect(run?.audits.filter((item) => item.action === "SIMULATOR_PROVIDER_TIMEOUT")).toHaveLength(1);
    expect(run?.requests[1]?.illustrativeTimingMs).toBe(10000);
    expect(run?.requests[1]?.timingNote.toLowerCase()).toContain("did not wait");
  });

  it("drops a pending timeout when the demo is reset", () => {
    vi.useFakeTimers();
    const sim = createHarness();
    sim.selectScenario("timeout");
    sim.nextStep();
    sim.nextStep();
    expect(sim.getSnapshot().pending).toBe(true);
    sim.reset();
    vi.advanceTimersByTime(1000);
    const snapshot = sim.getSnapshot();
    expect(snapshot.pending).toBe(false);
    expect(snapshot.runs).toHaveLength(0);
    expect(snapshot.scenarioId).toBe("success");
    expect(snapshot.phase).toBe("idle");
    expect(snapshot.announcement).toContain("Demo reset");
  });

  it("does not apply a pending timeout after the scenario changes", () => {
    vi.useFakeTimers();
    const sim = createHarness();
    sim.selectScenario("timeout");
    sim.nextStep();
    sim.nextStep();
    sim.selectScenario("success");
    vi.advanceTimersByTime(1000);
    const snapshot = sim.getSnapshot();
    expect(snapshot.scenarioId).toBe("success");
    expect(snapshot.phase).toBe("idle");
    expect(snapshot.runs[0]?.phase).toBe("session_started");
    expect(snapshot.runs[0]?.audits.some((item) => item.action === "SIMULATOR_PROVIDER_TIMEOUT")).toBe(false);
  });
});

describe("correlation and recovery", () => {
  it("uses one correlation id for every request and audit event in a run", () => {
    const sim = createHarness();
    sim.runScenario();
    const run = sim.getSnapshot().activeRun;
    expect(run).toBeTruthy();
    const ids = [
      ...(run?.requests.map((item) => item.correlationId) ?? []),
      ...(run?.audits.map((item) => item.correlationId) ?? []),
    ];
    expect(new Set(ids)).toEqual(new Set([run?.correlationId]));
    expect(ids.length).toBeGreaterThan(5);
  });

  it("keeps an unrelated storage key when the demo is reset", () => {
    const storage = createMemoryStorage({ unrelated: "keep-me" });
    const sim = createHarness(storage);
    sim.runScenario();
    sim.reset();
    expect(storage.snapshot().unrelated).toBe("keep-me");
    const saved = storage.snapshot()[STORAGE_KEY];
    expect(saved).toContain('"runs":[]');
    expect(saved).not.toContain("unrelated");
  });
});
