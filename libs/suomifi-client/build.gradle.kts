dependencies {
    implementation(platform("org.springframework.boot:spring-boot-dependencies:3.2.2"))
    implementation("org.springframework.boot:spring-boot-starter-webflux")
    implementation("org.springframework.boot:spring-boot-configuration-processor")
    implementation("org.jetbrains.kotlin:kotlin-stdlib")
    implementation("org.jetbrains.kotlin:kotlin-reflect")
    implementation("io.github.resilience4j:resilience4j-spring-boot3:2.1.0")
    implementation("io.github.resilience4j:resilience4j-reactor:2.1.0")
    
    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("io.projectreactor:reactor-test")
    testImplementation("com.github.tomakehurst:wiremock-jre8-standalone:2.35.2")
    testImplementation("org.assertj:assertj-core")
}
