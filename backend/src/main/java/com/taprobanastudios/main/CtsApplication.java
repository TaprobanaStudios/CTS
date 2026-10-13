package com.taprobanastudios.main;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;

import java.util.TimeZone;

@SpringBootApplication
@OpenAPIDefinition
public class CtsApplication {

	// Every date and time the application records is Sri Lankan local time
	public static final String TIME_ZONE = "Asia/Colombo";

	public static void main(String[] args) {
		// Before Spring starts, so LocalDate.now(), LocalDateTime.now() and the audit
		// timestamps all use it wherever the server itself is located
		TimeZone.setDefault(TimeZone.getTimeZone(TIME_ZONE));
		SpringApplication.run(CtsApplication.class, args);
	}

}
