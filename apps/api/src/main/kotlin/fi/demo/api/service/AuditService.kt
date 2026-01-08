package fi.demo.api.service

import fi.demo.api.domain.AuditEvent
import fi.demo.api.repository.AuditEventRepository
import org.slf4j.MDC
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

/**
 * Service for recording audit events.
 * 
 * All audit events are persisted to the database for compliance and
 * security monitoring. The actor is extracted from the JWT subject,
 * or defaults to "anonymous" if not authenticated.
 */
@Service
class AuditService(
    private val auditEventRepository: AuditEventRepository
) {
    
    @Transactional
    fun recordEvent(
        action: String,
        target: String? = null,
        details: Map<String, Any>? = null
    ) {
        val actor = extractActor()
        val correlationId = MDC.get("correlationId")
        
        val event = AuditEvent(
            actor = actor,
            action = action,
            target = target,
            correlationId = correlationId,
            details = details
        )
        
        auditEventRepository.save(event)
    }
    
    private fun extractActor(): String {
        return try {
            val authentication = SecurityContextHolder.getContext().authentication
            authentication?.name ?: "anonymous"
        } catch (ex: Exception) {
            "anonymous"
        }
    }
}
