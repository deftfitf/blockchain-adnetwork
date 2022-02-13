// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

library AdNetworkSet {

    struct InventorySet {
        Inventory[] _values;
        mapping(uint256 => uint256) _idxMapping;
    }

    struct Inventory {
        uint256 inventoryId;
        address payable owner;
        string name;
        string uri;
        string publicKey;
        uint256 floorPrice;
    }

    function add(InventorySet storage set, uint256 _inventoryId, Inventory memory _inventory) internal returns (bool) {
        if (!contains(set, _inventoryId)) {
            set._values.push(_inventory);
            set._idxMapping[_inventoryId] = set._values.length;
            return true;
        } else {
            return false;
        }
    }

    function get(InventorySet storage set, uint _inventoryId) internal view returns (Inventory storage) {
        uint256 idx = set._idxMapping[_inventoryId];
        require(idx != 0, "requested inventoryId does not exist");
        return set._values[idx - 1];
    }

    function contains(InventorySet storage set, uint256 _inventoryId) internal view returns (bool) {
        return set._idxMapping[_inventoryId] != 0;
    }

    function remove(InventorySet storage set, uint256 _inventoryId) internal returns (bool) {
        uint256 idx = set._idxMapping[_inventoryId];
        if (idx != 0) {
            uint256 deleteIdx = idx - 1;
            uint256 lastIdx = set._values.length - 1;

            if (lastIdx != deleteIdx) {
                Inventory storage lastInventory = set._values[lastIdx];

                set._values[deleteIdx] = lastInventory;
                set._idxMapping[lastInventory.inventoryId] = deleteIdx;
            }

            set._values.pop();
            delete set._idxMapping[_inventoryId];

            return true;
        }

        return false;
    }

    struct AdSet {
        Ad[] _values;
        mapping(uint256 => uint256) _idxMapping;
    }

    struct Ad {
        uint256 adId;
        uint256 inventoryId;
        address payable owner;
        bytes32 hash;
        bytes32 hashForDelivery;
        uint32 start;
        uint32 end;
        uint256 price;
    }

    function add(AdSet storage set, uint256 _adId, Ad memory _ad) internal returns (bool) {
        if (!contains(set, _adId)) {
            set._values.push(_ad);
            set._idxMapping[_adId] = set._values.length;
            return true;
        } else {
            return false;
        }
    }

    function contains(AdSet storage set, uint256 _adId) internal view returns (bool) {
        return set._idxMapping[_adId] != 0;
    }

    function get(AdSet storage set, uint _adId) internal view returns (Ad storage) {
        uint256 idx = set._idxMapping[_adId];
        require(idx != 0, "requested adId does not exist");
        return set._values[idx - 1];
    }

    function remove(AdSet storage set, uint256 _adId) internal returns (bool) {
        uint256 idx = set._idxMapping[_adId];
        if (idx != 0) {
            uint256 deleteIdx = idx - 1;
            uint256 lastIdx = set._values.length - 1;

            if (lastIdx != deleteIdx) {
                Ad storage lastInventory = set._values[lastIdx];

                set._values[deleteIdx] = lastInventory;
                set._idxMapping[lastInventory.adId] = deleteIdx;
            }

            set._values.pop();
            delete set._idxMapping[_adId];

            return true;
        }

        return false;
    }

}
