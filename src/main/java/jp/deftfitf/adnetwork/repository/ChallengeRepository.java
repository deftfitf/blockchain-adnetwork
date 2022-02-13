package jp.deftfitf.adnetwork.repository;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Repository;

@Repository
public class ChallengeRepository {

  private final Map<String, String> addressToChallenge = new ConcurrentHashMap<>();

  public synchronized String attempt(String address) {
    final var challenge = UUID.randomUUID().toString();
    addressToChallenge.put(address, challenge);
    return challenge;
  }

  public synchronized Optional<String> getAttempt(String address) {
    final var challengeOpt = Optional.ofNullable(addressToChallenge.get(address));
    challengeOpt.ifPresent(notUsed -> addressToChallenge.remove(address));
    return challengeOpt;
  }

}
