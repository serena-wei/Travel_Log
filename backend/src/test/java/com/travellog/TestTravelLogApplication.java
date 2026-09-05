package com.travellog;

import org.springframework.boot.SpringApplication;

public class TestTravelLogApplication {

	public static void main(String[] args) {
		SpringApplication.from(TravelLogApplication::main).with(TestcontainersConfiguration.class).run(args);
	}

}
