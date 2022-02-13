package jp.deftfitf.adnetwork.auth;

import org.junit.jupiter.api.Test;

public class EcrecoverServiceTest {

  final EcrecoverService ecrecoverService = new EcrecoverService();

  @Test
  public void verify() {
    final var challenge = "f398a234-eb36-4fa5-99f9-14c08847420b";
    final var signature = "0x2958bdb4ae0e68629d2edb2e6a59011fe38dcd39581273f996a3e255d7191fba33d71ca93c8a09e70ea98657a4fa66574c6a8c604f074830b205d354c03ac99c1b";
    final var address = "0xD5a561f8a0f7F37C38ea85CaE5C4f17C7744b21C";

    ecrecoverService.verify(address, challenge, signature);
  }

}