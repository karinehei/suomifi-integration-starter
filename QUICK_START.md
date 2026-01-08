# Quick Start Guide

## Prerequisites

- Java 21
- Docker and Docker Compose
- (Optional) Gradle 8.5+ (wrapper included)

## Start Everything

```bash
# Start all services (PostgreSQL, WireMock, API)
docker compose -f infra/docker-compose.yml up -d

# Check logs
docker compose -f infra/docker-compose.yml logs -f

# Stop everything
docker compose -f infra/docker-compose.yml down
```

## Test the API

### 1. Health Check
```bash
curl http://localhost:8080/api/v1/health
```

### 2. Start Auth Session
```bash
curl -X POST http://localhost:8080/api/v1/auth/session
```

### 3. Handle Callback
```bash
# Use the state from step 2
curl "http://localhost:8080/api/v1/auth/callback?code=test-code&state=<state>"
```

### 4. Get Profile (Requires JWT)

**Generate JWT:**
- Windows: `.\scripts\generate-jwt.ps1`
- Linux/Mac: `./scripts/generate-jwt.sh`
- Kotlin: `kotlin scripts/generate-jwt.kt`

**Use JWT:**
```bash
curl -H "Authorization: Bearer <token>" http://localhost:8080/api/v1/profile
```

## Access Swagger UI

Open http://localhost:8080/swagger-ui.html in your browser

## Run Tests

```bash
./gradlew test
```

## Build

```bash
./gradlew build
```

## View Audit Logs

```bash
# Connect to PostgreSQL
docker exec -it suomifi-postgres psql -U suomifi_user -d suomifi_db

# Query audit events
SELECT * FROM audit_event ORDER BY ts DESC LIMIT 10;
```

## Troubleshooting

### Services not starting
- Check Docker is running
- Check ports 5432, 8080, 8089 are available
- View logs: `docker compose -f infra/docker-compose.yml logs`

### API not connecting to database
- Wait for PostgreSQL to be healthy (check logs)
- Verify environment variables in docker-compose.yml

### WireMock not responding
- Check WireMock logs: `docker logs suomifi-wiremock`
- Verify mappings are loaded: `curl http://localhost:8089/__admin/mappings`
