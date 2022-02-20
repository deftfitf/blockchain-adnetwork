package jp.deftfitf.adnetwork.config;

import java.security.SecureRandom;
import java.time.Clock;
import java.util.Random;
import lombok.Setter;
import lombok.experimental.Delegate;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ModuleConfig {

  @Bean
  public Clock clock(CustomClock customClock) {
    return customClock;
  }

  @Bean
  public CustomClock customClock() {
    return new CustomClock();
  }

  @Bean
  public Random random() {
    return new SecureRandom();
  }

  public static class CustomClock extends Clock implements ClockMillis {

    @Delegate(excludes = ClockMillis.class)
    private final Clock systemClock = Clock.systemDefaultZone();
    @Setter
    private volatile Clock override = null;

    @Override
    public long millis() {
      if (override == null) {
        return systemClock.millis();
      }

      return override.millis();
    }

  }

  interface ClockMillis {

    long millis();
  }

}
