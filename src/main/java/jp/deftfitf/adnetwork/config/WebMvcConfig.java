package jp.deftfitf.adnetwork.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@EnableWebMvc
@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

  private static final String[] CLASSPATH_RESOURCE_LOCATIONS =
      {
          "classpath:/META-INF/resources/",
          "classpath:/resources/",
          "classpath:/static/",
          "classpath:/public/",
          "classpath:/custom/",
          "file:./uploaded/"
      };

  @Override
  public void addResourceHandlers(ResourceHandlerRegistry registry) {
    registry
        .addResourceHandler("/public/**")
        .addResourceLocations(CLASSPATH_RESOURCE_LOCATIONS);
  }

}
