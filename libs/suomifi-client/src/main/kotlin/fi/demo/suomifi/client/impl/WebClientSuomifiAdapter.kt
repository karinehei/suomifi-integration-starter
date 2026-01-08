package fi.demo.suomifi.client.impl

import fi.demo.suomifi.client.*
import fi.demo.suomifi.client.config.SuomifiClientProperties
import io.github.resilience4j.reactor.retry.RetryOperator
import io.github.resilience4j.retry.Retry
import io.github.resilience4j.retry.RetryConfig
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.util.LinkedMultiValueMap
import org.springframework.util.MultiValueMap
import org.springframework.web.reactive.function.BodyInserters
import org.springframework.web.reactive.function.client.WebClient
import org.springframework.web.reactive.function.client.WebClientResponseException
import reactor.core.publisher.Mono
import java.time.Duration

/**
 * WebClient-based implementation of SuomifiAdapter.
 * 
 * This implementation uses Spring WebClient for HTTP communication and is
 * configured to support mTLS (mutual TLS) for production Suomi.fi integration.
 * 
 * For local development, it connects to a WireMock stub without mTLS.
 * In production, configure clientCertificatePath, clientKeyPath, and truststorePath
 * to enable mTLS authentication.
 */
class WebClientSuomifiAdapter(
    private val properties: SuomifiClientProperties,
    private val webClient: WebClient
) : SuomifiAdapter {
    
    private val logger = LoggerFactory.getLogger(javaClass)
    
    private val retry: Retry = if (properties.retryEnabled) {
        Retry.of("suomifi-client", RetryConfig.custom<Any>()
            .maxAttempts(properties.maxRetryAttempts)
            .waitDuration(Duration.ofMillis(properties.retryInitialDelayMs))
            .retryOnResult { false }
            .retryOnException { ex ->
                ex is SuomifiNetworkException || 
                (ex is WebClientResponseException && ex.statusCode.is5xxServerError)
            }
            .build())
    } else {
        Retry.of("suomifi-client", RetryConfig.ofDefaults())
    }
    
    override fun exchangeAuthorizationCode(code: String, state: String): TokenResponse {
        logger.debug("Exchanging authorization code for tokens")
        
        val formData: MultiValueMap<String, String> = LinkedMultiValueMap<String, String>().apply {
            add("grant_type", "authorization_code")
            add("code", code)
            add("redirect_uri", properties.redirectUri)
            add("client_id", properties.clientId)
            add("client_secret", properties.clientSecret)
        }
        
        return webClient.post()
            .uri("${properties.baseUrl}/oauth/token")
            .contentType(MediaType.APPLICATION_FORM_URLENCODED)
            .body(BodyInserters.fromFormData(formData))
            .retrieve()
            .bodyToMono(TokenResponse::class.java)
            .transformDeferred(RetryOperator.of(retry))
            .doOnError { ex ->
                logger.error("Failed to exchange authorization code", ex)
            }
            .onErrorMap { ex -> mapToSuomifiException(ex, "Token exchange failed") }
            .block() ?: throw SuomifiNetworkException("Token exchange returned null response")
    }
    
    override fun fetchVerifiedProfile(accessToken: String): VerifiedProfile {
        logger.debug("Fetching verified profile")
        
        return webClient.get()
            .uri("${properties.baseUrl}/verified-profile")
            .header("Authorization", "Bearer $accessToken")
            .retrieve()
            .bodyToMono(VerifiedProfile::class.java)
            .transformDeferred(RetryOperator.of(retry))
            .doOnError { ex ->
                logger.error("Failed to fetch verified profile", ex)
            }
            .onErrorMap { ex -> mapToSuomifiException(ex, "Profile fetch failed") }
            .block() ?: throw SuomifiNetworkException("Profile fetch returned null response")
    }
    
    private fun mapToSuomifiException(ex: Throwable, context: String): SuomifiException {
        return when (ex) {
            is WebClientResponseException -> {
                when {
                    ex.statusCode == HttpStatus.UNAUTHORIZED || ex.statusCode == HttpStatus.FORBIDDEN -> {
                        SuomifiAuthException(
                            "$context: ${ex.statusCode} - ${ex.responseBodyAsString}",
                            ex.statusCode.value(),
                            ex
                        )
                    }
                    ex.statusCode.is5xxServerError -> {
                        SuomifiNetworkException(
                            "$context: ${ex.statusCode} - Service unavailable",
                            ex
                        )
                    }
                    else -> {
                        SuomifiAuthException(
                            "$context: ${ex.statusCode} - ${ex.responseBodyAsString}",
                            ex.statusCode.value(),
                            ex
                        )
                    }
                }
            }
            is SuomifiException -> ex
            else -> SuomifiNetworkException("$context: ${ex.message}", ex)
        }
    }
}
