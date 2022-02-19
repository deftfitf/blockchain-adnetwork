package jp.deftfitf.adnetwork.interfaces;

import lombok.NonNull;
import lombok.Value;

@Value
public class AdFormatV1Request {

  @NonNull
  String encodedAdFormatV1;
}
