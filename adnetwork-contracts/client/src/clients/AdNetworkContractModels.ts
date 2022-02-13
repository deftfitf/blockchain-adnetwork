import {NullableType} from "../types/NullableType";

export type Ad = {
  adId: number;
  ownerAddress: string;
  inventoryId: number;
  adHash: string;
  adHashForDelivery: string;
  start: number;
  end: number;
  approved?: boolean;
}

export type Inventory = {
  inventoryId: number;
  ownerAddress: string;
  inventoryName: string;
  inventoryUrl: string;
  publicKey: string;
  floorPrice: number;
}

export type NullableAd = NullableType<Ad>;
export type NullableInventory = NullableType<Inventory>;