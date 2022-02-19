package jp.deftfitf.adnetwork.repository;

import java.security.PrivateKey;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Repository;

@Repository
public class DeliveryPrivateKeyRepository {

  private final Map<Long, PrivateKey> inventoryIdToDeliveryPrivateKey =
      new ConcurrentHashMap<>();

  public synchronized void save(long inventoryId, PrivateKey privateKey) {
    inventoryIdToDeliveryPrivateKey.put(inventoryId, privateKey);
  }

  public synchronized Optional<PrivateKey> findBy(long inventoryId) {
    return Optional.ofNullable(inventoryIdToDeliveryPrivateKey.get(inventoryId));
  }

  public synchronized Set<Long> activeInventoryIds() {
    return inventoryIdToDeliveryPrivateKey.keySet();
  }

}
