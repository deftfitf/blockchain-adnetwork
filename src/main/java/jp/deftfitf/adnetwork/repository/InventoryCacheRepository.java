package jp.deftfitf.adnetwork.repository;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.security.PrivateKey;
import java.security.spec.MGF1ParameterSpec;
import java.time.Clock;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;
import javax.crypto.BadPaddingException;
import javax.crypto.Cipher;
import javax.crypto.IllegalBlockSizeException;
import javax.crypto.NoSuchPaddingException;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.OAEPParameterSpec;
import javax.crypto.spec.PSource;
import javax.crypto.spec.SecretKeySpec;
import jp.deftfitf.adnetwork.dto.AdFormatV1Dto;
import lombok.NonNull;
import lombok.RequiredArgsConstructor;
import lombok.Value;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Repository;
import org.web3j.adnetwork.AdNetwork;
import org.web3j.tuples.generated.Tuple7;
import org.web3j.utils.Numeric;

@Slf4j
@Repository
@RequiredArgsConstructor
public class InventoryCacheRepository {

  // every 5 minutes
  private static final long CACHE_LOAD_FIXED_RATE = 5 * 60 * 1000;
  private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
  private static final int GCM_IV_LENGTH = 12;

  private final Clock clock;
  private final AdNetwork adNetwork;
  private final DeliveryPrivateKeyRepository deliveryPrivateKeyRepository;
  private final StorageRepository storageRepository;
  private volatile Map<Long, AdFormatV1Dto> adIdToAdDto = new ConcurrentHashMap<>();
  private volatile Map<Long, List<Pair<Long, AdFormatV1Dto>>> inventoryIdToAds = new ConcurrentHashMap<>();

  @Scheduled(fixedRate = CACHE_LOAD_FIXED_RATE)
  public synchronized void reload() {
    final var activeInventoryIds = deliveryPrivateKeyRepository.activeInventoryIds();
    final var newDto = activeInventoryIds.stream()
        .map(inventoryId -> {
          final var privateKey = deliveryPrivateKeyRepository.findBy(inventoryId);
          if (privateKey.isEmpty()) {
            return FetchResult.of(false, null);
          }
          try {
            final var result = adNetwork
                .getAdsOf(BigInteger.valueOf(inventoryId))
                .send();

            return FetchResult.of(true, convert(privateKey.get(), result));
          } catch (Exception e) {
            return FetchResult.of(false, null);
          }
        })
        .filter(FetchResult::isSuccess)
        .flatMap(result -> result.getAdDto().stream())
        .collect(Collectors.toConcurrentMap(
            Pair::getKey,
            Pair::getValue,
            (l, r) -> r
        ));

    final var newMap = new ConcurrentHashMap<Long, List<Pair<Long, AdFormatV1Dto>>>();
    newDto.forEach((key, value) -> {
      final var lst = newMap
          .computeIfAbsent(value.getInventoryId(), k -> new ArrayList<>());
      lst.add(Pair.of(key, value));
    });

    adIdToAdDto = newDto;
    inventoryIdToAds = newMap;
  }

  public List<Pair<Long, AdFormatV1Dto>> findBy(long inventoryId) {
    return Optional.ofNullable(inventoryIdToAds.get(inventoryId))
        .orElse(List.of());
  }

  private List<Pair<Long, AdFormatV1Dto>> convert(
      PrivateKey privateKey,
      Tuple7<
          List<BigInteger>,
          List<BigInteger>,
          List<byte[]>,
          List<byte[]>,
          List<BigInteger>,
          List<BigInteger>,
          List<Boolean>> result
  ) {
    final var length = result.component1().size();
    final var ads = new ArrayList<Pair<Long, AdFormatV1Dto>>();
    for (int idx = 0; idx < length; idx++) {
      final var approved = result.component7().get(idx);
      // Not approved ads can't be delivered
      if (!approved) {
        continue;
      }

      final var adId = result.component1().get(idx).longValue();
      final var cachedAdFormatV1Dto = adIdToAdDto.get(adId);
      if (
          cachedAdFormatV1Dto != null &&
              isInDeliveryPeriod(cachedAdFormatV1Dto.getStartTime(),
                  cachedAdFormatV1Dto.getEndTime())
      ) {
        ads.add(Pair.of(adId, cachedAdFormatV1Dto));
        continue;
      }

      final var startTime = result.component5().get(idx).longValue();
      final var endTime = result.component6().get(idx).longValue();
      if (!isInDeliveryPeriod(startTime, endTime)) {
        continue;
      }

      final var adHash = result.component4().get(idx);
      final var loaded = storageRepository
          .load("ad-formats/" + Numeric.toHexStringNoPrefix(adHash));

      final AdFormatV1Dto adFormatV1Dto;
      try {
        final var decoded = decodeAdFormatV1(privateKey, loaded);
        adFormatV1Dto = OBJECT_MAPPER.readValue(decoded, AdFormatV1Dto.class);
      } catch (Exception e) {
        log.error("decode failed: loaded={}", loaded, e);
        continue;
      }

      ads.add(Pair.of(adId, adFormatV1Dto));
    }

    return ads;
  }

  private String decodeAdFormatV1(PrivateKey privateKey, String formatV1Raw) throws Exception {
    final var elements = formatV1Raw.split(":");
    if (elements.length != 3) {
      throw new RuntimeException("unexpected ad format");
    }
    final var decodedEncryptedKey =
        Base64.getDecoder().decode(elements[1].getBytes(StandardCharsets.UTF_8));
    final var ciphertext = Base64.getDecoder().decode(elements[2]);
    final var iv = new GCMParameterSpec(128, ciphertext, 0, GCM_IV_LENGTH);

    final Cipher cipher;
    try {
      cipher = Cipher.getInstance("RSA/ECB/OAEPPadding");
      final var oaepParams = new OAEPParameterSpec(
          "SHA-256", "MGF1",
          new MGF1ParameterSpec("SHA-256"),
          PSource.PSpecified.DEFAULT);
      cipher.init(Cipher.DECRYPT_MODE, privateKey, oaepParams);
    } catch (NoSuchAlgorithmException | NoSuchPaddingException | InvalidKeyException e) {
      throw new RuntimeException(e);
    }

    final SecretKey aesSecret;
    try {
      final var decryptedAesKey = cipher.doFinal(decodedEncryptedKey);
      aesSecret = new SecretKeySpec(Base64.getDecoder().decode(decryptedAesKey), "AES");
    } catch (IllegalBlockSizeException | BadPaddingException e) {
      throw new RuntimeException(e);
    }

    final Cipher aesCipher;
    try {
      aesCipher = Cipher.getInstance("AES/GCM/NoPadding");
    } catch (NoSuchAlgorithmException | NoSuchPaddingException e) {
      throw new RuntimeException(e);
    }

    final byte[] plainText;
    try {
      aesCipher.init(Cipher.DECRYPT_MODE, aesSecret, iv);
      plainText = aesCipher.doFinal(ciphertext, GCM_IV_LENGTH, ciphertext.length - GCM_IV_LENGTH);
    } catch (IllegalBlockSizeException | BadPaddingException e) {
      throw new RuntimeException(e);
    }

    return new String(plainText, StandardCharsets.UTF_8);
  }

  private boolean isInDeliveryPeriod(long startTime, long endTime) {
    final var currentTime = clock.millis() / 1000;
    return currentTime >= startTime && currentTime <= endTime;
  }

  @Value(staticConstructor = "of")
  public static class FetchResult {

    boolean success;
    List<Pair<Long, AdFormatV1Dto>> adDto;
  }

  @Value(staticConstructor = "of")
  public static class Pair<K, V> {

    @NonNull K key;
    @NonNull V value;
  }

}
