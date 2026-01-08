package fi.demo.suomifi.client

import com.fasterxml.jackson.annotation.JsonProperty

/**
 * Response from token exchange endpoint.
 */
data class TokenResponse(
    @JsonProperty("access_token")
    val accessToken: String,
    
    @JsonProperty("id_token")
    val idToken: String,
    
    @JsonProperty("token_type")
    val tokenType: String = "Bearer",
    
    @JsonProperty("expires_in")
    val expiresIn: Int,
    
    @JsonProperty("scope")
    val scope: String? = null
)
