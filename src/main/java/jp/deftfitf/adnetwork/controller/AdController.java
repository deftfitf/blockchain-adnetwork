package jp.deftfitf.adnetwork.controller;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.NoSuchAlgorithmException;
import java.security.PrivateKey;
import java.security.spec.InvalidKeySpecException;
import java.security.spec.PKCS8EncodedKeySpec;
import java.util.Base64;
import java.util.Set;
import java.util.UUID;
import jp.deftfitf.adnetwork.auth.EthAuthenticationToken.EthUserPrincipal;
import jp.deftfitf.adnetwork.interfaces.AdFormatV1Request;
import jp.deftfitf.adnetwork.interfaces.RegistryInventoryRequest;
import jp.deftfitf.adnetwork.repository.DeliveryPrivateKeyRepository;
import jp.deftfitf.adnetwork.repository.StorageRepository;
import lombok.NonNull;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.web3j.adnetwork.AdNetwork;
import org.web3j.crypto.Hash;
import org.web3j.utils.Numeric;

@RestController
@RequestMapping("/api/ad")
@RequiredArgsConstructor
public class AdController {

  private static final Set<String> ALLOWED_MIME_TYPE = Set.of(
      "image/gif",
      "image/png",
      "image/jpeg"
  );

  @NonNull
  private final StorageRepository storageRepository;
  @NonNull
  private final DeliveryPrivateKeyRepository deliveryPrivateKeyRepository;
  @NonNull
  private final AdNetwork adNetwork;

  @PostMapping("/registryInventory")
  public void registryInventory(
      @AuthenticationPrincipal EthUserPrincipal principal,
      @RequestBody RegistryInventoryRequest registryInventoryRequest
  ) {
    validateInventory(principal.getAddress(), registryInventoryRequest.getInventoryId());

    final var privateKeyBytes = Base64
        .getDecoder()
        .decode(registryInventoryRequest.getPrivateKey().getBytes(StandardCharsets.UTF_8));
    final var keySpec = new PKCS8EncodedKeySpec(privateKeyBytes);
    final KeyFactory keyFactory;
    try {
      keyFactory = KeyFactory.getInstance("RSA");
    } catch (NoSuchAlgorithmException e) {
      throw new RuntimeException(e);
    }

    final PrivateKey privateKey;
    try {
      privateKey = keyFactory.generatePrivate(keySpec);
    } catch (InvalidKeySpecException e) {
      throw new RuntimeException(e);
    }

    deliveryPrivateKeyRepository.save(
        registryInventoryRequest.getInventoryId(),
        privateKey
    );
  }

  private void validateInventory(String owner, long inventoryId) {
    final String targetOwner;
    try {
      final var inventory = adNetwork
          .getInventory(BigInteger.valueOf(inventoryId))
          .send();

      targetOwner = inventory.component2().toLowerCase();
    } catch (Exception e) {
      throw new RuntimeException(e);
    }

    if (!targetOwner.equals(owner.toLowerCase())) {
      throw new IllegalArgumentException("Requested inventory isn't owned by requested address");
    }
  }

  @PostMapping("/image")
  public String uploadAdImage(
      @AuthenticationPrincipal EthUserPrincipal principal,
      @RequestParam("adImage") MultipartFile multipartFile
  ) {
    if (multipartFile.getOriginalFilename() == null) {
      throw new RuntimeException("Your uploaded file name is invalid");
    }
    if (!ALLOWED_MIME_TYPE.contains(multipartFile.getContentType())) {
      throw new RuntimeException("Your uploaded file's MIME Type is invalid");
    }
    final var elems = StringUtils
        .cleanPath(multipartFile.getOriginalFilename())
        .split("\\.");
    if (elems.length < 1) {
      throw new RuntimeException("Your uploaded ad image name is invalid");
    }
    final var fileExtension = elems[elems.length - 1];

    final var fileName =
        String.format(
            "images/%s-%s.%s",
            principal.getAddress(),
            UUID.randomUUID(),
            fileExtension);

    try (final var is = multipartFile.getInputStream()) {
      storageRepository.save(fileName, is);
    } catch (IOException e) {
      throw new RuntimeException(e);
    }

    return fileName;
  }

  @PostMapping("/create")
  public String createAd(
      @AuthenticationPrincipal EthUserPrincipal principal,
      @RequestBody AdFormatV1Request adFormatV1Request
  ) {
    final var sha3Hash = Numeric.toHexStringNoPrefix(
        Hash.sha3(adFormatV1Request
            .getEncodedAdFormatV1()
            .getBytes(StandardCharsets.UTF_8)));

    storageRepository.save("ad-formats/" + sha3Hash,
        new ByteArrayInputStream(
            adFormatV1Request
                .getEncodedAdFormatV1()
                .getBytes(StandardCharsets.UTF_8)));

    return sha3Hash;
  }

}
