package fi.demo.api.config

import com.fasterxml.jackson.databind.ObjectMapper
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity
import org.springframework.security.config.http.SessionCreationPolicy
import org.springframework.security.web.SecurityFilterChain
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter

/**
 * Spring Security configuration for JWT-based authentication.
 * 
 * This configuration sets up the application as an OAuth2 Resource Server,
 * accepting JWT tokens for authentication. For local development, we use
 * a simple JWT decoder that accepts locally-generated tokens.
 * 
 * In production, this would be configured to validate JWTs from Suomi.fi
 * using their public keys (JWKS endpoint).
 */
@Configuration
@EnableWebSecurity
class SecurityConfiguration(
    private val correlationIdFilter: CorrelationIdFilter,
    private val objectMapper: ObjectMapper
) {
    
    @Bean
    fun securityFilterChain(http: HttpSecurity): SecurityFilterChain {
        return http
            .csrf { it.disable() }
            .sessionManagement { it.sessionCreationPolicy(SessionCreationPolicy.STATELESS) }
            .authorizeHttpRequests { auth ->
                auth
                    .requestMatchers("/api/v1/health", "/actuator/health").permitAll()
                    .requestMatchers("/swagger-ui/**", "/v3/api-docs/**", "/swagger-ui.html").permitAll()
                    .requestMatchers("/api/v1/auth/session", "/api/v1/auth/callback").permitAll()
                    .anyRequest().authenticated()
            }
            .oauth2ResourceServer { oauth2 ->
                oauth2.jwt { jwt ->
                    // For demo purposes, we use a simple JWT decoder
                    // In production, configure to use Suomi.fi JWKS endpoint
                    jwt.decoder(DemoJwtDecoder(objectMapper))
                }
            }
            .addFilterBefore(correlationIdFilter, UsernamePasswordAuthenticationFilter::class.java)
            .build()
    }
}
