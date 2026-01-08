# Architecture

## Overview

This repository demonstrates a production-ready integration adapter for Suomi.fi identity services. The architecture follows the **Adapter Pattern**, allowing seamless switching between stub implementations (for testing) and real Suomi.fi endpoints (for production).

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client (Browser/App)                     │
└────────────────────────────┬────────────────────────────────────┘
                              │
                              │ HTTPS + JWT
                              │
┌─────────────────────────────▼──────────────────────────────────┐
│                    API Service (Spring Boot)                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Controllers: /api/v1/auth/*, /api/v1/profile            │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Security: JWT Validation, Correlation ID Filter         │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Audit Service: Persists events to PostgreSQL            │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────┬──────────────────────────────────┘
                              │
                              │ HTTP + mTLS (production)
                              │ HTTP (local stub)
                              │
┌─────────────────────────────▼──────────────────────────────────┐
│              Suomifi Client Library (Adapter)                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  SuomifiAdapter Interface                                 │  │
│  │  - exchangeAuthorizationCode()                            │  │
│  │  - fetchVerifiedProfile()                                 │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  WebClientSuomifiAdapter (Implementation)                 │  │
│  │  - WebClient with mTLS support                            │  │
│  │  - Retry logic (Resilience4j)                             │  │
│  │  - Error handling                                         │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────┬──────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
        ┌───────────▼──────┐  ┌─────────▼──────────┐
        │  WireMock Stub   │  │  Suomi.fi (Prod)   │
        │  (Local Dev)     │  │  (Production)      │
        └──────────────────┘  └────────────────────┘
```

## Component Details

### API Service (`apps/api`)

The main Spring Boot application that provides REST endpoints for authentication and profile management.

**Key Features:**
- **JWT-based Authentication**: Uses Spring Security OAuth2 Resource Server
- **Correlation ID Tracking**: Every request gets a correlation ID for distributed tracing
- **Audit Logging**: All actions are logged to PostgreSQL for compliance
- **OpenAPI Documentation**: Swagger UI available at `/swagger-ui.html`

**Endpoints:**
- `GET /api/v1/health` - Health check
- `POST /api/v1/auth/session` - Start authentication session
- `GET /api/v1/auth/callback` - Handle OAuth callback
- `GET /api/v1/profile` - Get verified profile (requires JWT)

### Suomifi Client Library (`libs/suomifi-client`)

A reusable library that implements the adapter pattern for Suomi.fi integration.

**Design Pattern: Adapter**
- **Interface**: `SuomifiAdapter` defines the contract
- **Implementation**: `WebClientSuomifiAdapter` provides the concrete implementation
- **Benefits**: Easy to swap implementations (stub vs. real), testable, maintainable

**Key Features:**
- **mTLS Support**: Configured to support mutual TLS (client certificates)
- **Retry Logic**: Automatic retries for 5xx errors with exponential backoff
- **Error Handling**: Typed exceptions for different error scenarios
- **Configuration**: Externalized via Spring Boot properties

### Database (PostgreSQL)

**Schema:**
- `audit_event` table stores all audit logs with JSONB details field
- Entity uses regular class (not data class) for Hibernate compatibility
- Includes no-arg constructor for JPA requirements

**Migrations:**
- Managed by Flyway
- Located in `apps/api/src/main/resources/db/migration/`
- Production uses JSONB column type
- Tests use H2 with compatible schema (JSONB mapped to JSON/CLOB)

### WireMock Stub

Local stub service that simulates Suomi.fi endpoints:
- `POST /oauth/token` - Token exchange
- `GET /verified-profile` - Profile retrieval

## Security Architecture

### Authentication Flow

1. **Session Start**: Client calls `POST /api/v1/auth/session`
   - API generates state and returns auth URL
   - Audit event: `AUTH_SESSION_STARTED`

2. **User Authentication**: User authenticates with Suomi.fi (or stub)
   - User redirected to Suomi.fi
   - User provides credentials
   - Suomi.fi redirects back with authorization code

3. **Callback Handling**: Client calls `GET /api/v1/auth/callback?code=...&state=...`
   - API validates state
   - API exchanges code for tokens via `SuomifiAdapter`
   - API fetches verified profile
   - Audit event: `AUTH_CALLBACK_COMPLETED`

4. **Profile Access**: Client calls `GET /api/v1/profile` with JWT
   - API validates JWT
   - API fetches profile from Suomi.fi (or cache)
   - Audit event: `PROFILE_FETCHED`

### Security Measures

1. **mTLS (Mutual TLS)**: Client certificates for Suomi.fi communication
2. **JWT Validation**: Tokens validated before access to protected resources
3. **State Parameter**: CSRF protection in OAuth flow
4. **Audit Logging**: All actions logged with actor, timestamp, correlation ID
5. **Correlation IDs**: Request tracing across services

## Configuration

### Local Development

- **Database**: PostgreSQL via Docker Compose
- **Suomi.fi**: WireMock stub via Docker Compose
- **JWT**: Demo decoder accepts unsigned tokens (for testing only)

### Production

To switch to real Suomi.fi:

1. Update `suomifi.client.base-url` to Suomi.fi endpoint
2. Configure mTLS certificates:
   - `suomifi.client.client-certificate-path`
   - `suomifi.client.client-key-path`
   - `suomifi.client.truststore-path`
3. Replace `DemoJwtDecoder` with proper JWKS-based decoder
4. Configure real OAuth2 client credentials

## Observability

### Logging

- Structured logging with correlation IDs
- Log levels configurable via `application.yml`
- MDC (Mapped Diagnostic Context) for correlation ID propagation

### Metrics

- Spring Boot Actuator endpoints
- Health checks at `/actuator/health`

### Audit Trail

- All actions persisted to `audit_event` table
- Queryable by correlation ID, actor, timestamp
- JSONB details field for flexible metadata storage

## Testing Strategy

1. **Unit Tests**: 
   - Adapter tests using WireMock standalone
   - Controller tests using `@WebMvcTest` with mocked services
   - All tests use H2 in-memory database for speed
2. **Integration Tests**: 
   - Full Spring Boot context with `@SpringBootTest`
   - H2 database for test isolation
   - MockMvc for HTTP testing
3. **Local Testing**: Full stack via Docker Compose
4. **CI/CD**: Automated tests in GitHub Actions with PostgreSQL service container

## Deployment

### Local Development

```bash
docker compose -f infra/docker-compose.yml up
```

### Production

1. Build Docker image: `docker build -f apps/api/Dockerfile -t suomifi-api .`
2. Deploy with orchestration (Kubernetes, ECS, etc.)
3. Configure environment variables for production settings
4. Set up monitoring and alerting
