package fi.demo.api.service

import fi.demo.suomifi.client.SuomifiAdapter
import fi.demo.suomifi.client.config.SuomifiClientProperties
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service

/**
 * Service for handling authentication flows.
 */
@Service
class AuthService(
    private val suomifiAdapter: SuomifiAdapter,
    private val properties: SuomifiClientProperties
) {
    
    private val logger = LoggerFactory.getLogger(javaClass)
    
    fun generateAuthUrl(state: String): String {
        // In production, this would construct the actual Suomi.fi authorization URL
        // For demo, return a stub URL that points to WireMock
        return "${properties.baseUrl}/authorize?response_type=code&client_id=${properties.clientId}&redirect_uri=${properties.redirectUri}&state=$state&scope=openid profile"
    }
    
    fun handleCallback(code: String, state: String): AuthController.CallbackResponse {
        logger.debug("Exchanging authorization code: $code")
        
        val tokenResponse = suomifiAdapter.exchangeAuthorizationCode(code, state)
        
        logger.debug("Fetching verified profile with access token")
        val profile = suomifiAdapter.fetchVerifiedProfile(tokenResponse.accessToken)
        
        return AuthController.CallbackResponse(
            message = "Authentication successful",
            accessToken = tokenResponse.accessToken,
            profile = mapOf(
                "givenName" to profile.givenName,
                "familyName" to profile.familyName,
                "dateOfBirth" to profile.dateOfBirth,
                "nationalIdentifier" to profile.nationalIdentifier,
                "assuranceLevel" to profile.assuranceLevel
            )
        )
    }
}
