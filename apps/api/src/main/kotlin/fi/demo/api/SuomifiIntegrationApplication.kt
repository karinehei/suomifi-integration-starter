package fi.demo.api

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.context.properties.ConfigurationPropertiesScan
import org.springframework.boot.runApplication

@SpringBootApplication(scanBasePackages = ["fi.demo"])
@ConfigurationPropertiesScan
class SuomifiIntegrationApplication

fun main(args: Array<String>) {
    runApplication<SuomifiIntegrationApplication>(*args)
}
