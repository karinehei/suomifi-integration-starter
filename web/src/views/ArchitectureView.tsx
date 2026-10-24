import { useState } from "react";
import { useSimulator, useSnapshot } from "../components/SimulatorContext";
import { repoFileUrl } from "../simulator/constants";
import type { ArchitectureComponent, DemoRun, HttpExample } from "../simulator/types";

export function ArchitectureView() {
  const sim = useSimulator();
  const snapshot = useSnapshot();
  const model = sim.getArchitecture();
  const [selected, setSelected] = useState(model.components[0]?.id ?? "simulator");
  const component = model.components.find((item) => item.id === selected) ?? model.components[0];
  const run = snapshot.inspectedRunId
    ? snapshot.runs.find((item) => item.id === snapshot.inspectedRunId) ?? null
    : snapshot.activeRun;

  function move(offset: number) {
    const index = model.components.findIndex((item) => item.id === selected);
    const next = model.components[(index + offset + model.components.length) % model.components.length];
    setSelected(next.id);
    window.requestAnimationFrame(() => {
      document.getElementById(`arch-${next.id}`)?.focus();
    });
  }

  return (
    <section className="view" aria-labelledby="architecture-title">
      <header className="view-intro">
        <h2 id="architecture-title">Architecture</h2>
        <p>{model.separationNote}</p>
      </header>
      <div
        className="diagram"
        role="radiogroup"
        aria-label="Repository architecture"
        onKeyDown={(event) => {
          if (event.key === "ArrowRight" || event.key === "ArrowDown") {
            event.preventDefault();
            move(1);
          } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
            event.preventDefault();
            move(-1);
          } else if (event.key === "Home") {
            event.preventDefault();
            setSelected(model.components[0].id);
          } else if (event.key === "End") {
            event.preventDefault();
            setSelected(model.components[model.components.length - 1].id);
          }
        }}
      >
        <p className="diagram-kicker">Browser demo — not connected to the services below</p>
        <div className="diagram-demo">
          {model.components
            .filter((item) => item.layer === "demo")
            .map((item) => (
              <ComponentButton key={item.id} item={item} selected={item.id === component.id} onSelect={setSelected} />
            ))}
        </div>
        <p className="diagram-kicker">Existing backend — unchanged by this page</p>
        <div className="diagram-backend">
          {model.components
            .filter((item) => item.layer === "backend")
            .map((item) => (
              <ComponentButton key={item.id} item={item} selected={item.id === component.id} onSelect={setSelected} />
            ))}
        </div>
      </div>
      {component ? <ComponentDetail component={component} run={run} /> : null}
      <section className="text-equivalent" aria-labelledby="text-equivalent-title">
        <h3 id="text-equivalent-title">Text equivalent</h3>
        <ol>
          {model.components.map((item) => (
            <li key={item.id}>
              <strong>{item.title}.</strong> {item.responsibility} Status: {item.status}. Paths:{" "}
              {item.paths.join(", ")}. Related requests: {item.relatedRequests.join("; ")}.
            </li>
          ))}
        </ol>
      </section>
    </section>
  );
}

function ComponentButton({
  item,
  selected,
  onSelect,
}: {
  item: ArchitectureComponent;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      id={`arch-${item.id}`}
      type="button"
      role="radio"
      aria-checked={selected}
      tabIndex={selected ? 0 : -1}
      className={selected ? "arch-node selected" : "arch-node"}
      onClick={() => onSelect(item.id)}
    >
      <span className="arch-title">{item.title}</span>
      <span className="arch-status">{item.status}</span>
    </button>
  );
}

function ComponentDetail({ component, run }: { component: ArchitectureComponent; run: DemoRun | null }) {
  const examples = examplesFor(component.id, run);
  return (
    <article className="card" aria-live="polite">
      <h3>{component.title}</h3>
      <p>{component.responsibility}</p>
      <p>
        <strong>Status:</strong> {component.status}
      </p>
      <h4>Repository paths</h4>
      <ul>
        {component.paths.map((path) => (
          <li key={path}>
            <a href={repoFileUrl(path)}>{path}</a>
          </li>
        ))}
      </ul>
      <h4>Related request shapes</h4>
      <ul>
        {component.relatedRequests.map((request) => (
          <li key={request}>{request}</li>
        ))}
      </ul>
      <h4>Records from the selected demo run</h4>
      {examples.length === 0 ? (
        <p>No example request in the selected run is attributed to this component.</p>
      ) : (
        <ul>
          {examples.map((example) => (
            <li key={example.id}>
              {example.method} {example.endpoint} — {example.statusLabel}
            </li>
          ))}
        </ul>
      )}
      {component.id === "postgres" && run ? (
        <p>{run.audits.length} demonstration audit events share correlation ID {run.correlationId}.</p>
      ) : null}
    </article>
  );
}

function examplesFor(componentId: string, run: DemoRun | null): HttpExample[] {
  if (!run) return [];
  if (componentId === "simulator") return [...run.requests];
  if (componentId === "client" || componentId === "api") {
    return run.requests.filter((item) => item.endpointKind === "repository-api");
  }
  if (componentId === "auth-service") {
    return run.requests.filter((item) => item.stepId === "session" || item.stepId === "callback");
  }
  if (componentId === "profile-service" || componentId === "security") {
    return run.requests.filter((item) => item.endpoint === "/api/v1/profile");
  }
  if (componentId === "adapter-interface" || componentId === "adapter-impl" || componentId === "wiremock") {
    return run.requests.filter((item) => item.endpointKind === "illustrative-provider");
  }
  return [];
}
