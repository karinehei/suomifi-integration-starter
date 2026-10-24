import { describe, expect, it } from "vitest";
import { STORAGE_KEY } from "./constants";
import { createIdentitySimulator } from "./machine";
import { createMemoryStorage, loadPersisted, type KeyValueStorage } from "./storage";

function sequenceIds(): (prefix: string) => string {
  const counts = new Map<string, number>();
  return (prefix: string) => {
    const next = (counts.get(prefix) ?? 0) + 1;
    counts.set(prefix, next);
    return `${prefix}-${next}`;
  };
}

describe("demo history persistence", () => {
  it("restores a finished run from the same storage", () => {
    const storage = createMemoryStorage();
    const first = createIdentitySimulator({
      now: () => 1_700_000_000_000,
      createId: sequenceIds(),
      storage,
    });
    first.nextStep();
    first.selectPersona("DEMO-PERSON-001");
    first.runScenario();
    const original = first.getSnapshot().activeRun;
    const second = createIdentitySimulator({
      now: () => 1_700_000_000_000,
      createId: sequenceIds(),
      storage,
    });
    expect(second.getSnapshot().phase).toBe("ended");
    expect(second.getSnapshot().activeRun?.correlationId).toBe(original?.correlationId);
    expect(second.getSnapshot().activeRun?.profile?.nationalIdentifier).toBe("DEMO-PERSON-001");
    expect(second.getSnapshot().runs).toHaveLength(1);
  });

  it("ignores malformed JSON and continues in the provided storage", () => {
    const storage = createMemoryStorage({ [STORAGE_KEY]: "{not-json" });
    const sim = createIdentitySimulator({
      now: () => 1_700_000_000_000,
      createId: sequenceIds(),
      storage,
    });
    expect(sim.getSnapshot().runs).toHaveLength(0);
    sim.nextStep();
    expect(sim.getSnapshot().activeRun?.audits[0]?.action).toBe("AUTH_SESSION_STARTED");
    expect(storage.snapshot()[STORAGE_KEY]).toContain("AUTH_SESSION_STARTED");
  });

  it("drops an unknown schema version and a malformed run", () => {
    const storage = createMemoryStorage({
      [STORAGE_KEY]: JSON.stringify({
        version: 99,
        scenarioId: "success",
        runs: [{ id: "old" }],
      }),
    });
    expect(loadPersisted(storage).state.runs).toHaveLength(0);
    const partial = createMemoryStorage({
      [STORAGE_KEY]: JSON.stringify({
        version: 1,
        scenarioId: "not-a-scenario",
        activeRunId: "missing",
        inspectedRunId: null,
        runs: [{ id: "broken" }, null],
      }),
    });
    const loaded = loadPersisted(partial);
    expect(loaded.state.scenarioId).toBe("success");
    expect(loaded.state.runs).toHaveLength(0);
    expect(loaded.state.activeRunId).toBeNull();
    expect(loaded.rewritten).toBe(true);
  });

  it("keeps working in memory when storage reads fail", () => {
    const storage: KeyValueStorage = {
      getItem() {
        throw new Error("storage blocked");
      },
      setItem() {
        throw new Error("storage blocked");
      },
      removeItem() {
        return undefined;
      },
    };
    const sim = createIdentitySimulator({
      now: () => 1_700_000_000_000,
      createId: sequenceIds(),
      storage,
    });
    expect(sim.getSnapshot().persistence).toBe("memory");
    sim.nextStep();
    expect(sim.getSnapshot().activeRun?.phase).toBe("session_started");
    expect(sim.getSnapshot().persistence).toBe("memory");
  });

  it("falls back to memory when a write exceeds storage", () => {
    let failed = false;
    const storage: KeyValueStorage = {
      getItem() {
        return null;
      },
      setItem() {
        failed = true;
        throw new Error("QuotaExceededError");
      },
      removeItem() {
        return undefined;
      },
    };
    const sim = createIdentitySimulator({
      now: () => 1_700_000_000_000,
      createId: sequenceIds(),
      storage,
    });
    sim.nextStep();
    expect(failed).toBe(true);
    expect(sim.getSnapshot().persistence).toBe("memory");
    expect(sim.getSnapshot().activeRun?.phase).toBe("session_started");
    sim.nextStep();
    expect(sim.getSnapshot().activeRun?.phase).toBe("provider_completed");
  });
});
