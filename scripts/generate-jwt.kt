#!/usr/bin/env kotlin

/**
 * Simple JWT generator script for local testing.
 * 
 * Usage: kotlin scripts/generate-jwt.kt [subject]
 * 
 * This generates a JWT token that can be used with the demo API.
 * The token is not cryptographically signed (for demo purposes only).
 * 
 * In production, JWTs would be signed by Suomi.fi using their private key.
 */

import java.util.Base64

fun main(args: Array<String>) {
    val subject = args.getOrNull(0) ?: "demo-user"
    
    val header = """{"alg":"HS256","typ":"JWT"}"""
    val iat = System.currentTimeMillis() / 1000
    val claims = """{"sub":"$subject","iss":"suomifi-stub","aud":"demo-client-id","exp":9999999999,"iat":$iat}"""
    
    val encodedHeader = Base64.getUrlEncoder().withoutPadding().encodeToString(header.toByteArray())
    val encodedClaims = Base64.getUrlEncoder().withoutPadding().encodeToString(claims.toByteArray())
    
    // For demo, we don't sign it (production would use HMAC or RSA)
    val token = "$encodedHeader.$encodedClaims.signature-placeholder"
    
    println("Generated JWT token:")
    println(token)
    println("\nUse it with curl:")
    println("curl -H 'Authorization: Bearer $token' http://localhost:8080/api/v1/profile")
}
