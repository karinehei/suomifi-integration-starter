package fi.demo.api.config

import com.fasterxml.jackson.databind.ObjectMapper
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.security.oauth2.jwt.JwtDecoder
import org.springframework.security.oauth2.jwt.JwtException
import java.time.Instant
import java.util.*

/**
 * Simple JWT decoder for demo purposes.
 * 
 * This decoder accepts JWTs with a simple structure and validates basic claims.
 * For production, replace this with a proper JWT decoder that validates signatures
 * using Suomi.fi's public keys (via JWKS endpoint).
 * 
 * For local testing, you can generate JWTs using the provided script or
 * use online JWT generators with HS256 algorithm.
 */
class DemoJwtDecoder(
    private val objectMapper: ObjectMapper = ObjectMapper()
) : JwtDecoder {
    
    override fun decode(token: String): Jwt {
        return try {
            // Simple base64 decoding for demo (not secure - production must verify signature!)
            val parts = token.split(".")
            if (parts.size != 3) {
                throw JwtException("Invalid JWT format: expected 3 parts, got ${parts.size}")
            }
            
            // Decode header and claims (no signature verification for demo)
            val headerJson = decodeBase64Url(parts[0])
            val claimsJson = decodeBase64Url(parts[1])
            
            // Parse JSON using Jackson
            val header = objectMapper.readValue(headerJson, Map::class.java) as Map<String, Any>
            val claims = objectMapper.readValue(claimsJson, Map::class.java) as Map<String, Any>
            
            // Check expiration
            val exp = claims["exp"] as? Number
            if (exp != null) {
                val expInstant = Instant.ofEpochSecond(exp.toLong())
                if (expInstant.isBefore(Instant.now())) {
                    throw JwtException("JWT has expired")
                }
            }
            
            // Extract issued at time
            val iat = claims["iat"] as? Number
            val issuedAt = iat?.let { Instant.ofEpochSecond(it.toLong()) } ?: Instant.now()
            
            Jwt(
                token,
                issuedAt,
                exp?.let { Instant.ofEpochSecond(it.toLong()) } ?: Instant.now().plusSeconds(3600),
                header,
                claims
            )
        } catch (ex: JwtException) {
            throw ex
        } catch (ex: Exception) {
            throw JwtException("Failed to decode JWT: ${ex.message}", ex)
        }
    }
    
    private fun decodeBase64Url(encoded: String): String {
        // Handle padding if needed
        val padded = when (encoded.length % 4) {
            2 -> "$encoded=="
            3 -> "$encoded="
            else -> encoded
        }
        return String(Base64.getUrlDecoder().decode(padded))
    }
}
