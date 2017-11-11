pragma solidity ^0.4.4;

import './Ownable.sol';
//import "./ECVerify.sol";

contract DocStamp is Ownable {
  mapping (bytes32 => address) public records;
  mapping (bytes32 => uint256) public timestamps;

  event _DocStamped(bytes32 indexed record, address indexed stamper, uint256 timestamp);

  function stamp(bytes32 record) external {
    bytes32 hash = sha3(record);
    require(hash != sha3(""));
    require(records[hash] == address(0));
    require(timestamps[hash] == 0);
    records[hash] = msg.sender;
    timestamps[hash] = block.timestamp;

    _DocStamped(hash, msg.sender, block.timestamp);
  }

  function exists(bytes32 record) constant returns (bool) {
    bytes32 hash = sha3(record);
    return records[hash] != address(0);
  }

  function getStamper(bytes32 record) constant returns (address) {
    return records[sha3(record)];
  }

  function getTimestamp(bytes32 record) constant returns (uint256) {
    return timestamps[sha3(record)];
  }

  function didStamp(bytes32 record) constant returns (bool) {
    return records[sha3(record)] == msg.sender;
  }

  function isStamper(bytes32 record, address stamper) constant returns (bool) {
    return records[sha3(record)] == stamper;
  }

  function ecrecovery(bytes32 hash, bytes sig) public constant returns (address) {
    bytes32 r;
    bytes32 s;
    uint8 v;

    if (sig.length != 65) {
      return 0;
    }

    assembly {
      r := mload(add(sig, 32))
      s := mload(add(sig, 64))
      v := and(mload(add(sig, 65)), 255)
    }

    // https://github.com/ethereum/go-ethereum/issues/2053
    if (v < 27) {
      v += 27;
    }

    if (v != 27 && v != 28) {
      return 0;
    }

    return ecrecover(hash, v, r, s);
  }

  function ecverify(bytes32 hash, bytes sig, address signer) public constant returns (bool) {
    return signer == ecrecovery(hash, sig);
  }

  function bytesToAddress(bytes _address) public returns (address) {
    uint160 m = 0;
    uint160 b = 0;

    for (uint8 i = 0; i < 20; i++) {
      m *= 256;
      b = uint160(_address[i]);
      m += (b);
    }

    return address(m);
  }
}
