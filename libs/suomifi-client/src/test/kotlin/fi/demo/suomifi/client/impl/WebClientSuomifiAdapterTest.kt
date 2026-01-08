package fi.demo.suomifi.client.impl

import com.github.tomakehurst.wiremock.WireMockServer
import com.github.tomakehurst.wiremock.client.WireMock.*
import com.github.tomakehurst.wiremock.core.WireMockConfiguration.options
import fi.demo.suomifi.client.*
import fi.demo.suomifi.client.config.SuomifiClientProperties
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.web.reactive.function.client.WebClient

class WebClientSuomifiAdapterTest {
    
    private lateinit var wireMockServer: WireMockServer
    private lateinit var adapter: WebClientSuomifiAdapter
    private lateinit var properties: SuomifiClientProperties
    
    @BeforeEach
    fun setUp() {
        wireMockServer = WireMockServer(options().dynamicPort())
        wireMockServer.start()
        
        properties = SuomifiClientProperties(
            baseUrl = "http://localhost:${wireMockServer.port()}",
            clientId = "test-client",
            clientSecret = "test-secret",
            redirectUri = "http://localhost:8080/callback"
        )
        
        val webClient = WebClient.builder()
            .baseUrl(properties.baseUrl)
            .build()
        
        adapter = WebClientSuomifiAdapter(properties, webClient)
    }
    
    @AfterEach
    fun tearDown() {
        wireMockServer.stop()
    }
    
    @Test
    fun `should exchange authorization code successfully`() {
        wireMockServer.stubFor(
            post(urlEqualTo("/oauth/token"))
                .willReturn(aResponse()
                    .withStatus(200)
                    .withHeader("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                    .withBody("""
                        {
                            "access_token": "test-access-token",
                            "id_token": "test-id-token",
                            "token_type": "Bearer",
                            "expires_in": 3600
                        }
                    """.trimIndent())
                )
        )
        
        val response = adapter.exchangeAuthorizationCode("test-code", "test-state")
        
        assertThat(response.accessToken).isEqualTo("test-access-token")
        assertThat(response.idToken).isEqualTo("test-id-token")
        assertThat(response.expiresIn).isEqualTo(3600)
    }
    
    @Test
    fun `should throw SuomifiAuthException on 401`() {
        wireMockServer.stubFor(
            post(urlEqualTo("/oauth/token"))
                .willReturn(aResponse()
                    .withStatus(401)
                    .withBody("Unauthorized")
                )
        )
        
        val exception = org.junit.jupiter.api.assertThrows<Throwable> {
            adapter.exchangeAuthorizationCode("invalid-code", "test-state")
        }
        
        // Unwrap exception if needed (block() may wrap in ReactiveException)
        val actualException = when {
            exception is SuomifiAuthException -> exception
            exception.cause is SuomifiAuthException -> exception.cause as SuomifiAuthException
            exception.cause?.cause is SuomifiAuthException -> exception.cause?.cause as SuomifiAuthException
            else -> throw org.opentest4j.AssertionFailedError("Expected SuomifiAuthException but got: ${exception.javaClass.name} with cause: ${exception.cause?.javaClass?.name}")
        }
        
        assertThat(actualException).isInstanceOf(SuomifiAuthException::class.java)
        assertThat(actualException.statusCode).isEqualTo(401)
    }
    
    @Test
    fun `should fetch verified profile successfully`() {
        wireMockServer.stubFor(
            get(urlEqualTo("/verified-profile"))
                .withHeader("Authorization", equalTo("Bearer test-token"))
                .willReturn(aResponse()
                    .withStatus(200)
                    .withHeader("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                    .withBody("""
                        {
                            "nationalIdentifier": "123456-****",
                            "givenName": "Test",
                            "familyName": "User",
                            "dateOfBirth": "1990-01-01",
                            "assuranceLevel": "substantial",
                            "email": "test@example.com"
                        }
                    """.trimIndent())
                )
        )
        
        val profile = adapter.fetchVerifiedProfile("test-token")
        
        assertThat(profile.givenName).isEqualTo("Test")
        assertThat(profile.familyName).isEqualTo("User")
        assertThat(profile.assuranceLevel).isEqualTo("substantial")
    }
    
    @Test
    fun `should throw SuomifiAuthException on invalid token`() {
        wireMockServer.stubFor(
            get(urlEqualTo("/verified-profile"))
                .willReturn(aResponse()
                    .withStatus(403)
                    .withBody("Forbidden")
                )
        )
        
        val exception = org.junit.jupiter.api.assertThrows<Throwable> {
            adapter.fetchVerifiedProfile("invalid-token")
        }
        
        // Unwrap exception if needed (block() may wrap in ReactiveException)
        val actualException = when {
            exception is SuomifiAuthException -> exception
            exception.cause is SuomifiAuthException -> exception.cause as SuomifiAuthException
            exception.cause?.cause is SuomifiAuthException -> exception.cause?.cause as SuomifiAuthException
            else -> throw org.opentest4j.AssertionFailedError("Expected SuomifiAuthException but got: ${exception.javaClass.name} with cause: ${exception.cause?.javaClass?.name}")
        }
        
        assertThat(actualException).isInstanceOf(SuomifiAuthException::class.java)
        assertThat(actualException.statusCode).isEqualTo(403)
    }
}
