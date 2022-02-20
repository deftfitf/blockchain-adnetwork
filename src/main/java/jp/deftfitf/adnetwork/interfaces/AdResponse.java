package jp.deftfitf.adnetwork.interfaces;

import jp.deftfitf.adnetwork.dto.AdFormatV1Dto;
import lombok.Value;

@Value(staticConstructor = "of")
public class AdResponse {

  boolean isFound;
  Long adId;
  AdFormatV1Dto adFormatV1Dto;
}
