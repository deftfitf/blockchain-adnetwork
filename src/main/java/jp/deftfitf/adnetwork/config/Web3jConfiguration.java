package jp.deftfitf.adnetwork.config;

import java.io.IOException;
import jp.deftfitf.adnetwork.setting.AdNetworkContractSetting;
import jp.deftfitf.adnetwork.setting.EthNetworkSetting;
import jp.deftfitf.adnetwork.setting.WalletSetting;
import lombok.extern.slf4j.Slf4j;
import org.jetbrains.annotations.NotNull;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.web3j.adnetwork.AdNetwork;
import org.web3j.crypto.CipherException;
import org.web3j.crypto.Credentials;
import org.web3j.crypto.WalletUtils;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.http.HttpService;
import org.web3j.tx.gas.DefaultGasProvider;

@Slf4j
@Configuration
@EnableConfigurationProperties({
    EthNetworkSetting.class,
    AdNetworkContractSetting.class,
    WalletSetting.class
})
public class Web3jConfiguration {

  @Bean
  public Web3j web3j(@NotNull EthNetworkSetting networkSetting) {
    final var web3jService = new HttpService(networkSetting.getUri());
    return Web3j.build(web3jService);
  }

  @Bean
  public Credentials credentials(@NotNull WalletSetting setting) {
    try {
      return WalletUtils.loadCredentials(setting.getPassword(), setting.getWalletFilePath());
    } catch (IOException | CipherException e) {
      log.error("Failed to load wallet credential", e);
      throw new RuntimeException(e);
    }
  }

  @Bean
  public AdNetwork adNetworkContract(
      Web3j web3j,
      Credentials credentials,
      AdNetworkContractSetting setting
  ) {
    final var adNetworkContract = AdNetwork.load(
        setting.getAddress(), web3j, credentials,
        new DefaultGasProvider());
    try {
      adNetworkContract.isValid();
    } catch (IOException e) {
      log.error("Actual adNetwork contract abi may not correspond to local one. please check.", e);
      throw new RuntimeException(e);
    }
    return adNetworkContract;
  }

}
