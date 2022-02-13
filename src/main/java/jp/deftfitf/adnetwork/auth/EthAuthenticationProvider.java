package jp.deftfitf.adnetwork.auth;

import java.util.List;
import jp.deftfitf.adnetwork.repository.ChallengeRepository;
import lombok.NonNull;
import lombok.RequiredArgsConstructor;
import org.springframework.context.support.MessageSourceAccessor;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.InsufficientAuthenticationException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.SpringSecurityMessageSource;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.util.Assert;

@RequiredArgsConstructor
public class EthAuthenticationProvider implements AuthenticationProvider {

  private final MessageSourceAccessor messages = SpringSecurityMessageSource.getAccessor();
  @NonNull
  private ChallengeRepository sessionRepository;
  @NonNull
  private EcrecoverService ecrecoverService;

  @Override
  public Authentication authenticate(Authentication authentication) throws AuthenticationException {
    Assert.isInstanceOf(EthAuthenticationToken.class, authentication,
        () -> this.messages.getMessage("EthAuthenticationProvider.onlySupports",
            "Only EthAuthenticationToken is supported"));
    final var token = (EthAuthenticationToken) authentication;
    final var challenge = sessionRepository.getAttempt(token.getAddress())
        .orElseThrow(() -> new InsufficientAuthenticationException(
            "Any valid authentication challenge hasn't issued, please issue it firstly."));

    ecrecoverService
        .verify(token.getAddress(), challenge, token.getSignature());

    final var authenticated = new EthAuthenticationToken(
        List.of(new SimpleGrantedAuthority("ETH_USER")),
        token.getAddress(),
        token.getSignature()
    );
    authenticated.setAuthenticated(true);

    return authenticated;
  }

  @Override
  public boolean supports(Class<?> authentication) {
    return (EthAuthenticationToken.class.isAssignableFrom(authentication));
  }

}
