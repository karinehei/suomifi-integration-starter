package fi.demo.api.domain

import jakarta.persistence.*
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.type.SqlTypes
import java.time.Instant
import java.util.*

/**
 * Audit event entity for tracking all actions in the system.
 * 
 * This table stores audit logs for compliance and security monitoring.
 * All API endpoints should log audit events for important actions.
 */
@Entity
@Table(name = "audit_event")
class AuditEvent(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    var id: UUID = UUID.randomUUID(),
    
    @Column(nullable = false, updatable = false)
    var ts: Instant = Instant.now(),
    
    @Column(nullable = false, length = 255)
    var actor: String = "", // JWT subject or "anonymous"
    
    @Column(nullable = false, length = 100)
    var action: String = "", // e.g., "AUTH_SESSION_STARTED", "PROFILE_FETCHED"
    
    @Column(length = 255)
    var target: String? = null, // e.g., resource ID or endpoint
    
    @Column(name = "correlation_id", length = 255)
    var correlationId: String? = null,
    
    @JdbcTypeCode(SqlTypes.JSON)
    // Note: columnDefinition removed to allow H2 compatibility in tests
    // Production schema uses JSONB (see Flyway migration)
    var details: Map<String, Any>? = null
) {
    // No-arg constructor for Hibernate
    @Suppress("unused")
    constructor() : this(
        UUID.randomUUID(),
        Instant.now(),
        "",
        "",
        null,
        null,
        null
    )
}
