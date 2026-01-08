package fi.demo.api.controller

import fi.demo.api.repository.AuditEventRepository
import fi.demo.api.service.AuditService
import fi.demo.api.service.AuthService
import org.junit.jupiter.api.Test
import org.mockito.kotlin.*
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest
import org.springframework.boot.test.mock.mockito.MockBean
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.*
import java.util.*

@WebMvcTest(
    controllers = [AuthController::class],
    excludeAutoConfiguration = [
        org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration::class,
        org.springframework.boot.actuate.autoconfigure.security.servlet.ManagementWebSecurityAutoConfiguration::class
    ]
)
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
        // Mock the service to return a valid auth URL for any state
        whenever(authService.generateAuthUrl(any())).thenAnswer { invocation ->
            val state = invocation.getArgument<String>(0)
            "http://localhost:8089/authorize?state=$state"
        }
        
        // Mock audit service - use anyOrNull for nullable parameters
        doAnswer { }.`when`(auditService).recordEvent(anyString(), anyOrNull(), anyOrNull())
        
        mockMvc.perform(post("/api/v1/auth/session"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.authUrl").isString)
            .andExpect(jsonPath("$.state").isString)
    }
    
    @Test
    fun `should handle callback successfully`() {
        val callbackResponse = AuthController.CallbackResponse(
            message = "Authentication successful",
            accessToken = "test-token",
            profile = mapOf("givenName" to "Test")
        )
        whenever(authService.handleCallback(any(), any())).thenReturn(callbackResponse)
        
        // Mock audit service - use anyOrNull for nullable parameters
        doAnswer { }.`when`(auditService).recordEvent(anyString(), anyOrNull(), anyOrNull())
        
        mockMvc.perform(
            get("/api/v1/auth/callback")
                .param("code", "test-code")
                .param("state", "test-state")
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.message").isString)
    }
}
