pragma solidity ^0.4.4;

import './Ownable.sol';

contract DocStamp is Ownable {
  mapping (bytes32 => address) public records;

  event _DocStamped(bytes32 indexed record, address indexed stamper);

  function stamp(string record) external {
    bytes32 hash = sha3(record);
    require(hash != sha3(""));
    require(records[hash] == address(0));
    records[hash] = msg.sender;

    _DocStamped(hash, msg.sender);
  }

  function getStamper(string record) constant returns (address) {
    return records[sha3(record)];
  }

  function didStamp(string record) constant returns (bool) {
    return records[sha3(record)] == msg.sender;
  }

  function isStamper(string record, address stamper) constant returns (bool) {
    return records[sha3(record)] == stamper;
  }
}
