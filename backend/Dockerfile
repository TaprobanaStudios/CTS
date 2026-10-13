# Build the jar
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
# Dependencies first, so they are cached until pom.xml changes
COPY pom.xml .
RUN mvn -q -B dependency:go-offline
COPY src ./src
RUN mvn -q -B -DskipTests package

# Run it on a small Java 21 image
FROM eclipse-temurin:21-jre
WORKDIR /app
RUN useradd --system --no-create-home app
COPY --from=build /app/target/*.jar app.jar
USER app
# The host sets PORT; 8080 is only the default
EXPOSE 8080
# Leave room for the JVM's own memory on small instances
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-Dspring.profiles.active=prod", "-jar", "app.jar"]
