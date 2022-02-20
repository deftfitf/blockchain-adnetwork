package jp.deftfitf.adnetwork.config;

import jp.deftfitf.adnetwork.auth.EcrecoverService;
import jp.deftfitf.adnetwork.auth.EthAuthenticationFilter;
import jp.deftfitf.adnetwork.auth.EthAuthenticationProvider;
import jp.deftfitf.adnetwork.auth.EthLogoutHandler;
import jp.deftfitf.adnetwork.repository.ChallengeRepository;
import lombok.NonNull;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.authentication.builders.AuthenticationManagerBuilder;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.builders.WebSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configuration.WebSecurityConfigurerAdapter;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.authentication.logout.HttpStatusReturningLogoutSuccessHandler;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRepository;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class WebSecurityConfig extends WebSecurityConfigurerAdapter {

  @NonNull
  private final ChallengeRepository sessionRepository;
  @NonNull
  private final EcrecoverService ecrecoverService;
  @NonNull
  private final EthLogoutHandler ethLogoutHandler;

  @Override
  public void configure(WebSecurity web) throws Exception {
    web.ignoring()
        .antMatchers("/public/images/**")
        .antMatchers("/admin/**"); // temporary
  }

  private EthAuthenticationProvider authenticationProvider() {
    return new EthAuthenticationProvider(sessionRepository, ecrecoverService);
  }

  private EthAuthenticationFilter authenticationFilter() throws Exception {
    final var ethAuthFilter = new EthAuthenticationFilter(
        new AntPathRequestMatcher("/api/login", "POST"),
        this.authenticationManager());
    ethAuthFilter.setAuthenticationSuccessHandler((request, response, authentication) -> {
      // do not anything
    });
    ethAuthFilter.setAuthenticationFailureHandler((request, response, authentication) -> {
      // do not anything
    });
    return ethAuthFilter;
  }

  @Override
  protected void configure(AuthenticationManagerBuilder auth) throws Exception {
    auth.authenticationProvider(authenticationProvider());
  }

  @Override
  protected void configure(HttpSecurity http) throws Exception {
    http
        .cors().configurationSource(corsConfiguration()).and()
        .csrf().ignoringAntMatchers("/delivery").csrfTokenRepository(csrfTokenRepository()).and()
        .authorizeRequests()
        .antMatchers("/api/login/challenge").permitAll()
        .antMatchers("/api/**").hasAuthority("ETH_USER")
        .and()
        .addFilterBefore(authenticationFilter(), UsernamePasswordAuthenticationFilter.class)
        .logout().logoutUrl("/api/logout")
        .addLogoutHandler(ethLogoutHandler)
        .logoutSuccessHandler(new HttpStatusReturningLogoutSuccessHandler(HttpStatus.OK))
        .permitAll();
  }

  private CsrfTokenRepository csrfTokenRepository() {
    return CookieCsrfTokenRepository
        .withHttpOnlyFalse(); // permit access from React
  }

  private CorsConfigurationSource corsConfiguration() {
    final var conf = new CorsConfiguration();
    conf.addAllowedOrigin("http://localhost:3000");
    conf.addAllowedHeader("*");
    conf.addExposedHeader("*");
    conf.addAllowedMethod("GET");
    conf.addAllowedMethod("POST");
    conf.addAllowedMethod("PUT");
    conf.addAllowedMethod("DELETE");
    conf.setAllowCredentials(true);

    final var corsSource = new UrlBasedCorsConfigurationSource();
    corsSource.registerCorsConfiguration("/api/**", conf);
    corsSource.registerCorsConfiguration("/public/ad-formats/**", conf);

    final var forDeliveryConf = new CorsConfiguration();
    forDeliveryConf.addAllowedOrigin("*");
    forDeliveryConf.addAllowedHeader("*");
    forDeliveryConf.addExposedHeader("*");
    forDeliveryConf.addAllowedMethod("POST");
    corsSource.registerCorsConfiguration("/delivery", forDeliveryConf);

    return corsSource;
  }

}