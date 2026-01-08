package fi.demo.api.controller

import fi.demo.api.repository.AuditEventRepository
import fi.demo.api.service.AuditService
import fi.demo.api.service.AuthService
import fi.demo.suomifi.client.VerifiedProfile
import fi.demo.suomifi.client.TokenResponse
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest
import org.springframework.boot.test.mock.mockito.MockBean
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.*

@WebMvcTest(AuthController::class)
class AuthControllerTest(
    @Autowired private val mockMvc: MockMvc
) {
    
    @MockBean
    private lateinit var authService: AuthService
    
    @MockBean
    private lateinit var auditService: AuditService
    
    @MockBean
    private lateinit var auditEventRepository: AuditEventRepository
    
    @Test
    fun `should start session successfully`() {
        mockMvc.perform(post("/api/v1/auth/session"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.authUrl").exists())
            .andExpect(jsonPath("$.state").exists())
    }
    
    @Test
    fun `should handle callback successfully`() {
        mockMvc.perform(
            get("/api/v1/auth/callback")
                .param("code", "test-code")
                .param("state", "test-state")
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.message").exists())
    }
}
