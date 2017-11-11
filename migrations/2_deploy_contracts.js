var DocStamp = artifacts.require("./DocStamp.sol");
var ECVerify = artifacts.require("./ECVerify.sol");

module.exports = function(deployer) {
  //deployer.deploy(ECVerify);
  //deployer.link(ECVerify, DocStamp);
  deployer.deploy(DocStamp);
};
