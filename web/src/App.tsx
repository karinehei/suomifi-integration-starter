import { useRoute, type RouteId } from "./router";
import { useSnapshot } from "./components/SimulatorContext";
import { ArchitectureView } from "./views/ArchitectureView";
import { AuditView } from "./views/AuditView";
import { InspectorView } from "./views/InspectorView";
import { StatusView } from "./views/StatusView";
import { WalkthroughView } from "./views/WalkthroughView";

const NAV: readonly { id: RouteId; href: string; label: string }[] = [
  { id: "walkthrough", href: "#/walkthrough", label: "Walkthrough" },
  { id: "inspector", href: "#/inspector", label: "Request Inspector" },
  { id: "audit", href: "#/audit", label: "Audit Trail" },
  { id: "architecture", href: "#/architecture", label: "Architecture" },
  { id: "status", href: "#/status", label: "Implementation Status" },
];

export function App() {
  const route = useRoute();
  const snapshot = useSnapshot();
  return (
    <>
      <a className="skip-link" href="#content">
        Skip to content
      </a>
      <div className="banner" id="demo-banner" role="region" aria-label="Demo limitations">
        <p className="banner-title">Independent portfolio demo · Simulated authentication · No connection to Suomi.fi</p>
        <p>
          This simulator illustrates integration concepts. It does not authenticate users, validate identities,
          or provide production security.
        </p>
      </div>
      <header className="site-header">
        <div className="brand">
          <span className="mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <div>
            <p className="eyebrow">Portfolio prototype</p>
            <h1>Identity Integration Explorer</h1>
          </div>
        </div>
        <p className="header-copy">
          A browser-only view of the patterns in this repository. The Kotlin API, WireMock stubs, and database
          are not contacted.
        </p>
      </header>
      <nav className="site-nav" aria-label="Demo sections">
        {NAV.map((item) => (
          <a key={item.id} href={item.href} aria-current={route.id === item.id && !route.unknown ? "page" : undefined}>
            {item.label}
          </a>
        ))}
      </nav>
      <main id="content">
        {route.unknown ? (
          <p className="inline-error" role="alert">
            That section does not exist. The walkthrough is shown instead.
          </p>
        ) : null}
        {route.id === "walkthrough" ? <WalkthroughView /> : null}
        {route.id === "inspector" ? <InspectorView /> : null}
        {route.id === "audit" ? <AuditView /> : null}
        {route.id === "architecture" ? <ArchitectureView /> : null}
        {route.id === "status" ? <StatusView /> : null}
      </main>
      <footer className="site-footer">
        <p>
          History mode:{" "}
          {snapshot.persistence === "memory"
            ? "in-memory fallback. Browser storage could not be used, so this page will not restore the demo after a reload."
            : "sessionStorage key suomifi-integration-starter.identity-explorer.v1. Reset clears only that demo key."}
        </p>
        <p>Nothing on this page is a Suomi.fi login, an official client, or a production integration.</p>
      </footer>
    </>
  );
}
