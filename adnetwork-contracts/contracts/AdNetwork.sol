// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "./AdNetworkSet.sol";

contract AdNetwork {
    uint constant MAX_CREATABLE_AD_COUNT = 10;
    uint constant MAX_CREATABLE_INVENTORY_COUNT = 10;
    uint constant MAX_DELIVERABLE_AD_COUNT = 10;
    /// @dev Delivery time must be at least 1 hour.
    uint constant MIN_DELIVERY_TIME = 60 * 60;
    /// @dev Since there is a high possibility that the screening will not be completed in time,
    /// it is necessary to allow at least 12 hours before the distribution starts.
    uint constant MIN_TIME_REQUIRED_TO_START_DELIVERY = 60 * 60 * 12;
    uint constant MAX_CACHE_BACK_GAS_FEE = 10 wei;

    using Counters for Counters.Counter;
    using AdNetworkSet for AdNetworkSet.InventorySet;
    using AdNetworkSet for AdNetworkSet.AdSet;
    using Math for uint256;

    Counters.Counter private _inventoryIds;
    AdNetworkSet.InventorySet private _inventories;
    Counters.Counter private _adIds;
    AdNetworkSet.AdSet private _ads;

    mapping(uint256 => uint256) private _requestApproval;
    mapping(uint256 => uint256) private _adToInventory;
    mapping(uint256 => uint256) private _waitAdToInventory;
    mapping(address => uint32) private _ownerAdCount;
    mapping(address => uint32) private _ownerInventoryCount;
    mapping(uint256 => uint32) private _inventoryAdCount;
    mapping(uint256 => uint32) private _inventoryWaitAdCount;

    event AdReviewRequestSent(uint256 indexed inventoryId, bytes32 requestHash, bytes32 adHash);
    event AdCreated(uint256 indexed inventoryId, uint256 adId);
    event AdApproved(uint256 indexed adId, uint256 inventoryId);
    event AdRejected(uint256 indexed adId, uint256 inventoryId);
    event InventoryCreated(uint256 inventoryId);

    constructor() {
    }

    function createAdInventory(string memory name, string memory uri, string memory publicKey, uint256 floorPrice) external returns (uint256) {
        require(
            _ownerInventoryCount[msg.sender] < MAX_CREATABLE_INVENTORY_COUNT,
            "You have reached the maximum number of inventory you can create. You need to remove unwanted inventory.");
        _inventoryIds.increment();
        uint256 inventoryId = _inventoryIds.current();

        AdNetworkSet.Inventory memory inventory = AdNetworkSet.Inventory(inventoryId, payable(msg.sender), name, uri, publicKey, floorPrice);
        _inventories.add(inventoryId, inventory);
        emit InventoryCreated(inventoryId);

        return inventoryId;
    }

    function removeAdInventory(uint256 _inventoryId) external {
        require(
            _inventoryAdCount[_inventoryId] == 0,
            "You can't delete an inventory if there are ads left in the inventory.");

        AdNetworkSet.Inventory storage inventory = _inventories.get(_inventoryId);
        require(
            inventory.owner == msg.sender,
            "Only inventory owners can remove inventory.");

        _inventories.remove(_inventoryId);
    }

    function createAd(uint256 _inventoryId, bytes32 _hash, bytes32 _hashForDelivery, uint32 _start, uint32 _end) external payable returns (uint256) {
        require(
            _ownerAdCount[msg.sender] < MAX_CREATABLE_AD_COUNT,
            "You have reached the maximum number of ads you can create. You need to remove unwanted ads.");
        require(
            _end > _start &&
            _end - _start >= MIN_DELIVERY_TIME,
            "The delivery start time must be before the delivery end time, and a minimum delivery period must be set."
        );
        require(
            _start > block.timestamp &&
            _start - block.timestamp >= MIN_TIME_REQUIRED_TO_START_DELIVERY,
            "It is necessary to allow a certain amount of time before the distribution starts."
        );
        require(
            _inventoryAdCount[_inventoryId] < MAX_DELIVERABLE_AD_COUNT,
            "Exceeded the limit of ads that can be delivered to your inventory."
        );

        AdNetworkSet.Inventory storage inventory = _inventories.get(_inventoryId);
        require(msg.value >= inventory.floorPrice, "ad price must be larger than floor price set by inventory owner.");

        _adIds.increment();
        uint256 adId = _adIds.current();

        AdNetworkSet.Ad memory ad = AdNetworkSet.Ad(adId, _inventoryId, payable(msg.sender), _hash, _hashForDelivery, _start, _end, msg.value);
        require(_ads.add(adId, ad), "ads must be added correctly");

        _requestApproval[adId] = _inventoryId;
        _inventoryWaitAdCount[_inventoryId]++;
        _ownerAdCount[msg.sender]++;

        emit AdCreated(_inventoryId, adId);

        return adId;
    }

    function approveAd(uint256 _inventoryId, uint256 _adId) external {
        require(
            _inventoryAdCount[_inventoryId] < MAX_DELIVERABLE_AD_COUNT,
            "Exceeded the limit of ads that can be delivered to your inventory.");
        require(
            _requestApproval[_adId] == _inventoryId,
            "Advertising for the target inventory is not currently under review");

        AdNetworkSet.Inventory storage inventory = _inventories.get(_inventoryId);
        require(
            inventory.owner == msg.sender,
            "Only inventory owners can approve ads.");

        AdNetworkSet.Ad storage ad = _ads.get(_adId);
        require(block.timestamp < ad.start);

        delete _requestApproval[_adId];
        _inventoryAdCount[_inventoryId]++;
        _inventoryWaitAdCount[_inventoryId]--;
        _adToInventory[_adId] = _inventoryId;

        emit AdApproved(_adId, _inventoryId);
    }

    function rejectAd(uint256 _inventoryId, uint256 _adId) external {
        require(
            _requestApproval[_adId] == _inventoryId,
            "Advertising for the target inventory is not currently under review");

        AdNetworkSet.Inventory storage inventory = _inventories.get(_inventoryId);
        require(
            inventory.owner == msg.sender,
            "Only inventory owners can reject ads.");

        delete _requestApproval[_adId];
        _inventoryWaitAdCount[_inventoryId]--;
        AdNetworkSet.Ad storage ad = _ads.get(_adId);
        address payable adOwner = ad.owner;
        uint paybackPrice = ad.price;

        (bool r,) = adOwner.call{value : paybackPrice}("");
        require(r, "Failed to payback lock values");
        _ads.remove(_adId);

        emit AdRejected(_adId, _inventoryId);
    }

    function collectAd(uint256 _inventoryId, uint _adId) external {
        require(
            _adToInventory[_adId] == _inventoryId,
            "Only ads that are in the inventory can be collected.");

        AdNetworkSet.Ad storage ad = _ads.get(_adId);
        require(
            block.timestamp >= ad.end,
            "Only ads that have expired can be collected.");
        AdNetworkSet.Inventory storage inventory = _inventories.get(_inventoryId);
        require(
            msg.sender == inventory.owner ||
            msg.sender == ad.owner,
            "Only the owner of the inventory or the owner of the ad can collect the ad.");

        if (msg.sender == inventory.owner) {
            inventory.owner.transfer(ad.price);
        } else if (msg.sender == ad.owner) {
            uint256 maxGasFee = (ad.price / 10).min(tx.gasprice).min(MAX_CACHE_BACK_GAS_FEE);
            ad.owner.transfer(maxGasFee);
            inventory.owner.transfer(ad.price - maxGasFee);
        }

        delete _adToInventory[_adId];
        _ownerAdCount[ad.owner]--;
        _inventoryAdCount[_inventoryId]--;
        _ads.remove(_adId);
        _inventories.remove(_inventoryId);
    }

    function getAdsOf(uint256 _inventoryId) external view returns (
        uint256[] memory adIds,
        uint256[] memory inventoryIds,
        bytes32[] memory adHashes,
        bytes32[] memory adHashForDeliveries,
        uint32[] memory starts,
        uint32[] memory ends
    ) {
        uint inventoryAdCount = _inventoryAdCount[_inventoryId];
        adIds = new uint256[](inventoryAdCount);
        inventoryIds = new uint256[](inventoryAdCount);
        adHashes = new bytes32[](inventoryAdCount);
        adHashForDeliveries = new bytes32[](inventoryAdCount);
        starts = new uint32[](inventoryAdCount);
        ends = new uint32[](inventoryAdCount);

        uint adIdx = 0;
        for (uint idx = 0; idx < _ads._values.length; idx++) {
            AdNetworkSet.Ad storage ad = _ads._values[idx];
            if (_adToInventory[ad.adId] != _inventoryId) {
                continue;
            }

            adIds[adIdx] = ad.adId;
            adHashes[adIdx] = ad.hash;
            adHashForDeliveries[adIdx] = ad.hashForDelivery;
            starts[adIdx] = ad.start;
            ends[adIdx] = ad.end;
            adIdx++;
        }
    }

    function getAdsByOwnerAddress(address _ownerAddress) external view returns (
        uint256[] memory adIds,
        uint256[] memory inventoryIds,
        bytes32[] memory adHashes,
        uint32[] memory starts,
        uint32[] memory ends,
        bool[] memory approved
    ) {
        uint inventoryAdCount = _ownerAdCount[_ownerAddress];

        adIds = new uint256[](inventoryAdCount);
        inventoryIds = new uint256[](inventoryAdCount);
        adHashes = new bytes32[](inventoryAdCount);
        starts = new uint32[](inventoryAdCount);
        ends = new uint32[](inventoryAdCount);
        approved = new bool[](inventoryAdCount);

        uint adIdx = 0;
        for (uint idx = 0; idx < _ads._values.length; idx++) {
            AdNetworkSet.Ad storage ad = _ads._values[idx];
            if (ad.owner != _ownerAddress) {
                continue;
            }

            adIds[adIdx] = ad.adId;
            inventoryIds[adIdx] = ad.inventoryId;
            adHashes[adIdx] = ad.hash;
            starts[adIdx] = ad.start;
            ends[adIdx] = ad.end;
            approved[adIdx] = _adToInventory[ad.adId] == ad.inventoryId;
            adIdx++;
        }
    }

    function getAdsWaitingForApprovalOf(uint256 _inventoryId) external view returns (
        uint256[] memory adIds,
        uint256[] memory inventoryIds,
        bytes32[] memory adHashes,
        uint32[] memory starts,
        uint32[] memory ends
    ) {
        uint inventoryWaitAdCount = _inventoryWaitAdCount[_inventoryId];

        adIds = new uint256[](inventoryWaitAdCount);
        inventoryIds = new uint256[](inventoryWaitAdCount);
        adHashes = new bytes32[](inventoryWaitAdCount);
        starts = new uint32[](inventoryWaitAdCount);
        ends = new uint32[](inventoryWaitAdCount);

        uint adIdx = 0;
        for (uint idx = 0; idx < _ads._values.length; idx++) {
            AdNetworkSet.Ad storage ad = _ads._values[idx];
            if (_requestApproval[ad.adId] != _inventoryId) {
                continue;
            }

            adIds[adIdx] = ad.adId;
            inventoryIds[adIdx] = ad.inventoryId;
            adHashes[adIdx] = ad.hash;
            starts[adIdx] = ad.start;
            ends[adIdx] = ad.end;
            adIdx++;
        }
    }

    function getInventory(uint256 _inventoryId) external view returns (
        uint256 inventoryId,
        address owner,
        string memory name,
        string memory uri,
        string memory publicKey,
        uint256 floorPrice
    ) {
        AdNetworkSet.Inventory storage inventory = _inventories.get(_inventoryId);
        require(inventory.inventoryId == _inventoryId, "requested inventory id is invalid");

        inventoryId = inventory.inventoryId;
        owner = inventory.owner;
        name = inventory.name;
        uri = inventory.uri;
        publicKey = inventory.publicKey;
        floorPrice = inventory.floorPrice;
    }

    function getInventories(uint offset, uint limit) external view returns (
        uint256[] memory inventoryIds,
        address[] memory owners,
        string[] memory names,
        string[] memory uris,
        string[] memory publicKeys,
        uint256[] memory floorPrices
    ) {
        require(limit > 0 && limit <= 50, "Inventory can be retrieve up to 30 items at the same time");
        require(offset >= 0 && offset <= _inventories._values.length);

        uint upper = _inventories._values.length.min(offset + limit);
        inventoryIds = new uint256[](upper);
        owners = new address[](upper);
        names = new string[](upper);
        uris = new string[](upper);
        publicKeys = new string[](upper);
        floorPrices = new uint256[](upper);

        uint inventoryIdx = 0;
        for (uint idx = offset; idx < upper; idx++) {
            AdNetworkSet.Inventory storage inventory = _inventories._values[idx];

            inventoryIds[inventoryIdx] = inventory.inventoryId;
            owners[inventoryIdx] = inventory.owner;
            names[inventoryIdx] = inventory.name;
            uris[inventoryIdx] = inventory.uri;
            publicKeys[inventoryIdx] = inventory.publicKey;
            floorPrices[inventoryIdx] = inventory.floorPrice;
            inventoryIdx++;
        }
    }

    function getExpiredAdIds(uint256 _inventoryId) external view returns (uint256[] memory) {
        uint expireCounts = 0;
        for (uint idx = 0; idx < _ads._values.length; idx++) {
            AdNetworkSet.Ad storage ad = _ads._values[idx];
            if (_adToInventory[ad.adId] != _inventoryId) {
                continue;
            }
            if (ad.end > block.timestamp) {
                expireCounts++;
            }
        }

        uint256[] memory expiredAdIds = new uint256[](expireCounts);
        expireCounts = 0;
        for (uint idx = 0; idx < _ads._values.length; idx++) {
            AdNetworkSet.Ad storage ad = _ads._values[idx];
            if (_adToInventory[ad.adId] != _inventoryId) {
                continue;
            }
            if (ad.end > block.timestamp) {
                expiredAdIds[expireCounts] = ad.adId;
                expireCounts++;
            }
        }
        return expiredAdIds;
    }

}
