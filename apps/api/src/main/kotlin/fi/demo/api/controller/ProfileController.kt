package fi.demo.api.controller

import fi.demo.api.service.AuditService
import fi.demo.api.service.ProfileService
import org.slf4j.LoggerFactory
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.web.bind.annotation.*

/**
 * Controller for profile endpoints.
 * 
 * Requires JWT authentication. Returns verified personal data from Suomi.fi.
 */
@RestController
@RequestMapping("/api/v1/profile")
class ProfileController(
    private val profileService: ProfileService,
    private val auditService: AuditService
) {
    
    private val logger = LoggerFactory.getLogger(javaClass)
    
    /**
     * Returns the verified profile for the authenticated user.
     * 
     * Requires a valid JWT token. The token should contain the access token
     * or a reference to fetch the profile from Suomi.fi.
     */
    @GetMapping
    fun getProfile(@AuthenticationPrincipal jwt: Jwt): ResponseEntity<ProfileResponse> {
        val subject = jwt.subject
        logger.info("Fetching profile for subject: $subject")
        
        // In production, you would extract the access token from the JWT
        // or fetch it from a session store. For demo, we use a placeholder.
        val profile = profileService.getProfileForSubject(subject)
        
        auditService.recordEvent(
            action = "PROFILE_FETCHED",
            target = subject,
            details = mapOf("assuranceLevel" to profile.assuranceLevel)
        )
        
        return ResponseEntity.ok(profile)
    }
    
    data class ProfileResponse(
        val givenName: String,
        val familyName: String,
        val dateOfBirth: String,
        val nationalIdentifier: String,
        val assuranceLevel: String,
        val email: String?
    )
}
