package fi.demo.api.controller

import fi.demo.api.service.AuditService
import fi.demo.api.service.AuthService
import org.slf4j.LoggerFactory
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.util.*

/**
 * Controller for authentication endpoints.
 * 
 * This controller handles the OAuth2/OIDC flow simulation:
 * - Starting an auth session (returns auth URL and state)
 * - Handling the callback with authorization code
 */
@RestController
@RequestMapping("/api/v1/auth")
class AuthController(
    private val authService: AuthService,
    private val auditService: AuditService
) {
    
    private val logger = LoggerFactory.getLogger(javaClass)
    
    /**
     * Initiates an authentication session.
     * 
     * In production, this would redirect to Suomi.fi authorization endpoint.
     * For demo purposes, it returns a stub authorization URL.
     */
    @PostMapping("/session")
    fun startSession(): ResponseEntity<SessionResponse> {
        logger.info("Starting authentication session")
        
        val state = UUID.randomUUID().toString()
        val authUrl = authService.generateAuthUrl(state)
        
        auditService.recordEvent(
            action = "AUTH_SESSION_STARTED",
            details = mapOf("state" to state)
        )
        
        return ResponseEntity.ok(SessionResponse(authUrl = authUrl, state = state))
    }
    
    /**
     * Handles the OAuth2 callback with authorization code.
     * 
     * This endpoint receives the authorization code from Suomi.fi (or stub)
     * and exchanges it for tokens, then fetches the verified profile.
     */
    @GetMapping("/callback")
    fun handleCallback(
        @RequestParam code: String,
        @RequestParam state: String
    ): ResponseEntity<CallbackResponse> {
        logger.info("Handling OAuth callback with code and state")
        
        auditService.recordEvent(
            action = "AUTH_CALLBACK_RECEIVED",
            details = mapOf("state" to state, "hasCode" to code.isNotBlank())
        )
        
        val result = authService.handleCallback(code, state)
        
        auditService.recordEvent(
            action = "AUTH_CALLBACK_COMPLETED",
            details = mapOf("state" to state, "success" to true)
        )
        
        return ResponseEntity.ok(result)
    }
    
    data class SessionResponse(
        val authUrl: String,
        val state: String
    )
    
    data class CallbackResponse(
        val message: String,
        val accessToken: String? = null,
        val profile: Map<String, Any>? = null
    )
}
