package jp.deftfitf.adnetwork.interfaces;

import lombok.NonNull;
import lombok.Value;

@Value
public class ChallengeResponse {

  @NonNull
  String challenge;
}
