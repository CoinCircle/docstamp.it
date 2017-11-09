var moment = require('moment')
var DocStamp = artifacts.require('./DocStamp.sol')

function getLastEvent(instance) {
  return new Promise((resolve, reject) => {
    instance.allEvents()
    .watch((error, log) => {
      if (error) return reject(error)
      resolve(log)
    })
  })
}

contract('DocStamp', function(accounts) {
  it('should create a record', async function() {
    var account = accounts[0]

    try {
      var instance = await DocStamp.deployed()
      var hash = '7e5941f066b2070419995072dac7323c02d5ae107b23d8085772f232487fecae'

      await instance.stamp(hash)

      var eventObj = await getLastEvent(instance)
      assert.equal(eventObj.event, '_DocStamped')

      var stamper = await instance.getStamper(hash)
      assert.equal(stamper, account)
    } catch(error) {
      console.error(error)
      assert.equal(error, undefined)
    }
  })

  it('should fail if record already exists', async function() {
    var account = accounts[0]

    try {
      var instance = await DocStamp.deployed()
      var hash = '7e5941f066b2070419995072dac7323c02d5ae107b23d8085772f232487fecae'

      await instance.stamp(hash)
      var stamper = await instance.getStamper(hash)
      assert.notEqual(stamper, account)
    } catch(error) {
      console.error(error)
      assert.ok(error)
    }
  })

  it('should recover address from signature', async function() {
    var account = accounts[0]

    try {
      var instance = await DocStamp.deployed()
      var msg = '7e5941f066b2070419995072dac7323c02d5ae107b23d8085772f232487fecae'

      var h = web3.sha3(msg)
      var sig = web3.eth.sign(account, h);

      var result = await instance.ecrecovery.call(h, sig)
      assert.equal(result, account)
    } catch(error) {
      console.error(error)
      assert.equal(error, undefined)
    }
  })

  it('should verify signature', async function() {
    var account = accounts[0]

    try {
      var instance = await DocStamp.deployed()
      var msg = '7e5941f066b2070419995072dac7323c02d5ae107b23d8085772f232487fecae'

      var h = web3.sha3(msg)
      var sig = web3.eth.sign(account, h);
      var isSigner = await instance.verifySig.call(msg, sig)
      assert.ok(isSigner)
    } catch(error) {
      console.error(error)
      assert.equal(error, undefined)
    }
  })
})
