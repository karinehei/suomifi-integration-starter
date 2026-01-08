package fi.demo.api.service

import fi.demo.api.controller.ProfileController
import fi.demo.suomifi.client.SuomifiAdapter
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service

/**
 * Service for fetching user profiles.
 * 
 * In production, this would cache profiles and handle token refresh.
 * For demo purposes, it returns stub data.
 */
@Service
class ProfileService(
    private val suomifiAdapter: SuomifiAdapter
) {
    
    private val logger = LoggerFactory.getLogger(javaClass)
    
    fun getProfileForSubject(subject: String): ProfileController.ProfileResponse {
        // In production, you would:
        // 1. Look up the access token for this subject from a session store
        // 2. If expired, refresh it
        // 3. Fetch the profile from Suomi.fi
        
        // For demo, we use a placeholder access token
        // In a real implementation, you'd store the access token after the callback
        logger.warn("Using placeholder access token - implement proper token storage in production")
        val placeholderToken = "demo-access-token"
        
        val profile = suomifiAdapter.fetchVerifiedProfile(placeholderToken)
        
        return ProfileController.ProfileResponse(
            givenName = profile.givenName,
            familyName = profile.familyName,
            dateOfBirth = profile.dateOfBirth,
            nationalIdentifier = profile.nationalIdentifier,
            assuranceLevel = profile.assuranceLevel,
            email = profile.email
        )
    }
}
