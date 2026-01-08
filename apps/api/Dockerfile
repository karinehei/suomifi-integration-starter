FROM eclipse-temurin:21-jdk-alpine AS build

WORKDIR /app

# Copy Gradle wrapper and build files
COPY gradle/ gradle/
COPY gradlew .
COPY build.gradle.kts settings.gradle.kts ./

# Copy project structure
COPY libs/ libs/
COPY apps/api/ apps/api/

# Build the application
RUN chmod +x ./gradlew && \
    ./gradlew :apps:api:bootJar --no-daemon

# Runtime stage
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# Copy the built JAR
COPY --from=build /app/apps/api/build/libs/*.jar app.jar

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
