package jp.deftfitf.adnetwork.auth;

import java.util.ArrayList;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.authentication.AbstractAuthenticationProcessingFilter;
import org.springframework.security.web.util.matcher.RequestMatcher;

public class EthAuthenticationFilter extends AbstractAuthenticationProcessingFilter {

  public EthAuthenticationFilter(
      RequestMatcher requiresAuthenticationRequestMatcher,
      AuthenticationManager authenticationManager
  ) {
    super(requiresAuthenticationRequestMatcher, authenticationManager);
  }

  @Override
  public Authentication attemptAuthentication(
      HttpServletRequest request,
      HttpServletResponse response
  ) throws AuthenticationException {
    final var address = obtainAddress(request);
    final var signature = obtainSignature(request);
    final var ethAuthenticationToken = new EthAuthenticationToken(new ArrayList<>(), address,
        signature);
    return getAuthenticationManager().authenticate(ethAuthenticationToken);
  }

  private String obtainAddress(HttpServletRequest request) {
    return request.getHeader("X-ETH-ADDRESS");
  }

  private String obtainSignature(HttpServletRequest request) {
    return request.getHeader("X-AUTH-SIGNATURE");
  }

}
