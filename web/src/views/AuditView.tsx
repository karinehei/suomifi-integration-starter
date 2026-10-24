import { useMemo, useState } from "react";
import { useSimulator, useSnapshot } from "../components/SimulatorContext";
import { displayedRuns, RunPicker } from "./InspectorView";
import type { ActionOrigin, Outcome } from "../simulator/types";

export function AuditView() {
  const sim = useSimulator();
  const snapshot = useSnapshot();
  const [origin, setOrigin] = useState<"all" | ActionOrigin>("all");
  const [outcome, setOutcome] = useState<"all" | Outcome>("all");
  const [query, setQuery] = useState("");
  const runs = displayedRuns(snapshot.runs, snapshot.inspectedRunId, snapshot.activeRun);
  const events = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return runs
      .flatMap((run) => run.audits)
      .filter((event) => (origin === "all" ? true : event.actionOrigin === origin))
      .filter((event) => (outcome === "all" ? true : event.outcome === outcome))
      .filter((event) => (needle ? event.action.toLowerCase().includes(needle) : true));
  }, [runs, origin, outcome, query]);

  return (
    <section className="view" aria-labelledby="audit-title">
      <header className="view-intro">
        <h2 id="audit-title">Audit trail</h2>
        <p>
          These rows are session-local demonstration history. They are not a server audit log and they are
          not a tamper-resistant record. Actions marked “Repository action” reuse a name written by{" "}
          <code>AuditService</code>. Actions marked “Simulator only” do not exist in the backend.
        </p>
      </header>
      <div className="filter-bar">
        <RunPicker />
        <label className="field">
          <span>Origin</span>
          <select value={origin} onChange={(event) => setOrigin(event.target.value as "all" | ActionOrigin)}>
            <option value="all">All origins</option>
            <option value="backend-action">Repository action</option>
            <option value="simulator-only">Simulator only</option>
          </select>
        </label>
        <label className="field">
          <span>Outcome</span>
          <select value={outcome} onChange={(event) => setOutcome(event.target.value as "all" | Outcome)}>
            <option value="all">All outcomes</option>
            <option value="success">Success</option>
            <option value="failure">Failure</option>
            <option value="info">Info</option>
          </select>
        </label>
        <label className="field">
          <span>Action contains</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} type="search" />
        </label>
      </div>
      <p>
        {events.length} event{events.length === 1 ? "" : "s"} in view. Persistence:{" "}
        {snapshot.persistence === "memory"
          ? "in-memory fallback for this page view."
          : "this tab's sessionStorage, under a versioned demo key."}
      </p>
      {events.length === 0 ? (
        <p className="empty">No audit events match the current filters.</p>
      ) : (
        <div className="table-scroll">
          <table className="data-table">
            <caption>Demonstration audit events</caption>
            <thead>
              <tr>
                <th scope="col">Time</th>
                <th scope="col">Actor</th>
                <th scope="col">Action</th>
                <th scope="col">Outcome</th>
                <th scope="col">Correlation ID</th>
                <th scope="col">Details</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id}>
                  <td data-label="Time">
                    <time dateTime={event.ts}>{event.ts}</time>
                  </td>
                  <td data-label="Actor">{event.actor}</td>
                  <td data-label="Action">
                    <code>{event.action}</code>
                    <span className="origin">
                      {event.actionOrigin === "backend-action" ? "Repository action" : "Simulator only"}
                    </span>
                  </td>
                  <td data-label="Outcome">{event.outcome}</td>
                  <td data-label="Correlation ID">
                    <code>{event.correlationId}</code>
                  </td>
                  <td data-label="Details">
                    <button type="button" className="text-button" onClick={() => sim.inspectRun(event.runId)}>
                      Inspect this run
                    </button>
                    <dl className="detail-list">
                      {event.target ? (
                        <div>
                          <dt>Target</dt>
                          <dd>{event.target}</dd>
                        </div>
                      ) : null}
                      {Object.entries(event.details).map(([key, value]) => (
                        <div key={key}>
                          <dt>{key}</dt>
                          <dd>{String(value)}</dd>
                        </div>
                      ))}
                    </dl>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
