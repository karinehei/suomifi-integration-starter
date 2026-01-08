package fi.demo.suomifi.client

/**
 * Base exception for Suomi.fi client errors.
 */
sealed class SuomifiException(message: String, cause: Throwable? = null) : Exception(message, cause)

/**
 * Thrown when authentication or authorization fails.
 * Examples: invalid code, expired token, insufficient permissions.
 */
class SuomifiAuthException(
    message: String,
    val statusCode: Int? = null,
    cause: Throwable? = null
) : SuomifiException(message, cause)

/**
 * Thrown when a network error occurs or the service is unavailable.
 */
class SuomifiNetworkException(
    message: String,
    cause: Throwable? = null
) : SuomifiException(message, cause)

/**
 * Thrown when the response format is unexpected or invalid.
 */
class SuomifiParseException(
    message: String,
    cause: Throwable? = null
) : SuomifiException(message, cause)
