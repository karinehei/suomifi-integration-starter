package fi.demo.suomifi.client.config

import fi.demo.suomifi.client.SuomifiAdapter
import fi.demo.suomifi.client.impl.WebClientSuomifiAdapter
import org.slf4j.LoggerFactory
import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.http.client.reactive.ReactorClientHttpConnector
import org.springframework.web.reactive.function.client.WebClient
import io.netty.channel.ChannelOption
import reactor.netty.http.client.HttpClient
import java.io.InputStream
import java.nio.file.Files
import java.nio.file.Paths
import java.security.KeyStore
import java.security.cert.CertificateFactory
import java.security.cert.X509Certificate
import java.time.Duration
import javax.net.ssl.SSLContext
import javax.net.ssl.TrustManagerFactory

/**
 * Configuration for Suomi.fi client adapter.
 * 
 * This configuration sets up a WebClient with mTLS support when certificates
 * are provided. For local development without certificates, it uses a plain
 * HTTP client connecting to WireMock.
 */
@Configuration
@EnableConfigurationProperties(SuomifiClientProperties::class)
class SuomifiClientConfiguration(
    private val properties: SuomifiClientProperties
) {
    
    private val logger = LoggerFactory.getLogger(javaClass)
    
    @Bean
    fun suomifiAdapter(webClient: WebClient): SuomifiAdapter {
        return WebClientSuomifiAdapter(properties, webClient)
    }
    
    @Bean
    fun suomifiWebClient(): WebClient {
        val httpClient = HttpClient.create()
            .responseTimeout(Duration.ofSeconds(properties.readTimeoutSeconds.toLong()))
            .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, 
                properties.connectTimeoutSeconds * 1000)
        
        // Configure mTLS if certificates are provided
        // Note: In production, this would configure actual mTLS using Netty's SslContext
        // For demo purposes, we skip mTLS configuration and use plain HTTP
        val sslContext = buildSslContext()
        if (sslContext != null) {
            // In production, convert javax.net.ssl.SSLContext to Netty's SslContext
            // For demo, we skip this since buildSslContext() returns null
            logger.warn("mTLS configuration detected but not fully implemented in demo")
            logger.info("mTLS not configured - using plain HTTP (suitable for local stub)")
        } else {
            logger.info("mTLS not configured - using plain HTTP (suitable for local stub)")
        }
        
        return WebClient.builder()
            .baseUrl(properties.baseUrl)
            .clientConnector(ReactorClientHttpConnector(httpClient))
            .build()
    }
    
    /**
     * Builds SSLContext for mTLS if certificates are configured.
     * 
     * In production, this would load actual client certificates and Suomi.fi CA certificates.
     * For local development, this returns null to use plain HTTP.
     */
    private fun buildSslContext(): SSLContext? {
        if (properties.clientCertificatePath == null || 
            properties.clientKeyPath == null || 
            properties.truststorePath == null) {
            return null
        }
        
        return try {
            // Load client certificate and key (stubbed for demo - not used)
            @Suppress("UNUSED_VARIABLE")
            val clientCert = loadCertificate(properties.clientCertificatePath!!)
            @Suppress("UNUSED_VARIABLE")
            val clientKey = loadPrivateKey(properties.clientKeyPath!!)
            
            // Load truststore (stubbed for demo - not used)
            @Suppress("UNUSED_VARIABLE")
            val truststore = loadTruststore(
                properties.truststorePath!!,
                properties.truststorePassword ?: "changeit"
            )
            
            // Build SSLContext with client cert and truststore
            // Note: This is a simplified example. Production code would use proper
            // KeyManagerFactory and TrustManagerFactory setup.
            logger.warn("mTLS certificate loading is stubbed - implement proper KeyManager/TrustManager setup for production")
            
            // For now, return null to use plain HTTP in demo
            // In production, you would:
            // 1. Load client cert + key into KeyManagerFactory
            // 2. Load truststore into TrustManagerFactory
            // 3. Create SSLContext with both
            null
        } catch (ex: Exception) {
            logger.error("Failed to load mTLS certificates, falling back to plain HTTP", ex)
            null
        }
    }
    
    private fun loadCertificate(path: String): X509Certificate {
        val inputStream = resolveResource(path)
        val certFactory = CertificateFactory.getInstance("X.509")
        return certFactory.generateCertificate(inputStream) as X509Certificate
    }
    
    @Suppress("UNUSED_PARAMETER")
    private fun loadPrivateKey(path: String): java.security.PrivateKey {
        // Simplified - in production, use proper PEM key parsing
        // For demo purposes, this is stubbed
        throw UnsupportedOperationException("Private key loading not implemented in demo")
    }
    
    private fun loadTruststore(path: String, password: String): KeyStore {
        val inputStream = resolveResource(path)
        val keystore = KeyStore.getInstance(KeyStore.getDefaultType())
        keystore.load(inputStream, password.toCharArray())
        return keystore
    }
    
    private fun resolveResource(path: String): InputStream {
        return when {
            path.startsWith("classpath:") -> {
                val resourcePath = path.removePrefix("classpath:")
                javaClass.classLoader.getResourceAsStream(resourcePath)
                    ?: throw IllegalArgumentException("Resource not found: $resourcePath")
            }
            path.startsWith("file:") -> {
                val filePath = path.removePrefix("file:")
                Files.newInputStream(Paths.get(filePath))
            }
            else -> {
                // Try as file path
                Files.newInputStream(Paths.get(path))
            }
        }
    }
}
