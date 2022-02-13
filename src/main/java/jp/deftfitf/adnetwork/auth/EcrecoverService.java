package jp.deftfitf.adnetwork.auth;

import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.security.SignatureException;
import java.util.Arrays;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.stereotype.Service;
import org.web3j.crypto.Hash;
import org.web3j.crypto.Sign;
import org.web3j.utils.Numeric;

@Service
public class EcrecoverService {

  public void verify(String address, String message, String signature) {
    final var signatureBytes = Numeric.hexStringToByteArray(signature);
    if (signatureBytes.length != 65) {
      throw new BadCredentialsException("Signature bytes you sent don't have length 65.");
    }

    byte v = signatureBytes[64];
    if (v < 27) {
      v += 27;
    }
    final var r = Arrays.copyOfRange(signatureBytes, 0, 32);
    final var s = Arrays.copyOfRange(signatureBytes, 32, 64);
    final var sig = new Sign.SignatureData(v, r, s);

    final var msgBytes = message.getBytes(StandardCharsets.UTF_8);
    final BigInteger recoveredKey;
    try {
      recoveredKey = Sign.signedPrefixedMessageToKey(msgBytes, sig);
    } catch (SignatureException e) {
      throw new BadCredentialsException("Ecrecover process has failed");
    }

    final var hashedKeyBytes = Numeric.hexStringToByteArray(
        Hash.sha3(Numeric.toHexStringNoPrefix(recoveredKey)));
    final var recoveredAddressBytes = Arrays.copyOfRange(hashedKeyBytes, 12, 32);
    final var recoveredAddress =
        "0x" + Numeric.toHexStringNoPrefix(recoveredAddressBytes).toLowerCase();
    if (!address.toLowerCase().equals(recoveredAddress)) {
      throw new BadCredentialsException("Request addr doesn't match to recovered addr");
    }
  }

}
