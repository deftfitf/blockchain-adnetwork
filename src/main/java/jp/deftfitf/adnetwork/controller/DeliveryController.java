package jp.deftfitf.adnetwork.controller;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.Random;
import jp.deftfitf.adnetwork.config.ModuleConfig.CustomClock;
import jp.deftfitf.adnetwork.interfaces.AdRequest;
import jp.deftfitf.adnetwork.interfaces.AdResponse;
import jp.deftfitf.adnetwork.repository.InventoryCacheRepository;
import lombok.NonNull;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class DeliveryController {

  @NonNull
  private final InventoryCacheRepository inventoryCacheRepository;
  @NonNull
  private final Random random;
  @NonNull
  private final CustomClock customClock;

  @PostMapping("/delivery")
  public AdResponse delivery(
      @RequestBody AdRequest adRequest
  ) {
    final var ads = inventoryCacheRepository.findBy(adRequest.getInventoryId());
    if (ads.isEmpty()) {
      return AdResponse.of(false, null, null);
    }

    final var chosen = random.nextInt(ads.size());
    final var ad = ads.get(chosen);
    return AdResponse.of(true, ad.getKey(), ad.getValue());
  }

  @PostMapping("/admin/clock")
  public void clock(
      @RequestParam("millis") long millis
  ) {
    final var newClock = Clock.fixed(Instant.ofEpochMilli(millis), ZoneId.systemDefault());
    customClock.setOverride(newClock);
  }

  @PostMapping("/admin/reload")
  public void reload() {
    inventoryCacheRepository.reload();
  }

}
