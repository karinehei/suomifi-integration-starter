package fi.demo.api.repository

import fi.demo.api.domain.AuditEvent
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.*

@Repository
interface AuditEventRepository : JpaRepository<AuditEvent, UUID> {
    fun findByCorrelationId(correlationId: String): List<AuditEvent>
}
