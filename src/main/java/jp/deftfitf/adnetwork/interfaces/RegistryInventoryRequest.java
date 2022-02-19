package jp.deftfitf.adnetwork.interfaces;

import lombok.NonNull;
import lombok.Value;

@Value
public class RegistryInventoryRequest {

  @NonNull
  Long inventoryId;
  @NonNull
  String privateKey;
}
