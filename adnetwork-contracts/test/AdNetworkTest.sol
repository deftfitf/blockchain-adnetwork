pragma solidity ^0.8.0;

import "truffle/Assert.sol";
import "truffle/DeployedAddresses.sol";
import "../contracts/AdNetwork.sol";

contract AdNetworkTest {

    uint public initialBalance = 1 ether;
    address deployedAddress = DeployedAddresses.AdNetwork();
    AdNetwork adNetwork = AdNetwork(deployedAddress);
    InventoryOwner inventoryOwner = new InventoryOwner(adNetwork);
    AdOwner adOwner = new AdOwner(adNetwork);

    function testGetInventoriesWhenItIsEmpty() public {
        (uint256[] memory inventoryIds,,,,,) = adNetwork.getInventories(0, 5);
        Assert.equal(inventoryIds.length, 0, "Inventories must be empty when it is created");
    }

    function testGetAdsByOwnerAddressWhenItIsEmpty() public {
        (uint256[] memory adIds,,,,,) = adNetwork.getAdsByOwnerAddress(address(this));
        Assert.equal(adIds.length, 0, "Ads must be empty when it is created");
    }

    function testCreateAdInventory() public {
        string memory name = "sample_inventory";
        string memory uri = "https://example.com/";
        string memory publicKey = "dummy_public_key";
        uint256 floorPrice = 0.01 ether;

        uint256 inventoryId = inventoryOwner.createAdInventory(name, uri, publicKey, floorPrice);

        Assert.equal(inventoryId, 1, "Ad Inventory can be created");
    }

    function testCreateAd() public {
        uint256 inventoryId = 1;
        bytes32 hash = bytes32("encrypted and hashed ad data");
        bytes32 hashForDelivery = bytes32("encrypted and hashed ad data");
        uint32 start = uint32(block.timestamp + 60 * 60 * 12 + 1000);
        uint32 end = uint32(start + 60 * 60 + 1000);

        uint256 adId = adOwner.createAd{value : 0.01 ether}(inventoryId, hash, hashForDelivery, start, end);

        Assert.equal(adId, 1, "Ad can be created");

        uint256[] memory adIds;
        (adIds,,,,,) = adNetwork.getAdsOf(inventoryId);
        Assert.equal(adIds.length, 0, "Ad can be created, but it isn't still approved by inventory owner.");

        (adIds,,,,) = adNetwork.getAdsWaitingForApprovalOf(inventoryId);
        Assert.equal(adIds.length, 1, "Ad can be added to waiting list for approval");
    }

    function testFailedToCreateAdBecauseOfIllegalStartTime() public {
        uint256 inventoryId = 1;
        bytes32 hash = bytes32("encrypted and hashed ad data");
        bytes32 hashForDelivery = bytes32("encrypted and hashed ad data");
        uint32 start = uint32(block.timestamp + 60 * 60 * 12 - 1000);
        uint32 end = uint32(start + 60 * 60 + 1000);

        (bool r,) = address(deployedAddress)
        .call{value : 0.01 ether}(abi.encodeWithSelector(
                AdNetwork.createAd.selector,
                inventoryId, hash, hashForDelivery, start, end));

        Assert.isFalse(r, "start time must be larger than block.timestamp + about 12 hours");

        uint256[] memory adIds;
        (adIds,,,,) = adNetwork.getAdsWaitingForApprovalOf(inventoryId);
        Assert.equal(adIds.length, 1, "Ad can not be added if it meets required condition");
    }

    function testFailedToCreateAdBecauseOfLargerStartThanEnd() public {
        uint256 inventoryId = 1;
        bytes32 hash = bytes32("encrypted and hashed ad data");
        bytes32 hashForDelivery = bytes32("encrypted and hashed ad data");
        uint32 start = uint32(block.timestamp + 60 * 60 * 12 + 1000);
        uint32 end = uint32(start - 1000);

        (bool r,) = address(deployedAddress)
        .call{value : 0.01 ether}(abi.encodeWithSelector(
                AdNetwork.createAd.selector,
                inventoryId, hash, hashForDelivery, start, end));

        Assert.isFalse(r, "start time must be larger than block.timestamp + about 12 hours");

        uint256[] memory adIds;
        (adIds,,,,) = adNetwork.getAdsWaitingForApprovalOf(inventoryId);
        Assert.equal(adIds.length, 1, "Ad can not be added if it meets required condition");
    }

    function testFailedToCreateAdBecauseOfTooShortDeliveryPeriod() public {
        uint256 inventoryId = 1;
        bytes32 hash = bytes32("encrypted and hashed ad data");
        bytes32 hashForDelivery = bytes32("encrypted and hashed ad data");
        uint32 start = uint32(block.timestamp + 60 * 60 * 12 + 1000);
        uint32 end = uint32(start + 60 * 50);

        (bool r,) = address(deployedAddress)
        .call{value : 0.01 ether}(abi.encodeWithSelector(
                AdNetwork.createAd.selector,
                inventoryId, hash, hashForDelivery, start, end));

        Assert.isFalse(r, "delivery period must be not less than 1 hour");

        uint256[] memory adIds;
        (adIds,,,,) = adNetwork.getAdsWaitingForApprovalOf(inventoryId);
        Assert.equal(adIds.length, 1, "Ad can not be added if it meets required condition");
    }

    function testFailedToCreateAdBecauseOfAdPriceTooLow() public {
        uint256 inventoryId = 1;
        bytes32 hash = bytes32("encrypted and hashed ad data");
        bytes32 hashForDelivery = bytes32("encrypted and hashed ad data");
        uint32 start = uint32(block.timestamp + 60 * 60 * 12 + 1000);
        uint32 end = uint32(start + 60 * 60 + 1000);

        (bool r,) = address(deployedAddress)
        .call{value : 0.001 ether}(abi.encodeWithSelector(
                AdNetwork.createAd.selector,
                inventoryId, hash, hashForDelivery, start, end));

        Assert.isFalse(r, "ad price must be larger than floor price set by inventory owner.");

        uint256[] memory adIds;
        (adIds,,,,) = adNetwork.getAdsWaitingForApprovalOf(inventoryId);
        Assert.equal(adIds.length, 1, "Ad can not be added if it meets required condition");
    }

    function testFailedToApproveAdBecauseOfOperationFromNonOwner() public {
        uint256 inventoryId = 1;
        uint256 adId = 1;

        (bool r,) = address(deployedAddress)
        .call(abi.encodeWithSelector(
                AdNetwork.approveAd.selector,
                inventoryId, adId));

        Assert.isFalse(r, "ad mustn't be approved by non inventory owner.");
    }

    function testApproveAd() public {
        uint256 inventoryId = 1;
        uint256 adId = 1;

        inventoryOwner.approveAd(inventoryId, adId);

        uint256[] memory adIds;
        (adIds,,,,,) = adNetwork.getAdsOf(inventoryId);
        Assert.equal(adIds.length, 1, "Ad can be approved.");

        (adIds,,,,) = adNetwork.getAdsWaitingForApprovalOf(inventoryId);
        Assert.equal(adIds.length, 0, "Ad can be added to waiting list for approval");
    }

    function testCannotRejectAdAfterApprove() public {
        uint256 inventoryId = 1;
        uint256 adId = 1;

        (bool r,) = address(deployedAddress)
        .call(abi.encodeWithSelector(
                AdNetwork.rejectAd.selector,
                inventoryId, adId));

        Assert.isFalse(r, "ad mustn't be rejected after approval completion.");
    }

    function testRejectAd() public {
        uint256 inventoryId = 1;
        bytes32 hash = bytes32("encrypted and hashed ad2 data");
        bytes32 hashForDelivery = bytes32("encrypted and hashed ad data");
        uint32 start = uint32(block.timestamp + 60 * 60 * 12 + 1000);
        uint32 end = uint32(start + 60 * 60 + 1000);

        uint256 adId = adOwner.createAd{value : 0.01 ether}(inventoryId, hash, hashForDelivery, start, end);
        Assert.equal(adId, 2, "Ad can be created");

        uint256[] memory adIds;
        (adIds,,,,) = adNetwork.getAdsWaitingForApprovalOf(inventoryId);
        Assert.equal(adIds.length, 1, "Ad can be added to waiting list for approval");

        ////// set up

        inventoryOwner.rejectAd(inventoryId, adId);
        (adIds,,,,) = adNetwork.getAdsWaitingForApprovalOf(inventoryId);
        Assert.equal(adIds.length, 0, "Ad must be rejected");
    }

    function testGetInventory() public {
        (uint256 inventoryId,,,,,) = adNetwork.getInventory(1);
        Assert.equal(inventoryId, 1, "Inventories can be retrieve");
    }

    function testGetInventories() public {
        uint256[] memory inventoryIds;
        (inventoryIds,,,,,) = adNetwork.getInventories(0, 2);
        Assert.equal(inventoryIds.length, 1, "Inventories can be retrieve 2 items");

        (inventoryIds,,,,,) = adNetwork.getInventories(0, 1);
        Assert.equal(inventoryIds.length, 1, "Inventories can be retrieve 1 items");
    }

}

contract AdOwner {

    AdNetwork adNetwork;

    event PaybackReceived(uint value);

    constructor(AdNetwork _adNetwork) {
        adNetwork = _adNetwork;
    }

    function createAd(uint256 _inventoryId, bytes32 _hash, bytes32 _hashForDelivery, uint32 _start, uint32 _end) external payable returns (uint256) {
        return adNetwork.createAd{value : msg.value}(_inventoryId, _hash, _hashForDelivery, _start, _end);
    }

    function collectAd(uint256 _inventoryId, uint _adId) external {
        adNetwork.collectAd(_inventoryId, _adId);
    }

    receive() external payable {
        emit PaybackReceived(msg.value);
    }

}

contract InventoryOwner {

    AdNetwork adNetwork;

    event PaybackReceived(uint value);

    constructor(AdNetwork _adNetwork) {
        adNetwork = _adNetwork;
    }

    function createAdInventory(string memory name, string memory uri, string memory publicKey, uint256 floorPrice) external returns (uint256) {
        return adNetwork.createAdInventory(name, uri, publicKey, floorPrice);
    }

    function removeAdInventory(uint256 _inventoryId) external {
        adNetwork.removeAdInventory(_inventoryId);
    }

    function approveAd(uint256 _inventoryId, uint256 _adId) external {
        (bool r,) = address(adNetwork)
        .call(abi.encodeWithSelector(
                AdNetwork.approveAd.selector,
                _inventoryId, _adId));
        Assert.isTrue(r, "ad must be approved");
    }

    function rejectAd(uint256 _inventoryId, uint256 _adId) external {
        adNetwork.rejectAd(_inventoryId, _adId);
    }

    function collectAd(uint256 _inventoryId, uint _adId) external {
        adNetwork.collectAd(_inventoryId, _adId);
    }

    receive() external payable {
        emit PaybackReceived(msg.value);
    }

}