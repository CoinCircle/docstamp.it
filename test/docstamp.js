const moment = require('moment')
const {sha3} = require('ethereumjs-util')

const DocStamp = artifacts.require('./DocStamp.sol')

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
    const account = accounts[0]

    try {
      const instance = await DocStamp.deployed()
      const msg = '7e5941f066b2070419995072dac7323c02d5ae107b23d8085772f232487fecae'
      const hash = web3.sha3(msg)

      await instance.stamp(hash)

      const eventObj = await getLastEvent(instance)
      assert.equal(eventObj.event, '_DocStamped')

      const stamper = await instance.getStamper(hash)
      assert.equal(stamper, account)
    } catch(error) {
      //console.error(error)
      assert.equal(error, undefined)
    }
  })

  it('should fail if record already exists', async function() {
    const account = accounts[0]

    try {
      const instance = await DocStamp.deployed()
      const msg = '7e5941f066b2070419995072dac7323c02d5ae107b23d8085772f232487fecae'
      const hash = web3.sha3(msg)

      await instance.stamp(hash)
      const stamper = await instance.getStamper(hash)
      assert.notEqual(stamper, account)
    } catch(error) {
      //console.error(error)
      assert.ok(error)
    }
  })

  it('should recover address from signature', async function() {
    const account = accounts[0]

    try {
      const instance = await DocStamp.deployed()
      let msg = '7e5941f066b2070419995072dac7323c02d5ae107b23d8085772f232487fecae'
      const hash = web3.sha3(msg)
      msg = new Buffer(hash.slice(2), 'hex')
      const sig = web3.eth.sign(account, hash)
      const prefix = Buffer.from('\x19Ethereum Signed Message:\n');
      const pmsg = `0x${sha3(Buffer.concat([prefix, Buffer.from(String(msg.length)), msg])).toString('hex')}`

      const recoveredAccount = await instance.ecrecovery(pmsg, sig)
      assert.equal(recoveredAccount, account)

      const acct = await instance.getStamper(hash)
      const isSigner = await instance.ecverify(pmsg, sig, acct)
      assert.equal(isSigner, true)
    } catch(error) {
      //console.error(error)
      assert.equal(error, undefined)
    }
  })
})
