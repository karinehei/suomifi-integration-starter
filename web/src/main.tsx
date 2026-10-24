import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { SimulatorProvider } from "./components/SimulatorContext";
import { createIdentitySimulator } from "./simulator";
import "./styles.css";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Root element missing");
}

const simulator = createIdentitySimulator();

createRoot(root).render(
  <StrictMode>
    <SimulatorProvider simulator={simulator}>
      <App />
    </SimulatorProvider>
  </StrictMode>,
);
