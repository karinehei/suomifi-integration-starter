import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";
import type { IdentitySimulator, SimulatorSnapshot } from "../simulator/types";

const SimulatorContext = createContext<IdentitySimulator | null>(null);

export function SimulatorProvider({
  simulator,
  children,
}: {
  simulator: IdentitySimulator;
  children: ReactNode;
}) {
  return <SimulatorContext.Provider value={simulator}>{children}</SimulatorContext.Provider>;
}

export function useSimulator(): IdentitySimulator {
  const simulator = useContext(SimulatorContext);
  if (!simulator) {
    throw new Error("The demo simulator is not available.");
  }
  return simulator;
}

export function useSnapshot(): SimulatorSnapshot {
  const simulator = useSimulator();
  return useSyncExternalStore(simulator.subscribe, simulator.getSnapshot, simulator.getSnapshot);
}
