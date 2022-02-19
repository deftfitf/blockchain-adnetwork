import {NullableType} from "../types/NullableType";

export interface AdFormatV1 {
  inventoryId: number;
  ownerAddress: string;
  startTime: number;
  endTime: number;
  adPrice: number;
  adTitle: string;
  adDescription: string;
  landingPageUrl: string;
  displayImageUrl: string;
  nonce: string;
}

export type NullableAdFormatV1 = NullableType<AdFormatV1>;

export const nullableAdToNonNullableConvert = (format: NullableAdFormatV1): AdFormatV1 => {
  if (
      !format.inventoryId ||
      !format.ownerAddress ||
      !format.startTime ||
      !format.endTime ||
      !format.adPrice ||
      !format.adTitle ||
      !format.adDescription ||
      !format.landingPageUrl ||
      !format.displayImageUrl ||
      !format.nonce
  ) {
    throw new Error("All properties of AdFormatV1 must not be empty");
  }

  return {
    inventoryId: format.inventoryId,
    ownerAddress: format.ownerAddress,
    startTime: format.startTime,
    endTime: format.endTime,
    adPrice: format.adPrice,
    adTitle: format.adTitle,
    adDescription: format.adDescription,
    landingPageUrl: format.landingPageUrl,
    displayImageUrl: format.displayImageUrl,
    nonce: format.nonce
  }
}