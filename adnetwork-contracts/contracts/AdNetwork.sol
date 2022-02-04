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

    mapping (uint256 => uint256) private _requestApproval;
    mapping (uint256 => uint256) private _adToInventory;
    mapping (uint256 => uint256) private _waitAdToInventory;
    mapping (address => uint32) private _ownerAdCount;
    mapping (address => uint32) private _ownerInventoryCount;
    mapping (uint256 => uint32) private _inventoryAdCount;
    mapping (uint256 => uint32) private _inventoryWaitAdCount;

    event AdReviewRequestSent(uint256 indexed inventoryId, bytes32 requestHash, bytes32 adHash);
    event AdCreated(uint256 indexed inventoryId, uint256 adId);
    event AdApproved(uint256 indexed adId, uint256 inventoryId);
    event AdRejected(uint256 indexed adId, uint256 inventoryId);
    event InventoryCreated(uint256 inventoryId);

    constructor() {
    }

    function createAdInventory(string memory name, string memory uri, uint256 floorPrice) external returns (uint256) {
        require(
            _ownerInventoryCount[msg.sender] < MAX_CREATABLE_INVENTORY_COUNT,
            "You have reached the maximum number of inventory you can create. You need to remove unwanted inventory.");
        _inventoryIds.increment();
        uint256 inventoryId = _inventoryIds.current();

        AdNetworkSet.Inventory memory inventory = AdNetworkSet.Inventory(inventoryId, payable(msg.sender), name, uri, floorPrice);
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

    function createAd(uint256 _inventoryId, bytes32 _hash, uint32 _start, uint32 _end) external payable returns (uint256) {
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

        AdNetworkSet.Ad memory ad = AdNetworkSet.Ad(adId, payable(msg.sender), _hash, _start, _end, msg.value);
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

        (bool r, ) = adOwner.call{value: paybackPrice}("");
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
        uint256[] memory, bytes32[] memory, uint32[] memory, uint32[] memory
    ) {
        uint inventoryAdCount = _inventoryAdCount[_inventoryId];
        uint256[] memory adIds = new uint256[](inventoryAdCount);
        bytes32[] memory adHashes = new bytes32[](inventoryAdCount);
        uint32[] memory starts = new uint32[](inventoryAdCount);
        uint32[] memory ends = new uint32[](inventoryAdCount);

        uint adIdx = 0;
        for (uint idx = 0; idx < _ads._values.length; idx++) {
            AdNetworkSet.Ad storage ad = _ads._values[idx];
            if (_adToInventory[ad.adId] != _inventoryId) {
                continue;
            }

            adIds[adIdx] = ad.adId;
            adHashes[adIdx] = ad.hash;
            starts[adIdx] = ad.start;
            ends[adIdx] = ad.end;
            adIdx++;
        }

        return (adIds, adHashes, starts, ends);
    }

    function getAdsWaitingForApprovalOf(uint256 _inventoryId) external view returns (
        uint256[] memory, bytes32[] memory, uint32[] memory, uint32[] memory
    ) {
        uint inventoryWaitAdCount = _inventoryWaitAdCount[_inventoryId];
        uint256[] memory adIds = new uint256[](inventoryWaitAdCount);
        bytes32[] memory adHashes = new bytes32[](inventoryWaitAdCount);
        uint32[] memory starts = new uint32[](inventoryWaitAdCount);
        uint32[] memory ends = new uint32[](inventoryWaitAdCount);

        uint adIdx = 0;
        for (uint idx = 0; idx < _ads._values.length; idx++) {
            AdNetworkSet.Ad storage ad = _ads._values[idx];
            if (_requestApproval[ad.adId] != _inventoryId) {
                continue;
            }

            adIds[adIdx] = ad.adId;
            adHashes[adIdx] = ad.hash;
            starts[adIdx] = ad.start;
            ends[adIdx] = ad.end;
            adIdx++;
        }

        return (adIds, adHashes, starts, ends);
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
