import { useSimulator } from "../components/SimulatorContext";
import { repoFileUrl } from "../simulator/constants";

export function StatusView() {
  const report = useSimulator().getStatus();
  return (
    <section className="view" aria-labelledby="status-title">
      <header className="view-intro">
        <h2 id="status-title">Implementation status</h2>
        <p>
          Statuses come from reading this repository. They are not readiness percentages, compliance scores,
          or completed security controls. “Not verified” means the inspected code and the retrieved official
          material do not establish the claim.
        </p>
      </header>
      <div className="table-scroll">
        <table className="data-table status-table">
          <caption>Evidence-based status, checked {report.checkedOn}</caption>
          <thead>
            <tr>
              <th scope="col">Topic</th>
              <th scope="col">Status</th>
              <th scope="col">Evidence</th>
              <th scope="col">Code</th>
            </tr>
          </thead>
          <tbody>
            {report.rows.map((row) => (
              <tr key={row.topic}>
                <th scope="row" data-label="Topic">
                  {row.topic}
                </th>
                <td data-label="Status">
                  <span className={`status-pill status-${slug(row.status)}`}>{row.status}</span>
                </td>
                <td data-label="Evidence">{row.evidence}</td>
                <td data-label="Code">
                  <ul>
                    {row.paths.map((path) => (
                      <li key={path}>
                        <a href={repoFileUrl(path)}>{path}</a>
                      </li>
                    ))}
                  </ul>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <aside className="note">
        <h3>Provider material</h3>
        <p>{report.providerNote}</p>
      </aside>
    </section>
  );
}

function slug(status: string): string {
  return status.toLowerCase().replace(/[^a-z]+/g, "-");
}
