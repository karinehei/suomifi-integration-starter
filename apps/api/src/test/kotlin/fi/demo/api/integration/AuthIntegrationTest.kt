package fi.demo.api.integration

import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.*

/**
 * Integration tests for authentication endpoints.
 * 
 * These tests run against the full Spring Boot application context
 * but use MockMvc to avoid starting the full HTTP server.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthIntegrationTest(
    @Autowired private val mockMvc: MockMvc
) {
    
    @Test
    fun `should return health status`() {
        mockMvc.perform(get("/api/v1/health"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.status").value("UP"))
    }
    
    @Test
    fun `should start authentication session`() {
        mockMvc.perform(post("/api/v1/auth/session"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.authUrl").exists())
            .andExpect(jsonPath("$.state").exists())
    }
}
