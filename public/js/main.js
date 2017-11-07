// TODO refactor+clean up

const wait = require('promise-wait')
const tc = require('truffle-contract')
const detectNetwork = require('web3-detect-network')

const source = require('../../build/contracts/DocStamp.json')

let instance = null
let account = null

// wait for MetaMask to inject script
window.addEventListener('load', onLoad)

if (!window.Promise) {
  alert('Promise support are required')
}

if (!window.FileReader) {
  alert('FileReader support is required')
}

if (!window.crypto) {
  alert('Browser crypto support is required')
}

const eventsLog = document.querySelector('#eventsLog')
const fileInput = document.querySelector('#file')
const hashField = document.querySelector('#hash')
const form = document.querySelector('#form')

form.addEventListener('submit', handleSubmit, false)
fileInput.addEventListener('change', handleFile, false)

const checkerForm = document.querySelector('#checkerForm')
const checkerFile = document.querySelector('#checkerFile')
const checkerHash = document.querySelector('#checkerHash')
const checkStamper = document.querySelector('#stamper')
checkerForm.addEventListener('submit', handleCheckForm, false)

function handleCheckForm (event) {
  event.preventDefault()

  const file = checkerFile.files[0]

  file2Buffer(file)
  .then(function(buffer) {
    return sha256(buffer)
  })
  .then(async (hash) => {
    checkerHash.value = hex(hash)

    try {
      const stamper = await instance.getStamper(hex(hash), {from: account})
      debugger
      checkStamper.value = stamper
    } catch (error) {
      alert(error)
    }

  })
}

function handleSubmit (event) {
  event.preventDefault()

  if (!account) {
    alert('Please connect MetaMask account')
    return false
  }

  const hash = fileInput.value

  stampDoc(hash)
}

async function stampDoc (hash) {
  try {
    const value = await instance.stamp(hash, {from: account})
    debugger
    alert('stamped')
  } catch (error) {
    alert(error)
  }
}

function getProvider () {
  if (window.web3) {
    return window.web3.currentProvider
  }

  const providerUrl = 'https://rinkeby.infura.io:443'
  const provider = new window.Web3.providers.HttpProvider(providerUrl)

  return provider
}

function getAccount () {
  if (window.web3) {
    return window.web3.defaultAccount || window.web3.eth.accounts[0]
  }
}

function setUpEvents () {
  instance.allEvents({fromBlock: 0, toBlock: 'latest'})
  .watch(function (error, log) {
    if (error) {
      console.error(error)
      return false
    }
    console.log(log)

    const name = log.event
    const args = log.args

    eventsLog.innerHTML += `<li>${name} ${JSON.stringify(args)}</li>`
  })
}

async function init () {
  contract = tc(source)

  // wait for web3 to load
  await wait(1000)
  provider = getProvider()
  contract.setProvider(provider)

  const {id:netId, type:netType} = await detectNetwork(provider)
  if (netType !== 'rinkeby') {
    //alert('Please connect to the Rinkeby testnet')
  }

  instance = await contract.deployed()
  account = getAccount()
}

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

function handleFile (event) {
  const file = event.target.files[0]

  file2Buffer(file)
  .then(function(buffer) {
    return sha256(buffer)
  })
  .then(function(hash) {
    handleHash(hex(hash))
  })
}

function handleHash (hex) {
  hashField.value = hex
}

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
