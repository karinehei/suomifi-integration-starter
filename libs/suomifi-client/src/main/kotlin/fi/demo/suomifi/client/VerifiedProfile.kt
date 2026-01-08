package fi.demo.suomifi.client

import com.fasterxml.jackson.annotation.JsonProperty

/**
 * Verified personal data from Suomi.fi.
 * 
 * This represents the verified identity information returned by Suomi.fi
 * after successful authentication. In production, this data would be
 * cryptographically signed and verified.
 */
data class VerifiedProfile(
    @JsonProperty("nationalIdentifier")
    val nationalIdentifier: String, // Masked/partial in responses
    
    @JsonProperty("givenName")
    val givenName: String,
    
    @JsonProperty("familyName")
    val familyName: String,
    
    @JsonProperty("dateOfBirth")
    val dateOfBirth: String, // ISO-8601 format
    
    @JsonProperty("assuranceLevel")
    val assuranceLevel: String, // e.g., "substantial", "high"
    
    @JsonProperty("email")
    val email: String? = null
)
