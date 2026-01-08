package fi.demo.suomifi.client.config

import org.springframework.boot.context.properties.ConfigurationProperties

/**
 * Configuration properties for Suomi.fi client adapter.
 * 
 * In production, these would be loaded from secure configuration management
 * (e.g., HashiCorp Vault, AWS Secrets Manager) or environment variables.
 */
@ConfigurationProperties(prefix = "suomifi.client")
data class SuomifiClientProperties(
    /**
     * Base URL for Suomi.fi services.
     * For local development, this points to WireMock stub.
     * In production, this would be the actual Suomi.fi endpoint.
     */
    val baseUrl: String = "http://localhost:8089",
    
    /**
     * Client ID for OAuth2 client credentials flow.
     */
    val clientId: String = "demo-client-id",
    
    /**
     * Client secret (in production, load from secure storage).
     */
    val clientSecret: String = "demo-client-secret",
    
    /**
     * Redirect URI registered with Suomi.fi.
     */
    val redirectUri: String = "http://localhost:8080/api/v1/auth/callback",
    
    /**
     * Path to client certificate (PEM or PKCS12) for mTLS.
     * Can be classpath: prefix for resources, or file: for absolute paths.
     * Example: "classpath:certificates/client.pem"
     */
    val clientCertificatePath: String? = null,
    
    /**
     * Path to client private key (PEM format) for mTLS.
     * Example: "classpath:certificates/client-key.pem"
     */
    val clientKeyPath: String? = null,
    
    /**
     * Path to truststore (JKS or PKCS12) containing Suomi.fi CA certificates.
     * Example: "classpath:certificates/truststore.jks"
     */
    val truststorePath: String? = null,
    
    /**
     * Truststore password (in production, load from secure storage).
     */
    val truststorePassword: String? = null,
    
    /**
     * Connection timeout in seconds.
     */
    val connectTimeoutSeconds: Int = 10,
    
    /**
     * Read timeout in seconds.
     */
    val readTimeoutSeconds: Int = 30,
    
    /**
     * Enable retry for 5xx errors.
     */
    val retryEnabled: Boolean = true,
    
    /**
     * Maximum retry attempts.
     */
    val maxRetryAttempts: Int = 3,
    
    /**
     * Initial retry delay in milliseconds.
     */
    val retryInitialDelayMs: Long = 500
)
