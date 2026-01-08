package fi.demo.suomifi.client

/**
 * Adapter interface for Suomi.fi identity service integration.
 * 
 * This interface abstracts the Suomi.fi OAuth2/OIDC flow and profile retrieval,
 * allowing for easy swapping between stub implementations (for testing) and
 * real Suomi.fi endpoints (for production).
 */
interface SuomifiAdapter {
    
    /**
     * Exchanges an authorization code for access and ID tokens.
     * 
     * @param code The authorization code received from Suomi.fi callback
     * @param state The state parameter for CSRF protection
     * @return TokenResponse containing access_token, id_token, and expiration info
     * @throws SuomifiAuthException if the authorization code is invalid or expired
     * @throws SuomifiNetworkException if a network error occurs
     */
    fun exchangeAuthorizationCode(code: String, state: String): TokenResponse
    
    /**
     * Fetches verified personal data using an access token.
     * 
     * @param accessToken The OAuth2 access token
     * @return VerifiedProfile containing verified personal information
     * @throws SuomifiAuthException if the access token is invalid or expired
     * @throws SuomifiNetworkException if a network error occurs
     */
    fun fetchVerifiedProfile(accessToken: String): VerifiedProfile
}
