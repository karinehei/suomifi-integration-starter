import { useEffect, useId, useState } from "react";
import { copyText } from "../copyText";

export function JsonPanel({
  title,
  value,
  open,
  onToggle,
}: {
  title: string;
  value: unknown;
  open: boolean;
  onToggle: () => void;
}) {
  const panelId = useId();
  const [feedback, setFeedback] = useState("");
  const text = value === null || value === undefined ? "" : JSON.stringify(value, null, 2);

  useEffect(() => {
    if (!feedback) return;
    const handle = window.setTimeout(() => setFeedback(""), 5000);
    return () => window.clearTimeout(handle);
  }, [feedback]);

  return (
    <section className="json-panel" aria-labelledby={`${panelId}-title`}>
      <div className="json-toolbar">
        <h3 id={`${panelId}-title`}>{title}</h3>
        <div className="json-actions">
          <button
            type="button"
            className="button secondary"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={onToggle}
          >
            {open ? "Collapse" : "Expand"}
          </button>
          <button
            type="button"
            className="button secondary"
            onClick={() => {
              void copyText(text || "null").then((ok) => {
                if (!ok) {
                  const node = document.getElementById(panelId);
                  if (node) {
                    const range = document.createRange();
                    range.selectNodeContents(node);
                    const selection = window.getSelection();
                    selection?.removeAllRanges();
                    selection?.addRange(range);
                  }
                }
                setFeedback(ok ? "Copied" : "Copy failed. The JSON is selected so you can copy it manually.");
              });
            }}
          >
            Copy {title}
          </button>
          <span role="status" className="copy-feedback">
            {feedback}
          </span>
        </div>
      </div>
      {open ? (
        <pre id={panelId} className="json-block" tabIndex={0}>
          {text || "null"}
        </pre>
      ) : (
        <p id={panelId} className="json-collapsed">
          Collapsed.
        </p>
      )}
    </section>
  );
}
