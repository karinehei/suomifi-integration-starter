import { useState } from "react";
import { JsonPanel } from "../components/JsonPanel";
import { useSimulator, useSnapshot } from "../components/SimulatorContext";
import type { DemoRun, HttpExample } from "../simulator/types";

export function InspectorView() {
  const sim = useSimulator();
  const snapshot = useSnapshot();
  const runs = displayedRuns(snapshot.runs, snapshot.inspectedRunId, snapshot.activeRun);
  const requests = runs.flatMap((run) => run.requests);
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({});

  function isOpen(id: string, index: number): boolean {
    return openIds[id] ?? index === 0;
  }

  function setOpen(id: string, index: number): void {
    setOpenIds((current) => ({ ...current, [id]: !isOpen(id, index) }));
  }

  return (
    <section className="view" aria-labelledby="inspector-title">
      <header className="view-intro">
        <h2 id="inspector-title">Request inspector</h2>
        <p>
          These are example records for the selected demo run. They are not sent anywhere. There is no
          send-request action. Provider URLs use the non-routable <code>.invalid</code> domain and are shown as
          text.
        </p>
      </header>
      <RunPicker />
      {requests.length === 0 ? (
        <p className="empty">No example requests yet. Run a walkthrough scenario to create some.</p>
      ) : (
        <>
          <div className="button-row">
            <button
              type="button"
              className="button secondary"
              onClick={() => {
                const next: Record<string, boolean> = {};
                for (const request of requests) {
                  next[`${request.id}-request`] = true;
                  next[`${request.id}-response`] = true;
                }
                setOpenIds(next);
              }}
            >
              Expand all
            </button>
            <button
              type="button"
              className="button secondary"
              onClick={() => {
                const next: Record<string, boolean> = {};
                for (const request of requests) {
                  next[`${request.id}-request`] = false;
                  next[`${request.id}-response`] = false;
                }
                setOpenIds(next);
              }}
            >
              Collapse all
            </button>
          </div>
          <ol className="request-list">
            {requests.map((request, index) => (
              <li key={request.id}>
                <RequestCard
                  request={request}
                  requestOpen={isOpen(`${request.id}-request`, index)}
                  responseOpen={isOpen(`${request.id}-response`, index)}
                  onToggleRequest={() => setOpen(`${request.id}-request`, index)}
                  onToggleResponse={() => setOpen(`${request.id}-response`, index)}
                />
              </li>
            ))}
          </ol>
        </>
      )}
      <p className="fine-print">
        Repository routes are the shapes implemented in this project. Additional provider interactions are
        illustrative. {sim.getSnapshot().persistence === "memory"
          ? "History is currently kept in memory only."
          : "History is stored in this tab's sessionStorage."}
      </p>
    </section>
  );
}

function RequestCard({
  request,
  requestOpen,
  responseOpen,
  onToggleRequest,
  onToggleResponse,
}: {
  request: HttpExample;
  requestOpen: boolean;
  responseOpen: boolean;
  onToggleRequest: () => void;
  onToggleResponse: () => void;
}) {
  return (
    <article className="card" aria-labelledby={`${request.id}-title`}>
      <h3 id={`${request.id}-title`}>
        <span className="method">{request.method}</span>{" "}
        <span className="endpoint">{request.endpoint}</span>
      </h3>
      <p className={request.transportFailure ? "flag failure" : "flag"}>{request.statusLabel}</p>
      <dl className="meta">
        <div>
          <dt>Kind</dt>
          <dd>{request.endpointKind === "repository-api" ? "Repository API shape" : "Illustrative provider"}</dd>
        </div>
        <div>
          <dt>Step</dt>
          <dd>{request.stepId}</dd>
        </div>
        <div>
          <dt>Scenario</dt>
          <dd>{request.scenarioId}</dd>
        </div>
        <div>
          <dt>Correlation ID</dt>
          <dd>
            <code>{request.correlationId}</code>
          </dd>
        </div>
        <div>
          <dt>Illustrative timing</dt>
          <dd>
            {request.illustrativeTimingMs} ms. {request.timingNote}
          </dd>
        </div>
      </dl>
      <p>{request.note}</p>
      {request.transportFailure ? <p className="inline-error">{request.transportFailure}</p> : null}
      <table className="data-table">
        <caption>Example headers</caption>
        <thead>
          <tr>
            <th scope="col">Header</th>
            <th scope="col">Value</th>
          </tr>
        </thead>
        <tbody>
          {request.headers.map((header) => (
            <tr key={header.name}>
              <th scope="row">{header.name}</th>
              <td>
                <code>{header.value}</code>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <JsonPanel title="Request body" value={request.requestBody} open={requestOpen} onToggle={onToggleRequest} />
      <JsonPanel title="Response body" value={request.responseBody} open={responseOpen} onToggle={onToggleResponse} />
    </article>
  );
}

export function RunPicker() {
  const sim = useSimulator();
  const snapshot = useSnapshot();
  return (
    <label className="field">
      <span>Run</span>
      <select
        value={snapshot.inspectedRunId ?? ""}
        onChange={(event) => sim.inspectRun(event.target.value || null)}
      >
        <option value="">Follow the current session</option>
        {snapshot.runs.map((run) => (
          <option key={run.id} value={run.id}>
            {run.scenarioId} · {run.phase} · {run.correlationId}
          </option>
        ))}
      </select>
    </label>
  );
}

export function displayedRuns(
  runs: readonly DemoRun[],
  inspectedRunId: string | null,
  activeRun: DemoRun | null,
): DemoRun[] {
  if (inspectedRunId) {
    const match = runs.filter((run) => run.id === inspectedRunId);
    return match;
  }
  if (activeRun) return [activeRun];
  return [...runs];
}
