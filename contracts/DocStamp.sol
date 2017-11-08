pragma solidity ^0.4.4;

import './Ownable.sol';

contract DocStamp is Ownable {
  mapping (bytes32 => address) public records;
  mapping (bytes32 => uint256) public timestamps;

  event _DocStamped(bytes32 indexed record, address indexed stamper, uint256 timestamp);

  function stamp(string record) external {
    bytes32 hash = sha3(record);
    require(hash != sha3(""));
    require(records[hash] == address(0));
    require(timestamps[hash] == 0);
    records[hash] = msg.sender;
    timestamps[hash] = block.timestamp;

    _DocStamped(hash, msg.sender, block.timestamp);
  }

  function exists(string record) constant returns (bool) {
    bytes32 hash = sha3(record);
    return records[hash] != address(0);
  }

  function getStamper(string record) constant returns (address) {
    return records[sha3(record)];
  }

  function getTimestamp(string record) constant returns (uint256) {
    return timestamps[sha3(record)];
  }

  function didStamp(string record) constant returns (bool) {
    return records[sha3(record)] == msg.sender;
  }

  function isStamper(string record, address stamper) constant returns (bool) {
    return records[sha3(record)] == stamper;
  }

  function verifySig(string record, bytes sig) returns (bool) {
    bytes32 hash = sha3(record);
    require(hash != sha3(""));
    require(sig.length != 0);

    return records[hash] == ecrecovery(hash, sig);
  }

  // https://ethereum.stackexchange.com/a/7807/5093
  function ecrecovery(bytes32 hash, bytes sig) returns (address) {
    bytes32 r;
    bytes32 s;
    uint8 v;

    if (sig.length != 65)
      return 0;

    // The signature format is a compact form of:
    //   {bytes32 r}{bytes32 s}{uint8 v}
    // Compact means, uint8 is not padded to 32 bytes.
    assembly {
      r := mload(add(sig, 32))
      s := mload(add(sig, 64))

      // Here we are loading the last 32 bytes. We exploit the fact that
      // 'mload' will pad with zeroes if we overread.
      // There is no 'mload8' to do this, but that would be nicer.
      v := byte(0, mload(add(sig, 96)))

      // Alternative solution:
      // 'byte' is not working due to the Solidity parser, so lets
      // use the second best option, 'and'
      // v := and(mload(add(sig, 65)), 255)
    }

    // albeit non-transactional signatures are not specified by the YP, one would expect it
    // to match the YP range of [27, 28]
    //
    // geth uses [0, 1] and some clients have followed. This might change, see:
    //  https://github.com/ethereum/go-ethereum/issues/2053
    if (v < 27)
      v += 27;

    if (v != 27 && v != 28)
      return 0;

    // signed message require this prefix in Ethereum
    bytes memory prefix = "\x19Ethereum Signed Message:\n32";
    bytes32 prefixedHash = sha3(prefix, hash);
    return ecrecover(prefixedHash, v, r, s);
  }
}
