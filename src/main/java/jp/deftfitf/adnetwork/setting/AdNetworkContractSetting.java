package jp.deftfitf.adnetwork.setting;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.NonNull;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "adnetwork.contract")
@Data
@NoArgsConstructor
public class AdNetworkContractSetting {

  @NonNull
  private String address;
}
