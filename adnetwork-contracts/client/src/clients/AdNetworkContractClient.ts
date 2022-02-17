import {AdNetwork} from "../types/web3-v1-contracts/AdNetwork";
import {Ad, Inventory, NullableAd, NullableInventory} from "./AdNetworkContractModels";

export class AdNetworkContractClient {

  constructor(private readonly adNetworkContract: AdNetwork) {
  }

  getAdsByOwnerAddress = async (ownerAddress: string): Promise<Ad[]> => {
    const result = await this.adNetworkContract.methods
        .getAdsByOwnerAddress(ownerAddress)
        .call();

    const length = result["0"].length;
    const ads: Ad[] = [];
    for (let idx = 0; idx < length; idx++) {
      ads.push({
        adId: Number.parseInt(result["adIds"][idx]),
        ownerAddress: "(omitted)",
        inventoryId: Number.parseInt(result["inventoryIds"][idx]),
        adHash: result["adHashes"][idx],
        adHashForDelivery: "(omitted)",
        start: Number.parseInt(result["starts"][idx]),
        end: Number.parseInt(result["ends"][idx]),
        approved: result["approved"][idx],
      })
    }

    return ads;
  }

  createAd = async (ad: NullableAd, adPrice: number): Promise<string> => {
    if (
        !ad.inventoryId ||
        !ad.ownerAddress ||
        !ad.adHash ||
        !ad.adHashForDelivery ||
        !ad.start ||
        !ad.end
    ) {
      throw Error("Requested ad doesn't have enough information to create");
    }

    const result = await this.adNetworkContract.methods
        .createAd(
            ad.inventoryId,
            `0x${ad.adHash}`,
            `0x${ad.adHashForDelivery}`,
            ad.start,
            ad.end)
        .send({from: ad.ownerAddress, value: adPrice});

    console.debug(result);

    return result.transactionHash;
  };

  createInventory = async (inventory: NullableInventory): Promise<string> => {
    if (
        !inventory.inventoryName ||
        !inventory.inventoryUrl ||
        !inventory.publicKey ||
        !inventory.floorPrice ||
        !inventory.ownerAddress
    ) {
      throw Error("Requested inventory doesn't have enough information to create");
    }

    const result = await this.adNetworkContract.methods
        .createAdInventory(
            inventory.inventoryName,
            inventory.inventoryUrl,
            inventory.publicKey,
            inventory.floorPrice)
        .send({from: inventory.ownerAddress});

    console.debug(result);

    return result.transactionHash;
  }

  approveAd = async (inventoryOwner: string, inventoryId: number, adId: number): Promise<string> => {
    const result = await this.adNetworkContract
        .methods
        .approveAd(inventoryId, adId)
        .send({from: inventoryOwner});

    return result.transactionHash;
  }

  rejectAd = async (inventoryOwner: string, inventoryId: number, adId: number): Promise<string> => {
    const result = await this.adNetworkContract
        .methods
        .rejectAd(inventoryId, adId)
        .send({from: inventoryOwner});

    return result.transactionHash;
  }

  collectAd = async (collector: string, inventoryId: number, adId: number): Promise<string> => {
    const result = await this.adNetworkContract
        .methods
        .collectAd(inventoryId, adId)
        .send({from: collector});

    return result.transactionHash;
  }

  getInventory = async (inventoryId: number): Promise<Inventory | null> => {
    try {
      const result = await this.adNetworkContract.methods
          .getInventory(inventoryId)
          .call();

      return {
        inventoryId: Number.parseInt(result.inventoryId),
        ownerAddress: result.owner,
        inventoryName: result.name,
        inventoryUrl: result.uri,
        publicKey: result.publicKey,
        floorPrice: Number.parseInt(result.floorPrice),
      };
    } catch (error) {
      console.debug(error);
      return null;
    }
  }

  getInventories = async (offset: number, limit: number): Promise<Inventory[]> => {
    const result = await this.adNetworkContract.methods
        .getInventories(offset, limit)
        .call();

    return this.adaptInventoryResult(result);
  }

  getInventoriesByOwnerAddress = async (ownerAddress: string): Promise<Inventory[]> => {
    const result = await this.adNetworkContract.methods
        .getInventoriesByOwnerAddress(ownerAddress)
        .call();

    return this.adaptInventoryResult(result);
  }

  getAdsOf = async (inventoryId: number): Promise<Ad[]> => {
    const result = await this.adNetworkContract.methods
        .getAdsOf(inventoryId)
        .call();

    const length = result["0"].length;
    const ads: Ad[] = [];
    for (let idx = 0; idx < length; idx++) {
      ads.push({
        adId: Number.parseInt(result["adIds"][idx]),
        ownerAddress: "(omitted)",
        inventoryId: Number.parseInt(result["inventoryIds"][idx]),
        adHash: result["adHashes"][idx],
        adHashForDelivery: result["adHashForDeliveries"][idx],
        start: Number.parseInt(result["starts"][idx]),
        end: Number.parseInt(result["ends"][idx]),
        approved: result["approved"][idx],
      })
    }

    return ads;
  }

  private adaptInventoryResult = (result: {
    inventoryIds: string[];
    owners: string[];
    names: string[];
    uris: string[];
    publicKeys: string[];
    floorPrices: string[];
    0: string[];
    1: string[];
    2: string[];
    3: string[];
    4: string[];
    5: string[];
  }): Inventory[] => {
    const length = result["0"].length;
    const inventories: Inventory[] = [];
    for (let idx = 0; idx < length; idx++) {
      inventories.push({
        inventoryId: Number.parseInt(result["inventoryIds"][idx]),
        ownerAddress: result["owners"][idx],
        inventoryName: result["names"][idx],
        inventoryUrl: result["uris"][idx],
        publicKey: result["publicKeys"][idx],
        floorPrice: Number.parseInt(result["floorPrices"][idx]),
      });
    }
    return inventories;
  };

}