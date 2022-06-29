"use strict"
/**
 * Get the node type of the current ardor node
 * @param {string} node Ardor server URL
 * @return {Promise<boolean>} weather it's testnet or not
 */
const getState = function (node) {
  return window.fetch(node + '/nxt?requestType=getState', {
    method: "GET"
  }).then(res => res.json())
    .then(res => res.isTestnet)
} //func getState

const searchAccountAlias = async function(node, account) {
  let alias = await getAccountAlias(node, account);

  if(alias) {
    return alias;
  } else {
    return await getMasterAccountAlias(node, account);
  }
}
const getAccountAlias = function (node, account) {
  return getRequest(`${node}/nxt?requestType=getAliases&chain=ignis&account=${account}`).then(result => {
    if (result.aliases) {
      let found = false, aliasName, uri;
      for (let alias of result.aliases) {
        const pattern = "acct:" + account.toLowerCase() + "@nxt";
        aliasName = alias.aliasName;
        uri = alias.aliasURI;
        if (uri === pattern) {
          found = true;
          break;
        }
      }
      if (found) {
        return aliasName;
      } else {
        return '';
      }
    }
  });
}

const getMasterAccountAlias = function (node, account) {
  const masterArdor = 'COIN-XXXX-XXXX-5496-B3YAC';
  return getRequest(`${node}/nxt?requestType=getAliases&chain=ignis&account=${masterArdor}`).then(result => {
    if (result.aliases) {
      let found = false, aliasName, uri;
      for (let alias of result.aliases) {
        const pattern = "acct:" + account.toLowerCase() + "@nxt";
        aliasName = alias.aliasName;
        uri = alias.aliasURI;
        if (uri.toLowerCase() === pattern) {
          found = true;
          break;
        }
      }
      if (found) {
        return aliasName;
      } else {
        return '';
      }
    }
  });
}

/**
 * Convert the buffer to hext string
 * @param {ArrayBuffer} buff
 * @return {string}
 */
const encode64 = function (buff) {
  const hashArray = Array.from(new Uint8Array(buff));

  const hashHex = hashArray.map(b => ('00' + b.toString(16)).slice(-2)).join('');
  return hashHex;
} //func encode64

/**
 * check to see if browser has the builtin function crypto and TextEncoder
 * @return {boolean}
 */
const supportHasing = function () {
  return window.crypto && crypto.subtle && window.TextEncoder;
} //func supportHasing

/**
 * SHA-256 hashing
 * @param {string} str
 * @return {Promise<ArrayBuffer>}
 */
const hash256 = function (str) {
  if (!supportHasing) return '';
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
} //func hash

/**
 * SHA-256 hashing and convert to base64
 * @param {string} url
 * @return {Promise<string>}
 */
const hashUrl = async function (url) {
  return encode64(await hash256(url)).replace(/[^a-z0-9]/gi, '_');
} //func hashUrl

/**
 * Hash and return the url of the old goFundMe domain + new domain
 * @param {string} url Current URL
 * @param {string} currentHash Current Hashed URL
 * @return {Promise<array>}
 */
const getUrlHash = async function (url, currentHash) {
  const urlObj = new URL(url);
  const path = urlObj.pathname.split('/').pop();
  const oldURL = `${urlObj.origin}/${path}`;

  if (!url.includes('gofundme') || oldURL === url) {
    return [currentHash];
  } else {
    const newHash = await hashUrl(oldURL);
    return [currentHash, newHash];
  }
}

/**
 * Hash URL for searchTaggedData api
 * @param {object} urls list of url that need to be turned into hash as query
 * @return {Promise<object>}
 */
const getQueries = async function (urls) {
  if(typeof urls !== 'object') throw 'Failed getting Queries, input is not an array.';

  let queries = {}

  for (let url in urls) {
    queries[url] = await hashUrl(urls[url]);
  }

  return queries;
}

/**
 * Attempt JSON parse
 * return the original note body if it's not a JSON
 * Use this as a way to determine the note body format, them
 * write a wrapper function to format the final result and print t to the screen
 * @param {object} note note body from searchTaggedData
 * @param {string} sender
 * @param {string} masterAccount
 * @param {string} arodrNode
 */
const cleanUpNote = async function (note, sender, masterAccount, ardorNode) {
  try {
    if(sender !== masterAccount) throw 'Note not from master account';

    const noteObject = JSON.parse(note);

    const { message='', account, amount, coin, time = new Date().toDateString() } = noteObject;
    let formatted = scientificToDecimal(amount)

    let alias = await searchAccountAlias(ardorNode, noteObject.account);
    let acctInfo = `<span class="account">${account}</span>`
    if (alias.length) {
      alias = alias.replace(alias[0],alias[0].toUpperCase());
      acctInfo = `<div class="alias"><span class="alias-name">@${alias}</span></div>`;
    }
    const coinLabel = coin;

    return { coinLabel, acctInfo, formatted, time, message };
  } catch (error) {
    console.log(error)
  }

  return note;
}

/**
 * check if the given node is valid and it's online
 * @param {string} node Ardor server URL
 * @return {Promise<object>} response of the API call
 */
const validateNode = function (node) {
  return window.fetch(node + '/nxt?requestType=getBlockchainStatus', {
    method: 'GET'
  }).then(res => res.json());
} //func validateNode

/**
 * get the node type of the current Ardor Server URL
 * @param {string} node Ardor server URL
 * @return {Promise<string>} Testnet/Mainnet
 */
const getNodeType = async function (node) {
  const isTestNet = await getState(node);

  const nodeType = isTestNet ? 'Testnet' : 'Mainnet';
  return nodeType;
} //func nodeType

/**
 * get the server timestamp
 * @param {string} node Ardor server URL
 * @return {Promise<string>} timestamp
 */
const getTimeStamp = function (node) {
  return fetch(`${node}/nxt?requestType=getBlockchainStatus`, { method: 'get' })
    .then(res => res.json())
    .then(res => { return res.time });
}//func getTimeStamp

/**
 * get get block height of the timestamp
 * @param {string} node Ardor server URL
 * @param {string} timestamp timestamp of the transaction
 * @return {Promise<string>} block height
 */
const getCurrentBlockByTimestamp = function (node, timestamp) {
  return window.fetch(`${node}/nxt?requestType=getBlock&timestamp=${timestamp}`, {
    method: 'GET'
  }).then(res => res.json())
    .then(res => res.block);
}//func getCurrentBlockByTimestamp

/**
 * check if the current transaction is older than our custom timestamp
 * @param {string} nodeType Testnet/Mainnet
 * @param {string} customTime custom set timestamp
 * @param {string} blockTime timestamp of the transaction
 * @return {boolean}
 */
const transactionIsOlderThanSetTime = function (nodeType = 'Testnet', customTime, blockTime) {
  if (!customTime) return false;

  const genesisBlockTime = (nodeType === 'Mainnet') ? 1514764800 : 1514296800;
  return (moment.unix(+blockTime + genesisBlockTime).format() < moment.unix(customTime).format());
}//func transactionIsOlderThanSetTime

const getTimeByTimezone = function (timestamp, timezone = moment.tz.guess(), nodeType = 'Testnet') {
  const genesisBlockTime = (nodeType === 'Mainnet') ? 1514764800 : 1514296800;
  return moment.unix(+timestamp + genesisBlockTime).tz(timezone).format('YYYY MMM, DD hh:mm A - z');
}

/**
 * get the current time. Ex: "Wed, Sep 11, 2019 5:16 PM "
 * @return {date}
 */
const getCurrentTime = function () {
  return moment().format('llll z');
}

/**
 * strip out any querystring or subpath in a link and returns only the portocal+hostname
 * @param {string} url link
 * @return {string} protocal+hostname
 */
const getUrlHostName = function (url) {
  const a = document.createElement('a');
  a.href = url;

  return a.origin;
} //func getUrlHostName

/**
 * Refactor the date to have {MM DD, YYYY - TIME EST}
 * @return {string} formatted date
 * @return {string}
 */
const getDateFormatted = function () {
  // return current time if timestamp is undefined
  const dateObject = new Date(),
    time = dateObject.toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });

  const m_d_y = dateObject.customDateFormat();

  return `${m_d_y} - ${time} EST`;
} //func getDateFormatted

/**
 * Convert the ardor timestamp to modern time with format {MM DD, YYYY - TIME EST}
 * @param {string} timestamp timestamp of the transaction
 * @param {string} nodeType Testnet/Mainnet
 * @return {string}
 */
const getArdorDateFormatted = function (timestamp, nodeType = "Testnet") {
  if (typeof timestamp === "undefined") return 0;

  // TODO: Setting both EPOCH time the same, but ideally we can remove Testnet
  // Since we are only going to use Mainnet for Annex network
  const EPOCH_BEGINNING = {
    Testnet: 1614340800000 - 500,
    Mainnet: 1614340800000 - 500
  }

  const dateObject = new Date(timestamp * 1000 + EPOCH_BEGINNING[nodeType]),
    time = dateObject.toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });

  const m_d_y = dateObject.customDateFormat();

  return `${m_d_y} - ${time} EST`;
} //func getDateFormatted

Date.prototype.customDateFormat = function () {
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "June", "July", "Aug", "Sept", "Oct", "Nov", "Dec"];

  const day = this.getDate();
  const year = this.getFullYear();
  return `${monthNames[this.getMonth()]} ${day}, ${year}`;
}
/**
 * Hide/Show for all notes marked 'global'
 * @param {string} action
 */
const toggleGlobalNotes = function (action) {
  const $globalNotes = document.querySelectorAll('.global');
  for (const note of $globalNotes) {
    note.style.display = action === 'hide' ? 'none' : 'table-row';
  }
} //function toggleGlobalNotes

const loadScript = function (file) {
  var fileref = document.createElement('script')
  fileref.setAttribute("type", "text/javascript")
  fileref.setAttribute("src", file)
  if (!document.querySelector(`script[src="${file}"]`) && typeof fileref != "undefined") document.getElementsByTagName("head")[0].appendChild(fileref);
} //func loadScript

// Helper function that returns a GET request with JSON format
const getRequest = function (request) {
  return window.fetch(request, {
    method: 'GET'
  }).then(res => res.json());
} //func getRequestResponse

const attemptJSONParse = function (object) {
  try {
    return JSON.parse(object);
  } catch {
    return object;
  }
} //func attemptJSONParse

const escapeHTML = function (string) {
  var pre = document.createElement('pre');
  var text = document.createTextNode(string);
  pre.appendChild(text);
  return pre.innerHTML;
} //func escapeHTML


const sortTable = function (table, n) {
  var rows, switching, i, x, y, shouldSwitch, dir, switchcount = 0;
  switching = true;
  dir = "asc";
  while (switching) {
    switching = false;
    rows = table.rows;
    for (i = 1; i < (rows.length - 1); i++) {
      shouldSwitch = false;
      x = rows[i].getElementsByTagName("TD")[n];
      y = rows[i + 1].getElementsByTagName("TD")[n];
      if (dir == "asc") {
        if (x.innerHTML.toLowerCase() > y.innerHTML.toLowerCase()) {
          shouldSwitch = true;
          break;
        }
      } else if (dir == "desc") {
        if (x.innerHTML.toLowerCase() < y.innerHTML.toLowerCase()) {
          shouldSwitch = true;
          break;
        }
      }
    }
    if (shouldSwitch) {
      rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
      switching = true;
      switchcount++;
    } else {
      if (switchcount == 0 && dir == "asc") {
        dir = "desc";
        switching = true;
      }
    }
  }
} //func sortTable

const scientificToDecimal = function (num) {
  const sign = Math.sign(num);
  //if the number is in scientific notation remove it
  if (/\d+\.?\d*e[\+\-]*\d+/i.test(num)) {
    const zero = '0';
    const parts = String(num).toLowerCase().split('e'); //split into coeff and exponent
    const e = parts.pop(); //store the exponential part
    let l = Math.abs(e); //get the number of zeros
    const direction = e / l; // use to determine the zeroes on the left or right
    const coeff_array = parts[0].split('.');

    if (direction === -1) {
      coeff_array[0] = Math.abs(coeff_array[0]);
      num = zero + '.' + new Array(l).join(zero) + coeff_array.join('');
    }
    else {
      const dec = coeff_array[1];
      if (dec) l = l - dec.length;
      num = coeff_array.join('') + new Array(l + 1).join(zero);
    }
  }

  if (sign < 0) {
    num = -num;
  }
  return +num;
}//func scientificToDecimal


/**
 * Vigenere Cipher
 */
String.prototype.replaceAt = function (index, character) {
  return this.substr(0, index) + character + this.substr(index + character.length);
}

const vigenereCipher = function (str, key, decode = false) {
  key = key.toLowerCase(); //make the key easier to work with
  while (key.length < str.length) { //extend the key longer than our string by appending it to itself
    key = key + key;
  }
  for (var i = 0, len = str.length; i < len; i++) { //for each letter in string
    if (str[i].match(/^[a-zA-Z]*$/gi) === null) {
      key = key.substr(0, i) + ' ' + key.substr(i); //if the letter in string isn't a-z or A-Z we insert a space at this spot in key, to preserve the key shit for the next real letter
    }
    var shift = key[i].charCodeAt(0) - 96; //get our shift amount, if it is a space it will be negative, and the for loop won't run on this turn and the character is unchanged
    if (decode) {
      for (var j = 0; j < shift; j++) { //caesar shift the letter by shift amount
        if (str[i].match(/^[a-yA-Y]*$/gi) !== null) {
          str = str.replaceAt(i, String.fromCharCode(str[i].charCodeAt(0) + 1));
        } else if (str[i].match(/^[zZ]*$/gi) !== null) {
          str = str.replaceAt(i, String.fromCharCode(str[i].charCodeAt(0) - 25));
        }
      }
    } else {
      for (var j = 0, len2 = shift; j < len2; j++) { //reverse caesar shift the letter by shift amount
        if (str[i].match(/^[b-zB-Z]*$/gi) !== null) {
          str = str.replaceAt(i, String.fromCharCode(str[i].charCodeAt(0) - 1));
        } else if (str[i].match(/^[aA]*$/gi) !== null) {
          str = str.replaceAt(i, String.fromCharCode(str[i].charCodeAt(0) + 25));
        }
      }
    }
  }
  return str;
}

/**
 * Encrypt/Decrypt function
 * https://gist.github.com/chrisveness/43bcda93af9f646d083fad678071b90a
 */
const aesGcmEncrypt = async function (plaintext, password) {
  try {
    const pwUtf8 = new TextEncoder().encode(password);
    const pwHash = await crypto.subtle.digest('SHA-256', pwUtf8);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const alg = { name: 'AES-GCM', iv: iv };
    const key = await crypto.subtle.importKey('raw', pwHash, alg, false, ['encrypt']);
    const ptUint8 = new TextEncoder().encode(plaintext);
    const ctBuffer = await crypto.subtle.encrypt(alg, key, ptUint8);
    const ctArray = Array.from(new Uint8Array(ctBuffer));
    const ctStr = ctArray.map(byte => String.fromCharCode(byte)).join('');
    const ctBase64 = btoa(ctStr);
    const ivHex = Array.from(iv).map(b => ('00' + b.toString(16)).slice(-2)).join('');
    return ivHex + ctBase64;
  } catch (err) { }
} //func aesGcmEncrypt

const aesGcmDecrypt = async function (ciphertext, password) {
  try {
    const pwUtf8 = new TextEncoder().encode(password);
    const pwHash = await crypto.subtle.digest('SHA-256', pwUtf8);
    const iv = ciphertext.slice(0, 24).match(/.{2}/g).map(byte => parseInt(byte, 16));
    const alg = { name: 'AES-GCM', iv: new Uint8Array(iv) };
    const key = await crypto.subtle.importKey('raw', pwHash, alg, false, ['decrypt']);
    const ctStr = atob(ciphertext.slice(24));
    const ctUint8 = new Uint8Array(ctStr.match(/[\s\S]/g).map(ch => ch.charCodeAt(0)));
    const plainBuffer = await crypto.subtle.decrypt(alg, key, ctUint8);
    const plaintext = new TextDecoder().decode(plainBuffer);
    return plaintext;
  } catch (err) { }
} //func aesGcmDecrypt

const createLoadingAnimationElement = function (width = "20px", height = "20px") {
  const loader = document.createElement('div');
  loader.setAttribute('class', 'loading');
  loader.setAttribute('style', 'display:inline;vertical-align:middle;margin-left:10px')
  loader.innerHTML = `<svg version="1.1" id="loader-1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
        width = ${width} height = ${height} viewBox = "0 0 50 50" style = "enable-background:new 0 0 50 50;" xml: space = "preserve" >
          <path fill="#fff" d="M25.251,6.461c-10.318,0-18.683,8.365-18.683,18.683h4.068c0-8.071,6.543-14.615,14.615-14.615V6.461z">
            <animateTransform attributeType="xml"
              attributeName="transform"
              type="rotate"
              from="0 25 25"
              to="360 25 25"
              dur="1s"
              repeatCount="indefinite" />
          </path>
        </svg >`;
  return loader;
}

const removeLoadingAnimationElement = function () {
  document.querySelector('.loading') ? document.querySelector('.loading').remove() : '';
}

const createProgressBar = function (second = 1) {
  const progressBar = document.createElement('div');
  progressBar.setAttribute('id', 'progress-container');
  progressBar.setAttribute('style', 'width: 100%; background-color: #ddd; position: relative;text-align:center;');
  progressBar.innerHTML = `
    <span class="text" style="position:absolute;line-height: 25px;left:0; width: 100%">Activating Account, Please wait</span>
    <div id="customLoadingBar" style="width: 1%; height: 30px;background-color: #6dcc71;margin-bottom: 15px;">
    </div>`;

  document.getElementById('activate-account').insertAdjacentHTML('beforebegin', progressBar.outerHTML);
  document.getElementById('activate-account').remove();

  var elem = document.getElementById("customLoadingBar");
  var width = 1;
  var id = setInterval(frame, second * 1000);
  function frame() {
    if (width >= 100) {
      clearInterval(id);
      document.querySelector('#progress-container .text').textContent = 'Account activated, reload the page';
    } else {
      width++;
      elem.style.width = width + '%';
    }
  }
}

const removeDuplicatePledgeNotes = function (notes) {
  if(!Array.isArray(notes)) {
    throw ('removeDuplicatePledgeNotes failed, invalid datatype');
  }

  let updatedNotes = [];

  for(let note of notes) {

    const isDupe = updatedNotes.find(elm => {
      return (elm.coin === note.coin && elm.account === note.account && elm.publicKey === note.publicKey)
    }) !== undefined;

    if(!isDupe) {
      updatedNotes.push(note);
    }
  }

  return updatedNotes;
}

/**
 * Check the current login account, returns true if the
 * account is indeed registered via our enchantaddress site
 * @param {*} node *
 * @param {*} account
 */
const accountRegistered = function(node, account, masterAccount) {
  const searchProperty = 'btc-pub';

  return getRequest(`${node}/nxt?requestType=getAccountProperties&recipient=${account}&property=${searchProperty}&setter=${masterAccount}`).then(result => {
    if (result.properties && result.properties[0].value !== null) {
      return true;
    }  else {
      return false;
    }
  })
}

/***********************
 *  Helper Functions
 **********************/
function i(id) {
  return document.getElementById(id);
} //func i

function q(selector) {
  return document.querySelector(selector);
} //func q

function hideElm(selector) {
  try {
    const elm = q(selector);
    elm.style.display = 'none';
  } catch (err) {
    console.log(err)
  }
}

function showElm(selector) {
  try {
    const elm = q(selector);
    elm.style.display = 'block';
  } catch (err) {
    console.log(err)
  }
}

function fadeOutElm(selector) {
  try {
    const elm = q(selector);
    elm.style.transition = 'all 2s';
    elm.style.opacity = '0';
  } catch (err) {
    console.log(err)
  }
}

function fadeInElm(selector) {
  try {
    const elm = q(selector);
    elm.style.opacity = '1';
  } catch (err) {
    console.log(err)
  }
}

function removeElm(selector) {
  try {
    const elm = q(selector);
    if (elm) elm.remove();
  } catch (err) {
    console.log(err)
  }
}

function createNXT(value) {
  if (!value) {
    throw new Error('No value to create NXT from');
  }
  const nxtPairs = {};
  nxtPairs.accountID = nxtjs.secretPhraseToAccountId(value);
  nxtPairs.publicKey = nxtjs.secretPhraseToPublicKey(value);
  return nxtPairs;
} //func createNXT

function setResult(selector, value) {
  i(selector).value = value;
} //func setResult

function setLocalStorage(key, value) {
  window.localStorage.setItem(key, value);
} //func setLocalStorage

function getLocalStorage(key) {
  return window.localStorage.getItem(key);
} //func getLocalStorage

function characterCounter() {
  const length = this.value.length;
  if (length > 9999) return;
  i('char-count').textContent = length + '/9999';
} //func characterCounter

function altCoinCode(altcoin) {
  switch (altcoin) {
    case 'litecoin':
      return 'ltc';
    case 'ethereum':
      return 'eth';
    case 'segwit':
      return 'seg';
    case 'monero':
      return 'xmr';
    case 'oxen':
      return 'oxen';
  }
  return '';
} //func altCoinCode

function formatCryptoDecimals(coin, amt) {
  amt = +amt;
  if (isNaN(amt)) return amt;
  if (amt == 0) return 0;
  // xmr = 12
  // eth/eos = 18
  coin = coin.toLowerCase();
  switch (coin) {
    case 'btc':
    case 'ltc':
       return (amt / 100000000).toFixed(8);
    case 'xmr': return (amt / 100000000).toFixed(8);
    case 'eth': return (amt / 1000000000000000000).toFixed(8);
    case 'eos': return (amt / 1000000000000000000).toFixed(4);
    case 'ardr': return (amt / 100000000).toFixed(8);
    case 'usdt':
    case 'usdc': return (amt / 1e6).toFixed(6);
    case 'dai': return (amt / 1e18).toFixed(6);
    case 'coin': return (amt / 1e8).toFixed(6);
    default: return amt;
  }
}//func formatCryptoDecimals

async function getBalanceResponse(coin, address, erc20Token=null) {
  const regex = new RegExp(/btc|eth|ltc/, 'gi');
  const coinType = coin.match(regex);
  if(erc20Token !== null) {
    const url = `https://api.etherscan.io/api?module=account&action=tokenbalance&contractaddress=${erc20Token}&address=${address}&tag=latest&apikey=JEGKUXE7AQ66FQQCPRDPSJU21MYXIFXE5E`;
    return getRequest(url);
  } 
  if(coin.toLowerCase() === 'coin') { 
    //call to bg script so content script doens't complain 
    const balance = await onMessageAPIWrapper({
      requestType: "getBalance",
      node: 'https://a1.annex.network',
      chain: coin,
      account: address, 
    });
    return { balance: balance.balanceNQT }
  }
  if (coinType) {
    const url = `https://api.blockcypher.com/v1/${coinType[0]}/main/addrs/${address}/balance?token=66ad844465644b90812dea9fb6a8017f`;
    return getRequest(url);
  }
  return 0;
}
function onMessageAPIWrapper(data) {
  return new Promise(resolve => {
    chrome.runtime.sendMessage(data, res => {
      resolve(res);
    });
  });
}
function getBalance(node, chain, account) {
  if (!account) console.error('Account is need to check the balance.');
  return window
    .fetch(
      `${node}/nxt?requestType=getBalance&chain=${chain}&account=${account}`,
      {
        method: 'GET'
      }
    )
    .then(res => res.json())
    .catch(e => console.error(e));
} //func getBalance 

function getEOSAccountNames(key) {
  return fetch("https://eos.greymass.com:443/v1/history/get_key_accounts", {
    method: 'POST', // or 'PUT'
    body: `{"public_key":"${key}"}`,
    headers: {
      'Content-Type': 'application/json'
    }
  }).then(res => res.json());
}

function getEOSBalance(accountName) {
  return fetch("https://eos.greymass.com/v1/chain/get_currency_balance", {
    method: 'POST', // or 'PUT'
    body: `{"code":"eosio.token","account":"${accountName}","symbol":"EOS"}`,
    headers: {
      'Content-Type': 'application/json'
    }
  }).then(res => res.json());
}

function getExplorerLink(coin, address) {
  switch (coin.toLowerCase()) {
    case 'btc': 
    case 'bitcoin': 
      return `https://www.blockchain.com/btc/address/${address}`;
    case 'ltc':
    case 'litecoin':
       return `https://blockchair.com/litecoin/address/${address}`;
    case 'xmr':
    case 'monero':
    case 'oxen':
    case 'loki':
       return `https://duckduckgo.com/?q=qr+code+${address}`; 
    case 'eth':
    case 'ethereum':
       return `https://etherscan.io/address/${address}`;
    case 'eos': return `https://bloks.io/key/${address}`;
    case 'coin': return `https://a1.annex.network/index.html?chain=IGNIS&account=${address}`;
    default: return 'javascript:void(0)';
  }
}

function sortObjectByValue(key, order = 'asc') {
  return function (a, b) {
    if (!a.hasOwnProperty(key) || !b.hasOwnProperty(key)) {
      return 0;
    }
    const varA = (typeof a[key] === 'string') ?
      a[key].toUpperCase() : a[key];
    const varB = (typeof b[key] === 'string') ?
      b[key].toUpperCase() : b[key];
    let comparison = 0;
    if (varA > varB) {
      comparison = 1;
    } else if (varA < varB) {
      comparison = -1;
    }
    return (
      (order == 'desc') ? (comparison * -1) : comparison
    );
  };
}

function handleLongURLs() {
  i('nlabel').textContent = 'URL Too Long';
  q('#nlabel + input').remove();
}

function getPrivateKeyIndex(inputValue) {
  if (inputValue.includes('btc')) return 'btcpri';
  if (inputValue.includes('eos')) return 'eospri';
  if (inputValue.includes('eth')) return 'ethpri';
  if (inputValue.includes('usdc')) return 'ethpri';
  if (inputValue.includes('usdt')) return 'ethpri';
  if (inputValue.includes('dai')) return 'ethpri';
  if (inputValue.includes('ltc')) return 'ltcpri';
  if (inputValue.includes('spend')) return 'xmrpri-spend';
  if (inputValue.includes('view')) return 'xmrpri-view';
  if (inputValue.includes('nxt')) return 'nxtpass';
  if (inputValue.includes('coin')) return 'nxtpass';
}

function getPublicKeyIndex(inputValue) {
  if (inputValue.includes('btc')) return 'btcpub';
  if (inputValue.includes('eos')) return 'eospub';
  if (inputValue.includes('eth')) return 'ethpub';
  if (inputValue.includes('usdc')) return 'ethpub';
  if (inputValue.includes('usdt')) return 'ethpub';
  if (inputValue.includes('dai')) return 'ethpub';
  if (inputValue.includes('ltc')) return 'ltcpub';
  if (inputValue.includes('xmr')) return 'xmrpub';
  if (inputValue.includes('oxen')) return 'oxenpub';
  if (inputValue.includes('spend')) return 'xmrpub-spend';
  if (inputValue.includes('view')) return 'xmrpub-view';
  if (inputValue.includes('nxt')) return 'nxtaddr';
  if (inputValue.includes('coin')) return 'nxtaddr';
}

function getCoinLabel(inputValue) {
  if (inputValue.includes('eos')) return 'EOS';
  if (inputValue.includes('btc')) return 'Bitcoin';
  if (inputValue.includes('eth')) return 'Ethereum';
  if (inputValue.includes('ltc')) return 'Litecoin';
  if (inputValue.includes('spend')) return 'MoneroSpend';
  if (inputValue.includes('view')) return 'MoneroView';
  if (inputValue.includes('xmr')) return 'Monero';
  if (inputValue.includes('oxen')) return 'Oxen';
  if (inputValue.includes('nxt')) return 'Ardor';
  if (inputValue.includes('usdc')) return 'USDC';
  if (inputValue.includes('usdt')) return 'USDT';
  if (inputValue.includes('dai')) return 'DAI';
  if (inputValue.includes('coin')) return 'COIN';

  return 'Unknown';
}

function getERC20Address(token) { 
  if (token === 'usdt') return '0xdac17f958d2ee523a2206206994597c13d831ec7';
  if (token === 'usdc') return '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
  if (token === 'dai') return '0x6b175474e89094c44da98b954eedeac495271d0f';
}

function formatBalanceMessage(inputValue, balance) {
  const regex = new RegExp(/btc|eth|ltc|xmr|eos|coin/, 'gi');
  const coinType = inputValue.match(regex);
  if (coinType) {
    const label = coinType[0].toUpperCase();
    if (!balance || (+balance == 0)) return 'Your Balance: 0.00 ' + label;
    if (label == 'XMR') return 'Your Balance: Hidden';
    if (label == 'BTC') return `Your Balance: ${balance / 100000000} BTC`;
    if (label == 'LTC') return `Your Balance: ${balance / 100000000} LTC`;
    if (label == 'ETH') return `Your Balance: ${balance / (Math.pow(10, 18))} ETH`;
    if (label == 'EOS') return `Your Balance: ${balance / 10000} EOS`;
    if (label == 'COIN') return `Your Balance: ${balance / 100000000} COIN`;
  }
}

function getImgBlob(text) {
  text = encodeURIComponent(text);
  return window.fetch('https://chart.googleapis.com/chart?cht=qr&chs=200x200&chl=' + text)
    .then(response => response.blob())
}

function allowedPages(location) {
  return /^https:\/\/www.linkedin.com\/in\//.test(location.href)
    || /^https:\/\/twitter.com.*/.test(location.href)
    || /^https:\/\/[a-zA-Z.]*stackexchange\.com.*/.test(location.href)
    || /^https:\/\/[a-zA-Z.]*stackoverflow\.com.*/.test(location.href);
}

function allowedPledge(location) {
  return location.hostname.includes('gofundme.com')
    || location.hostname.includes('patreon.com')
    || /^https:\/\/(www\.)?t.me\/[a-zA-Z0-9_]*$/.test(location.href)
    || /^https:\/\/(www\.)?kickstarter.com.*/.test(location.href)
    || /^https:\/\/[a-zA-Z.]*ebay\.com\/itm\//.test(location.href)
    || /^https:\/\/(www\.)?github.com/.test(location.href)
    || /^https:\/\/(www\.)?youtube.com/.test(location.href)
    || /^https:\/\/(www\.)?fiverr.com/.test(location.href)
    || /^https:\/\/(www\.)?google\.com\/((?!search).)/.test(location.href)
    || /^https:\/\/(www\.)?blockchain\.com\/(btc|eth)\/address\//.test(location.href)
    || /^https:\/\/(www\.)?xmrchain.net\/search\?value=/.test(location.href)
    || /^https:\/\/(www\.)?ardor.tools\/account\//.test(location.href)
    || /^https:\/\/(www\.)?facebook.com.*/.test(location.href);
}

function supportedDomainList(supportedDomains, location) {
  let supported = false;
  const domainArray = supportedDomains.split(',');
  for (let value of domainArray) {
    const reg = new RegExp(value, 'g');
    if (reg.test(location.hostname)) {
      supported = true;
      break;
    }
  }
  return supported;
}

function getGoogleMapsURL(url) {
  try {

    const LatLong = url.match(/(?<=@).+?,.+?(?=,)/)[0];

    const roundedLatitude = parseFloat(LatLong.split(',')[0]).toFixed(2);
    const roundedLongtitude = parseFloat(LatLong.split(',')[1]).toFixed(2);
    return "https://www.google.com/maps/@" + roundedLatitude + ',' + roundedLongtitude;
  } catch (error) {
    console.log(error)
  }
  return '';
} 

function getSupportedCoins() { 
  return new Promise(resolve => {
    chrome.storage.local.get(['supportedTokens'], async result => { 
      resolve(result['supportedTokens'])
    }); 
  })
} 

function getMinimumAmountRequired (coin) {

}

// FIXME: Make this a separate file? We will have to import this file on multiple HTML files...
class Constant {
  // enum
  static cryptoEnum = {
    BTC: 'BITCOIN',
    ETH: 'ETHEREUM',
    LTC: 'LITECOIN',
    XMR: 'MONERO',
    OXEN: 'OXEN',
    EOS: 'EOS',
    COIN: 'COIN'
  };

  static minimumAmountEnum = {
    BITCOIN: 0.001,
    ETHEREUM: 0.001,
    LITECOIN:0.002,
    MONERO: 0.002,
    OXEN: 0.002,
    EOS: 0.002,
    COIN: 0.002
  };

  static getCrypto(val) {
    val = val.toUpperCase();

    switch (val) {
      case 'BTC': 
      case 'BITCOIN':
        return this.cryptoEnum.BTC;
      case'ETH': 
      case'ETHEREUM': 
      case 'USDC': 
      case 'USDT':
      case  'DAI':
        return this.cryptoEnum.ETH;
      case 'LTC': 
      case 'LITECOIN':
        return this.cryptoEnum.LTC;
      case 'XMR': 
      case 'MONERO':
        return this.cryptoEnum.XMR;
      case 'OXEN':
        return this.cryptoEnum.OXEN;
      case 'EOS':
        return this.cryptoEnum.EOS;
      case 'COIN':
        return this.cryptoEnum.COIN;
      default:
        return undefined;
    }
  }
}

function minimumAmountRequired(coin, amount) { 
  coin = coin.toUpperCase();
  if(!amount || !isNaN(+amount) || amount === 0) return false;

  const crypto = Constant.getCrypto(coin);

  return crypto && amount >= Constant.minimumAmountEnum[crypto];
}

function isEmailAddress(email) {
  const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
}

function getCoinPriceLink(coin) {
  const defaultLink = "https://coinmarketcap.com";
  if(!coin || typeof coin !== 'string') return defaultLink;

  let defaultEndpoint = `${defaultLink}/currencies`;
  coin = coin.toLowerCase();

  switch(coin) { 
    case 'btc': 
    case 'bitcoin': 
      return `${defaultEndpoint}/bitcoin`;
    case 'ltc': 
    case 'litcoin': 
      return `${defaultEndpoint}/litcoin`;
    case 'xmr': 
    case 'moner': 
      return `${defaultEndpoint}/monero`;
    case 'oxen': 
    case 'loki': 
      return `${defaultEndpoint}/oxen`;
    case 'eos': 
      return `${defaultEndpoint}/eos`;
    case 'eth': 
    case 'ethereum': 
      return `${defaultEndpoint}/ethereum`;
    case 'usdc': 
    case 'usd-coin': 
      return `${defaultEndpoint}/usd-coin`;
    case 'usdt': 
    case 'tether': 
      return `${defaultEndpoint}/tether`;
    case 'dai': 
    case 'multi-collateral-dai': 
      return `${defaultEndpoint}/multi-collateral-dai`;
    case 'coin': 
      return `${defaultEndpoint}/multi-collateral-dai`;
    default:
      return defaultLink;
  } 
}

/**
 * Reformat GoFundMe URL ONLY (protocal + domain + path).. no subdomain
 * @param {Location | URL} location 
 */
function getFormattedGoFundMeUrl(location) { 
  if(!(location instanceof Location) && !(location instanceof URL)) { 
    console.warn('URL Invalid.');
    return undefined;
  }

  if(!location.href.includes('gofundme.com')) {
    // console.warn('Reformat for non-gofundme page not allowed.');
    return undefined;
  }

  return location.protocol + "//" + getDomainWithoutSubdomain(location.origin) + "/" + location.pathname.split('/').pop();
}

/**
 * get the main domain part of the url
 * @param {Location | URL} url 
 */
function getDomainWithoutSubdomain(url) {
  const urlParts = new URL(url).hostname.split('.')

  return urlParts
    .slice(0)
    .slice(-(urlParts.length === 4 ? 3 : 2))
    .join('.')
}

// Can't have multiple onLoad function
// work around using the following function
// Delete this when we merge the two content scripts.
function addLoadEvent(func) {
  var oldonload = window.onload;
  if (typeof window.onload != 'function') {
    window.onload = func;
  } else {
    window.onload = function () {
      if (oldonload) {
        oldonload();
      }
      func();
    }
  }
}