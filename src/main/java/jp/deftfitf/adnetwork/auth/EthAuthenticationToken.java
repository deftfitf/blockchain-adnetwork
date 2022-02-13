package jp.deftfitf.adnetwork.auth;

import java.util.Collection;
import lombok.Getter;
import lombok.NonNull;
import lombok.Value;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;

@Getter
public final class EthAuthenticationToken extends AbstractAuthenticationToken {

  public EthAuthenticationToken(
      Collection<? extends GrantedAuthority> authorities,
      @NonNull String address, @NonNull String signature) {
    super(authorities);
    this.address = address;
    this.signature = signature;
    this.ethUserPrincipal = EthUserPrincipal.of(address);
  }

  @NonNull
  private final String address;
  @NonNull
  private final String signature;
  @NonNull
  private final EthUserPrincipal ethUserPrincipal;

  @Override
  public Object getCredentials() {
    return null;
  }

  @Override
  public Object getPrincipal() {
    return ethUserPrincipal;
  }

  @Value(staticConstructor = "of")
  public static class EthUserPrincipal {

    String address;
  }
}
