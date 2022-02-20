package jp.deftfitf.adnetwork.setting;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.NonNull;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "eth.wallet")
@Data
@NoArgsConstructor
public class WalletSetting {

  @NonNull
  private String password;
  @NonNull
  private String walletFilePath;
}
