// TODO refactor+clean up

const moment = require('moment')
const wait = require('promise-wait')
const tc = require('truffle-contract')
const detectNetwork = require('web3-detect-network')
const {soliditySHA3} = require('ethereumjs-abi')
const {sha3} = require('ethereumjs-util')
const Buffer = require('buffer/').Buffer

const source = require('../../build/contracts/DocStamp.json')

let instance = null
let account = null

/**
 * ON LOAD
 */

// wait for MetaMask to inject script
window.addEventListener('load', onLoad)

async function onLoad () {
  try {
    await init()

    if (getAccount()) {
      setUpEvents()
    } else {
      // TODO: not use innerHTML
      //publisherInfo.innerHTML = `Please install or unlock MetaMask to update your list of sellers`
    }
  } catch (error) {
    alert(error.message)
  }
}

async function init () {
  contract = tc(source)

  // wait for web3 to load
  await wait(1000)
  provider = getProvider()
  contract.setProvider(provider)

  const {id:netId, type:netType} = await detectNetwork(provider)
  if (netType !== 'rinkeby') {
    alert('Please connect to the Rinkeby testnet')
  }

  instance = await contract.deployed()
  account = getAccount()

  if (!window.web3) {
    window.web3 = new window.Web3(provider)
  }
}

/**
 * PROVIDER
 */

function getProvider () {
  if (window.web3) {
    return window.web3.currentProvider
  }

  const providerUrl = 'https://rinkeby.infura.io:443'
  const provider = new window.Web3.providers.HttpProvider(providerUrl)

  return provider
}

function getWebsocketProvider () {
  // https://github.com/ethereum/web3.js/issues/1119
  if (!window.Web3.providers.WebsocketProvider.prototype.sendAsync) {
    window.Web3.providers.WebsocketProvider.prototype.sendAsync = window.Web3.providers.WebsocketProvider.prototype.send
  }

  return new window.Web3.providers.WebsocketProvider('wss://rinkeby.infura.io/ws')
}

function getAccount () {
  if (window.web3) {
    return window.web3.defaultAccount || window.web3.eth.accounts[0]
  }
}

/**
 * LOGS
 */

async function setUpEvents () {
var Web3WsProvider = require('web3-providers-ws');

  var ws = new Web3WsProvider('wss://rinkeby.infura.io/ws');
  ws.sendAsync = ws.send
  const contract = tc(source)
  const provider = ws //getWebsocketProvider()
  contract.setProvider(provider)

  const instance = await contract.deployed()

  instance.allEvents({fromBlock: 0, toBlock: 'latest'})
  .watch(function (error, log) {
    if (error) {
      console.error(error)
      return false
    }

    handleLog(log)
  })
}

function handleLog(log) {
  const name = log.event
  const args = log.args

  eventsLog.innerHTML += `<li>${name} ${JSON.stringify(args)}</li>`
}

if (!window.Promise) {
  alert('Promise support is required')
}

if (!window.FileReader) {
  alert('FileReader support is required')
}

if (!window.crypto) {
  alert('Browser crypto support is required')
}

const eventsLog = document.querySelector('#eventsLog')

/**
 * STAMP FORM
 */

const stampFileInput = document.querySelector('#stampFile')
const stampOutHash = document.querySelector('#stampHash')
const stampForm = document.querySelector('#stampForm')

stampFileInput.addEventListener('change', handleStampFile, false)
stampForm.addEventListener('submit', handleStampForm, false)

async function handleStampFile (event) {
  stampOutHash.value = ''
  const file = event.target.files[0]

  var buffer = await file2Buffer(file)
  var hash = web3.sha3(hex(await sha256(buffer)))
  stampOutHash.value = hash
}

async function handleStampForm (event) {
  event.preventDefault()
  var target = event.target

  if (!account) {
    alert('Please connect MetaMask account set to Rinkeby network')
    return false
  }

  const hash = stampOutHash.value

  if (!hash) {
    alert('Please select the document')
    return false
  }

  target.classList.toggle('loading', true)
  await stampDoc(hash)
  target.classList.toggle('loading', false)
}

async function stampDoc (hash) {
  try {
    const exists = await instance.exists(hash, {from: account})

    if (exists) {
      alert('This document already exists as being stamped')
      return false
    }

    const value = await instance.stamp(hash, {from: account})
    alert('Successfully stamped document')
  } catch (error) {
    alert(error)
  }
}

/**
 * STAMP CHECK FORM
 */

const checkForm = document.querySelector('#checkForm')
const checkFile = document.querySelector('#checkFile')
const checkHash = document.querySelector('#checkHash')
const checkStamper = document.querySelector('#checkStamper')
const checkDatetime = document.querySelector('#checkDatetime')
checkFile.addEventListener('change', handleCheckFile, false)
checkForm.addEventListener('submit', handleCheckForm, false)

async function handleCheckFile (event) {
  checkHash.value = ''
  const file = event.target.files[0]

  var buffer = await file2Buffer(file)
  var hash = web3.sha3(hex(await sha256(buffer)))
  checkHash.value = hash
}

async function handleCheckForm (event) {
  event.preventDefault()

  checkStamper.value = ''
  checkDatetime.value = ''

  const hash = checkHash.value

  if (!hash) {
    alert('Please select the document')
    return false
  }

  const exists = await instance.exists(hash, {from: account})

  if (!exists) {
    alert('Document does not exist in smart contract')
    return false
  }

  try {
    const stamper = await instance.getStamper(hash, {from: account})
    const timestamp = await instance.getTimestamp(hash, {from: account})
    const date = moment.unix(timestamp).format('YYYY-MM-DD hh:mmA')

    checkStamper.value = stamper
    checkDatetime.value = date
  } catch (error) {
    alert(error)
  }
}

/**
 * STAMP GEN SIG FORM
 */

const genSigForm = document.querySelector('#genSigForm')
const genSigFile = document.querySelector('#genSigFile')
const genSigHash = document.querySelector('#genSigHash')
genSigForm.addEventListener('submit', handleGenSigForm, false)

async function handleGenSigForm (event) {
  event.preventDefault()

  genSigHash.value = ''
  const file = genSigFile.files[0]

  var buffer = await file2Buffer(file)
  var hash = web3.sha3(hex(await sha256(buffer)))

  const exists = await instance.exists(hash, {from: account})

  if (!exists) {
    alert('Please stamp document before generating signature')
    return false
  }

  if (!account) {
    alert('Please connect MetaMask account set to Rinkeby network')
    return false
  }

  const stamper = await instance.getStamper(hash, {from: account})

  if (stamper !== account) {
    alert('You are not the stamper of this document')
    return false
  }

  web3.eth.sign(account, hash, (error, sig) => {
    genSigHash.value = sig
  });
}


/**
 * STAMP VERIFY SIG FORM
 */

const verifySigForm = document.querySelector('#verifySigForm')
const verifySigFile = document.querySelector('#verifySigFile')
const verifySigInput = document.querySelector('#verifySigInput')
const verifySigOut = document.querySelector('#verifySigOut')
verifySigForm.addEventListener('submit', handleVerifySigForm, false)

async function handleVerifySigForm (event) {
  event.preventDefault()

  verifySigOut.innerHTML = ''
  const file = verifySigFile.files[0]

  const buffer = await file2Buffer(file)
  const hash = web3.sha3(hex(await sha256(buffer)))
  const sig = verifySigInput.value

  const exists = await instance.exists(hash, {from: account})

  if (!exists) {
    alert('There is no record for this document')
    return false
  }

  if (!sig) {
    alert('Please input signature string')
    return false
  }

  const addr = await instance.getStamper(hash)
  const isSigner = await instance.ecverify(hash, sig, addr, {from: account})

  var output = `<span class="red">✘ ${addr} <strong>IS NOT</strong> signer of ${hash}</span>`

  if (isSigner) {
    output = `<span class="green">✔ ${addr} <strong>IS</strong> signer of ${hash}</span>`
  }

  verifySigOut.innerHTML = output
}

/**
 * HELPERS
 */

function file2Buffer (file) {
  return new Promise(function (resolve, reject) {
    const reader = new FileReader()
    const readFile = function(event) {
      const buffer = reader.result
      resolve(buffer)
    }

    reader.addEventListener('load', readFile)
    reader.readAsArrayBuffer(file)
  })
}

function sha256 (buffer) {
 return crypto.subtle.digest('SHA-256', buffer).then(function(hash) {
   return hash
  })
}

function hex (buffer) {
  var digest = ''
  var view = new DataView(buffer)
  for(var i = 0; i < view.byteLength; i += 4) {
    // We use getUint32 to reduce the number of iterations (notice the `i += 4`)
    var value = view.getUint32(i)
    // toString(16) will transform the integer into the corresponding hex string
    // but will remove any initial "0"
    var stringValue = value.toString(16)
    // One Uint32 element is 4 bytes or 8 hex chars (it would also work with 4
    // chars for Uint16 and 2 chars for Uint8)
    var padding = '00000000'
    var paddedValue = (padding + stringValue).slice(-padding.length)
    digest += paddedValue
  }

  return digest
}
