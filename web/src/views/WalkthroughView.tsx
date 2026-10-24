import { JsonPanel } from "../components/JsonPanel";
import { useSimulator, useSnapshot } from "../components/SimulatorContext";
import { useState } from "react";

export function WalkthroughView() {
  const sim = useSimulator();
  const snapshot = useSnapshot();
  const run = snapshot.activeRun;
  const [notesOpen, setNotesOpen] = useState(true);

  return (
    <section className="view" aria-labelledby="walkthrough-title">
      <header className="view-intro">
        <h2 id="walkthrough-title">Authentication walkthrough</h2>
        <p>
          The stepper is a browser simulation. It does not authenticate a person, validate an identity, or
          open a connection. Placeholder codes and tokens are nonfunctional. Parsing the placeholder claims
          below is not cryptographic verification.
        </p>
      </header>

      <div className="layout">
        <div className="stack">
          <fieldset className="card">
            <legend>Scenario</legend>
            <p className="fine-print">Changing the scenario cancels an in-progress simulation and keeps completed history.</p>
            {snapshot.scenarios.map((scenario) => (
              <label key={scenario.id} className="choice">
                <input
                  type="radio"
                  name="scenario"
                  value={scenario.id}
                  checked={snapshot.scenarioId === scenario.id}
                  onChange={() => sim.selectScenario(scenario.id)}
                />
                <span>{scenario.title}</span>
              </label>
            ))}
          </fieldset>

          <article className="card">
            <h3>{snapshot.scenario.title}</h3>
            <p>{snapshot.scenario.summary}</p>
            <h4>Production responsibility</h4>
            <p>{snapshot.scenario.productionResponsibility}</p>
            <h4>Recovery</h4>
            <p>{snapshot.scenario.recovery}</p>
          </article>

          <fieldset className="card">
            <legend>Fictional persona</legend>
            <p className="fine-print">
              These identifiers are obviously invalid placeholders. Do not enter a personal identity code,
              password, certificate, or client secret.
            </p>
            {snapshot.personas.map((persona) => (
              <label key={persona.id} className="choice">
                <input
                  type="radio"
                  name="persona"
                  value={persona.id}
                  checked={run?.personaId === persona.id}
                  disabled={!snapshot.canSelectPersona}
                  onChange={() => sim.selectPersona(persona.id)}
                />
                <span>
                  {persona.givenName} {persona.familyName} · <code>{persona.id}</code>
                </span>
              </label>
            ))}
          </fieldset>
        </div>

        <div className="stack">
          <ol className="stepper" aria-label="Simulated authentication steps">
            {snapshot.steps.map((step, index) => (
              <li key={step.id} className={`step step-${step.state}`} aria-current={step.state === "current" ? "step" : undefined}>
                <span className="step-index">{index + 1}</span>
                <span>
                  <span className="step-label">{step.label}</span>
                  <span className="step-state">{step.state}</span>
                </span>
              </li>
            ))}
          </ol>

          <div className="button-row">
            <button type="button" className="button" onClick={() => sim.nextStep()} disabled={!snapshot.canNext} id="next-step">
              Next step
            </button>
            <button type="button" className="button secondary" onClick={() => sim.runScenario()} disabled={!snapshot.canRun} id="run-scenario">
              Run scenario
            </button>
            <button type="button" className="button secondary" onClick={() => sim.endSession()} disabled={!snapshot.canEnd}>
              End demo session
            </button>
            <button type="button" className="button secondary" onClick={() => sim.startNewSession()} disabled={!snapshot.canStartNew} id="start-new">
              {snapshot.scenario.recoveryLabel}
            </button>
            <button type="button" className="button reset" onClick={() => sim.reset()} id="reset-demo">
              Reset demo
            </button>
          </div>

          <p className="status-line" role="status" id="status-line">
            {snapshot.announcement}
          </p>
          {snapshot.inlineError ? (
            <p className="inline-error" role="alert">
              {snapshot.inlineError}
            </p>
          ) : null}
          {snapshot.pending ? <p className="pending">Simulating a provider timeout locally. No request is in flight.</p> : null}

          <article className="card" aria-labelledby="session-state-title">
            <h3 id="session-state-title">Session state</h3>
            <dl className="meta">
              <div>
                <dt>Phase</dt>
                <dd>{snapshot.phase}</dd>
              </div>
              <div>
                <dt>Correlation ID</dt>
                <dd>{run ? <code>{run.correlationId}</code> : "None yet"}</dd>
              </div>
              <div>
                <dt>Expected state</dt>
                <dd>{run ? <code>{run.expectedState}</code> : "None yet"}</dd>
              </div>
              <div>
                <dt>Returned state</dt>
                <dd>{run?.returnedState ? <code>{run.returnedState}</code> : "None yet"}</dd>
              </div>
              <div>
                <dt>Placeholder code</dt>
                <dd>{run?.code ? <code>{run.code}</code> : "None"}</dd>
              </div>
              <div>
                <dt>Access token placeholder</dt>
                <dd>{run?.accessToken ? <code>{run.accessToken}</code> : "None"}</dd>
              </div>
              <div>
                <dt>ID token field</dt>
                <dd>
                  {run?.idTokenPlaceholder ? <code>{run.idTokenPlaceholder}</code> : "None"}
                </dd>
              </div>
            </dl>
            <p className="fine-print">
              An access token is what the adapter sends to the stub profile route. An ID token is a separate
              field in <code>TokenResponse</code> and the WireMock fixture. The API does not return or validate
              an ID token. The resource-server placeholder is a third value, parsed only for illustration.
            </p>
            {run?.resourceTokenPlaceholder ? (
              <p>
                Resource-server placeholder: <code>{run.resourceTokenPlaceholder}</code>
              </p>
            ) : null}
          </article>

          {run?.failure ? (
            <article className="card failure-card" id="failure-card">
              <h3>{run.failure.title}</h3>
              <p>{run.failure.message}</p>
              <p>
                <strong>Recovery:</strong> {run.failure.recovery}
              </p>
            </article>
          ) : null}

          {run?.profile ? (
            <article className="card profile-card" id="profile-card">
              <h3>Fictional profile</h3>
              <p>This is demonstration data for the selected placeholder persona. It is not a verified identity.</p>
              <dl className="meta">
                <div>
                  <dt>Given name</dt>
                  <dd>{run.profile.givenName}</dd>
                </div>
                <div>
                  <dt>Family name</dt>
                  <dd>{run.profile.familyName}</dd>
                </div>
                <div>
                  <dt>Date of birth</dt>
                  <dd>{run.profile.dateOfBirth}</dd>
                </div>
                <div>
                  <dt>Placeholder identifier</dt>
                  <dd>
                    <code>{run.profile.nationalIdentifier}</code>
                  </dd>
                </div>
                <div>
                  <dt>Assurance label</dt>
                  <dd>{run.profile.assuranceLevel}</dd>
                </div>
                <div>
                  <dt>Email</dt>
                  <dd>{run.profile.email}</dd>
                </div>
              </dl>
            </article>
          ) : null}

          {run?.claims ? (
            <JsonPanel
              title="Illustrative claims — not a verified token"
              value={run.claims}
              open={notesOpen}
              onToggle={() => setNotesOpen((open) => !open)}
            />
          ) : null}
        </div>
      </div>

      <section className="notes" aria-labelledby="notes-title">
        <h3 id="notes-title">Step notes</h3>
        {snapshot.steps.map((step) => (
          <details key={step.id} open={step.state === "current" || step.state === "failed"}>
            <summary>
              {step.label} ({step.state})
            </summary>
            <p>{step.note}</p>
          </details>
        ))}
      </section>
    </section>
  );
}
