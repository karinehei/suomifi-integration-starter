-- Create audit_event table for compliance and security monitoring
CREATE TABLE audit_event (
    id UUID PRIMARY KEY,
    ts TIMESTAMP NOT NULL,
    actor VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL,
    target VARCHAR(255),
    correlation_id VARCHAR(255),
    details JSONB
);

-- Create index on timestamp for efficient querying
CREATE INDEX idx_audit_event_ts ON audit_event(ts);

-- Create index on correlation_id for request tracing
CREATE INDEX idx_audit_event_correlation_id ON audit_event(correlation_id);

-- Create index on actor for user activity tracking
CREATE INDEX idx_audit_event_actor ON audit_event(actor);
