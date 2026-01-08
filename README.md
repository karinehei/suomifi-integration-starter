# Suomi.fi Integration Starter

A production-ready demo repository showcasing integration readiness for Suomi.fi identity services. This project demonstrates enterprise-grade patterns for integrating with Suomi.fi's OAuth2/OIDC-based identity platform, including mTLS configuration, audit logging, observability, and comprehensive error handling.

## 🎯 What This Demonstrates

This repository showcases:

- **Adapter Pattern**: Clean separation between stub and production implementations
- **mTLS-Ready Configuration**: HTTP client configured for mutual TLS authentication
- **OAuth2/OIDC Flow**: Complete authentication flow with token exchange and profile retrieval
- **Security Best Practices**: JWT validation, correlation IDs, audit logging
- **Observability**: Structured logging, correlation ID propagation, audit trail
- **Production Patterns**: Error handling, retries, configuration management
- **Testing**: Integration tests with WireMock and Testcontainers

## 🏗️ Architecture

This project follows a modular architecture:

```
apps/api              - Spring Boot REST API service
libs/suomifi-client   - Reusable Suomi.fi adapter library
infra/                - Docker Compose and WireMock stubs
```

See [docs/architecture.md](docs/architecture.md) for detailed architecture documentation.

## 🚀 Quick Start

### Prerequisites

- Java 21
- Docker and Docker Compose
- Gradle 8.5+ (wrapper included)

### Running Locally

1. **Start all services** (PostgreSQL, WireMock, API):
   ```bash
   docker compose -f infra/docker-compose.yml up -d
   ```

2. **Wait for services to be healthy** (check logs):
   ```bash
   docker compose -f infra/docker-compose.yml logs -f
   ```

3. **Verify API is running**:
   ```bash
   curl http://localhost:8080/api/v1/health
   ```

4. **Access Swagger UI**:
   Open http://localhost:8080/swagger-ui.html in your browser

### Testing the API

#### 1. Start an Authentication Session

```bash
curl -X POST http://localhost:8080/api/v1/auth/session
```

Response:
```json
{
  "authUrl": "http://localhost:8089/authorize?response_type=code&client_id=demo-client-id&redirect_uri=http://localhost:8080/api/v1/auth/callback&state=<state>&scope=openid profile",
  "state": "<state-uuid>"
}
```

#### 2. Handle OAuth Callback

```bash
curl "http://localhost:8080/api/v1/auth/callback?code=test-code&state=<state-from-step-1>"
```

Response:
```json
{
  "message": "Authentication successful",
  "accessToken": "...",
  "profile": {
    "givenName": "Matti",
    "familyName": "Meikäläinen",
    "dateOfBirth": "1990-05-15",
    "nationalIdentifier": "123456-****",
    "assuranceLevel": "substantial"
  }
}
```

#### 3. Get Profile (Requires JWT)

First, generate a JWT token:

**Windows (PowerShell):**
```powershell
.\scripts\generate-jwt.ps1
```

**Linux/Mac:**
```bash
chmod +x scripts/generate-jwt.sh
./scripts/generate-jwt.sh
```

**Kotlin:**
```bash
kotlin scripts/generate-jwt.kt
```

Then use the token:
```bash
curl -H "Authorization: Bearer <token-from-script>" http://localhost:8080/api/v1/profile
```

## 📋 API Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/v1/health` | Health check | No |
| POST | `/api/v1/auth/session` | Start auth session | No |
| GET | `/api/v1/auth/callback` | OAuth callback handler | No |
| GET | `/api/v1/profile` | Get verified profile | Yes (JWT) |

See Swagger UI at http://localhost:8080/swagger-ui.html for detailed API documentation.

## 🔧 Configuration

### Application Properties

Key configuration in `apps/api/src/main/resources/application.yml`:

```yaml
suomifi:
  client:
    base-url: http://wiremock:8080  # WireMock stub URL
    client-id: demo-client-id
    client-secret: demo-client-secret
    redirect-uri: http://localhost:8080/api/v1/auth/callback
    # mTLS configuration (for production):
    # client-certificate-path: classpath:certificates/client.pem
    # client-key-path: classpath:certificates/client-key.pem
    # truststore-path: classpath:certificates/truststore.jks
    # truststore-password: ${TRUSTSTORE_PASSWORD}
```

### Environment Variables

Override via environment variables:

- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` - Database connection
- `SUOMIFI_BASE_URL` - Suomi.fi service base URL
- `SUOMIFI_CLIENT_ID`, `SUOMIFI_CLIENT_SECRET` - OAuth2 credentials
- `SERVER_PORT` - API server port (default: 8080)

## 🔒 Security

### Current Implementation (Demo)

- **JWT Decoder**: Simple demo decoder that accepts unsigned tokens (for testing only)
- **No mTLS**: Plain HTTP to WireMock stub
- **No Real Credentials**: All credentials are demo values

### Production Requirements

To switch to real Suomi.fi integration:

1. **Update Base URL**:
   ```yaml
   suomifi:
     client:
       base-url: https://api.suomi.fi  # Real Suomi.fi endpoint
   ```

2. **Configure mTLS Certificates**:
   ```yaml
   suomifi:
     client:
       client-certificate-path: file:/path/to/client.pem
       client-key-path: file:/path/to/client-key.pem
       truststore-path: file:/path/to/truststore.jks
       truststore-password: ${TRUSTSTORE_PASSWORD}
   ```

3. **Replace JWT Decoder**:
   - Remove `DemoJwtDecoder`
   - Configure Spring Security to use Suomi.fi JWKS endpoint:
     ```kotlin
     oauth2ResourceServer {
         jwt {
             jwkSetUri = "https://api.suomi.fi/.well-known/jwks.json"
         }
     }
     ```

4. **Set Real OAuth2 Credentials**:
   - Obtain client ID and secret from Suomi.fi
   - Store securely (e.g., HashiCorp Vault, AWS Secrets Manager)
   - Never commit to repository

### Security Features

- ✅ **Correlation IDs**: Every request gets a correlation ID for tracing
- ✅ **Audit Logging**: All actions logged to database
- ✅ **JWT Validation**: Tokens validated before access
- ✅ **State Parameter**: CSRF protection in OAuth flow
- ✅ **Error Handling**: Typed exceptions, no sensitive data in errors

## 🧪 Testing

### Run All Tests

```bash
./gradlew test
```

### Run Integration Tests

```bash
./gradlew :apps:api:test --tests "*IntegrationTest"
```

### Test with Docker Compose

The full stack runs in Docker Compose for integration testing:

```bash
docker compose -f infra/docker-compose.yml up --build
```

## 📊 Observability

### Logging

Structured logging with correlation IDs:

```
2024-01-15 10:30:45 [http-nio-8080-exec-1] INFO  [abc-123-def] fi.demo.api.controller.AuthController - Starting authentication session
```

Correlation ID is:
- Extracted from `X-Correlation-Id` header (or generated if missing)
- Added to MDC for automatic inclusion in logs
- Returned in response headers
- Stored in audit events

### Audit Trail

All actions are logged to `audit_event` table:

```sql
SELECT * FROM audit_event ORDER BY ts DESC LIMIT 10;
```

Fields:
- `id` - UUID
- `ts` - Timestamp
- `actor` - User identifier (from JWT subject or "anonymous")
- `action` - Action type (e.g., "AUTH_SESSION_STARTED")
- `target` - Target resource (optional)
- `correlation_id` - Request correlation ID
- `details` - JSONB metadata

### Health Checks

- API: `GET /api/v1/health`
- Actuator: `GET /actuator/health`

## 🏭 CI/CD

GitHub Actions workflow (`.github/workflows/ci.yml`):
- Builds on push/PR to main/develop
- Runs tests with PostgreSQL Testcontainers
- Uploads test results and build artifacts

## 📁 Project Structure

```
.
├── apps/
│   └── api/                    # Spring Boot API service
│       ├── src/main/kotlin/    # Source code
│       ├── src/main/resources/ # Config, migrations
│       └── Dockerfile
├── libs/
│   └── suomifi-client/         # Suomi.fi adapter library
│       ├── src/main/kotlin/    # Adapter implementation
│       └── src/test/kotlin/    # Unit tests
├── infra/
│   ├── docker-compose.yml      # Local dev stack
│   └── wiremock/
│       └── mappings/           # WireMock stub definitions
├── scripts/
│   └── generate-jwt.*          # JWT generator scripts
├── docs/
│   └── architecture.md         # Architecture documentation
└── README.md                   # This file
```

## 🔄 Switching from Stub to Real Suomi.fi

### Step 1: Update Configuration

Edit `apps/api/src/main/resources/application.yml` or set environment variables:

```yaml
suomifi:
  client:
    base-url: https://api.suomi.fi  # Real endpoint
    client-id: ${SUOMIFI_CLIENT_ID}  # From secure storage
    client-secret: ${SUOMIFI_CLIENT_SECRET}  # From secure storage
```

### Step 2: Configure mTLS

Place certificates in secure location and configure paths:

```yaml
suomifi:
  client:
    client-certificate-path: file:/secure/certs/client.pem
    client-key-path: file:/secure/certs/client-key.pem
    truststore-path: file:/secure/certs/truststore.jks
    truststore-password: ${TRUSTSTORE_PASSWORD}
```

### Step 3: Update JWT Decoder

Replace `DemoJwtDecoder` in `SecurityConfiguration` with JWKS-based validation.

### Step 4: Test

Run integration tests against real endpoints (in staging environment first).

## 🛠️ Development

### Building

```bash
./gradlew build
```

### Running Locally (without Docker)

1. Start PostgreSQL:
   ```bash
   docker run -d -p 5432:5432 -e POSTGRES_DB=suomifi_db -e POSTGRES_USER=suomifi_user -e POSTGRES_PASSWORD=suomifi_pass postgres:16-alpine
   ```

2. Start WireMock:
   ```bash
   docker run -d -p 8089:8080 -v $(pwd)/infra/wiremock/mappings:/home/wiremock/mappings wiremock/wiremock:latest
   ```

3. Run API:
   ```bash
   ./gradlew :apps:api:bootRun
   ```

### Code Style

- Kotlin official code style
- Consistent formatting via Gradle
- Package naming: `fi.demo.*`

## 📝 Notes

- **No Real Credentials**: This repository contains no real Suomi.fi credentials or proprietary endpoints
- **Demo JWT**: The JWT decoder accepts unsigned tokens for local testing only
- **mTLS Stub**: mTLS configuration is scaffolded but not fully implemented (would require proper KeyManager/TrustManager setup)
- **Production Ready**: Core patterns are production-ready; replace stubs with real implementations

## 📄 License

This is a demo repository for educational purposes.

## 🤝 Contributing

This is a demo project. For production use, ensure:
1. All security measures are properly implemented
2. Real Suomi.fi credentials are obtained and stored securely
3. mTLS is fully configured and tested
4. JWT validation uses Suomi.fi's JWKS endpoint
5. Comprehensive integration tests are added

---

**Built with ❤️ for Suomi.fi integration readiness demonstration**
