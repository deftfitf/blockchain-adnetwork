package jp.deftfitf.adnetwork.setting;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.NonNull;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "eth.network")
@Data
@NoArgsConstructor
public class EthNetworkSetting {

  @NonNull
  private String uri;
  @NonNull
  private String networkId;
}
