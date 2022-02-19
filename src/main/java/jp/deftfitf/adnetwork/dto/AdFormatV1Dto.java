package jp.deftfitf.adnetwork.dto;

import lombok.NonNull;
import lombok.Value;

@Value
public class AdFormatV1Dto {

  @NonNull Long inventoryId;
  @NonNull String ownerAddress;
  @NonNull Long startTime;
  @NonNull Long endTime;
  @NonNull Long adPrice;
  @NonNull String adTitle;
  @NonNull String adDescription;
  @NonNull String landingPageUrl;
  @NonNull String displayImageUrl;
  @NonNull String nonce;
}
