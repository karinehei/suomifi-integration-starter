package fi.demo.api.controller

import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

/**
 * Health check endpoint.
 */
@RestController
@RequestMapping("/api/v1/health")
class HealthController {
    
    @GetMapping
    fun health(): ResponseEntity<Map<String, String>> {
        return ResponseEntity.ok(mapOf("status" to "UP", "service" to "suomifi-integration-api"))
    }
}
