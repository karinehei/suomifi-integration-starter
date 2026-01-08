package fi.demo.api.config

import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.slf4j.MDC
import org.springframework.core.annotation.Order
import org.springframework.stereotype.Component
import org.springframework.web.filter.OncePerRequestFilter
import java.util.*

/**
 * Filter that extracts or generates a correlation ID from the X-Correlation-Id header
 * and adds it to the MDC (Mapped Diagnostic Context) for logging.
 * 
 * The correlation ID is also added to the response header so clients can track
 * requests across services.
 */
@Component
@Order(1)
class CorrelationIdFilter : OncePerRequestFilter() {
    
    companion object {
        const val CORRELATION_ID_HEADER = "X-Correlation-Id"
        const val CORRELATION_ID_MDC_KEY = "correlationId"
    }
    
    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain
    ) {
        val correlationId = request.getHeader(CORRELATION_ID_HEADER) ?: UUID.randomUUID().toString()
        
        try {
            MDC.put(CORRELATION_ID_MDC_KEY, correlationId)
            response.setHeader(CORRELATION_ID_HEADER, correlationId)
            filterChain.doFilter(request, response)
        } finally {
            MDC.clear()
        }
    }
}
