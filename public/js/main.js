// TODO refactor+clean up

const moment = require('moment')
const wait = require('promise-wait')
const tc = require('truffle-contract')
const detectNetwork = require('web3-detect-network')
const {soliditySHA3} = require('ethereumjs-abi')
const {sha3} = require('ethereumjs-util')
const Buffer = require('buffer/').Buffer
const Web3WsProvider = require('web3-providers-ws')
const arrayBufferToBuffer = require('arraybuffer-to-buffer')

const source = require('../../build/contracts/DocStamp.json')

let instance = null
let account = null

let addresses = {
  mainnet: '0xd749c968399b8cbdf2ce95d1f87c1c38157c579a',
  rinkeby: '0x3b41bc65821962b9ac60c8151ba0ae593e4e3078'
}

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

let network = 'mainnet'

async function init () {
  contract = tc(source)

  // wait for web3 to load
  await wait(1000)

  const {id:netId, type:netType} = await detectNetwork(getProvider())
  if (!(netType === 'mainnet' || netType === 'rinkeby')) {
    alert('Only Mainnet or Rinkeby Testnet is currencly supported')
  } else {
    network = netType
  }

  provider = getProvider()
  contract.setProvider(provider)

  contractAddress = addresses[network]

  document.querySelector('#networkType').innerHTML = network
  document.querySelector('#etherscanLink').href = `https://${network === 'mainnet' ? '' : `${network}.`}etherscan.io/address/${contractAddress}`

  instance = await contract.at(contractAddress)
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

  const providerUrl = `https://${network}.infura.io:443`
  const provider = new window.Web3.providers.HttpProvider(providerUrl)

  return provider
}

function getWebsocketProvider () {
  // https://github.com/ethereum/web3.js/issues/1119
  if (!window.Web3.providers.WebsocketProvider.prototype.sendAsync) {
    window.Web3.providers.WebsocketProvider.prototype.sendAsync = window.Web3.providers.WebsocketProvider.prototype.send
  }

  return new window.Web3.providers.WebsocketProvider(`wss://${network}.infura.io/ws`)
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

  const ws = new Web3WsProvider(`wss://${network}.infura.io/ws`);
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
  const hash = await fileToSha3(file)

  stampOutHash.value = hash
}

async function handleStampForm (event) {
  event.preventDefault()
  const target = event.target

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

  const hash = await fileToSha3(file)
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
  const hash = await fileToSha3(file)

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

  const hash = await fileToSha3(file)
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

  let output = `<span class="red">✘ ${addr} <strong>IS NOT</strong> signer of ${hash}</span>`

  if (isSigner) {
    output = `<span class="green">✔ ${addr} <strong>IS</strong> signer of ${hash}</span>`
  }

  verifySigOut.innerHTML = output
}

/**
 * HELPERS
 */

function fileToBuffer (file) {
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

async function bufferToSha3 (buffer) {
  return `0x${sha3(buffer).toString('hex')}`
}

async function fileToSha3 (file) {
  const buffer = await fileToBuffer(file)
  const hash = bufferToSha3(arrayBufferToBuffer(buffer))

  return hash
}

