const CHILD_CHAIN = "IGNIS";
const MASTER_ARDOR_ACCOUNT = "ARDOR-XXXX-XXXX-5496-B3YAC";

let ARDOR_NODE = "https://a1.annex.network";
let NODE_TYPE;
let validURL = false;
let secondaryPass = 'disable';
let url = "";

document.addEventListener("DOMContentLoaded", (event) => {

  chrome.storage.local.get(['activeNode'], function (result) {
    if(result['activeNode']) ARDOR_NODE = result['activeNode'];
    document.querySelector('header .container sup').innerHTML = `Using Node: <a href="${ARDOR_NODE}" target="_blank">${ARDOR_NODE}</a>`;

    init();

    document.querySelector('a.search').addEventListener('click', formSubmitHandler);

    document.querySelector('input.single').addEventListener('keypress', function (e) {
      const key = e.which || e.keyCode;
      if (key === 13) {
        formSubmitHandler();
      }
    });
  }) 

});//DOMContentLoaded

async function init() {
  try {
    const result = await fetch(ARDOR_NODE);
    if (result.status != 200) {
      ARDOR_NODE = 'https://a1.annex.network';
    }
  } catch (error) {
    console.log(error, ' check testardor.xcubicle node.')
    ARDOR_NODE = "https://a1.annex.network";
  } finally {

    let urlTemp = getQueryParam(window.location, 'url');

    // Load other pledges at all time 
    searchOtherPledges();

    if (urlTemp) {
      validURL = true;
      url = urlTemp.split('?')[0]
      const $resultContainer = document.querySelector('.result');
      const $statisticContainer = document.querySelector('.statistic');

      q('input[name="url"]').value = url;

      q('.notes > h2 a').href = url;
      q('.notes > h2 a').textContent = url;

      printPublicNotes(url);

      updatePledgedStatusBox(url);

      // Start Default loading screen
      $resultContainer.style.display = 'flex';
      $statisticContainer.style.display = 'flex';

      // Set Default values
      let totalPledges = 0;
      let recentPledge = 'None';

      let pledgeTable = [`<div class="empty-table"> No Pledges under this URL</div>`];

      const urlHash = await hashUrl(url);

      const searchQueryRequest = `${ARDOR_NODE}/nxt?requestType=searchTaggedData&chain=${CHILD_CHAIN}&tag=pledge-note,public,recorded&query=${urlHash}`;

      const cloudResponse = await window
        .fetch(searchQueryRequest, { method: 'GET' })
        .then(res => res.json());

      if (cloudResponse.data.length) {
        // Start the loading animation
        document.querySelector('.recent-pledge').style.display = "block";

        let pledgeList = [];
        pledgeTable = [];
        for (let i = 0; i < cloudResponse.data.length; i++) {
          let data = cloudResponse.data[i];
          const tagArray = data.tags.split(',');
          if (!data.tags.includes('ARDOR') || !tagArray[3].includes('ARDOR')) continue;
          if (data.name != urlHash) continue;

          const hash = data.transactionFullHash;
          const tagRequest = `${ARDOR_NODE}/nxt?requestType=getTaggedData&chain=${CHILD_CHAIN}&transactionFullHash=${hash}`;
          const result = await window
            .fetch(tagRequest, { method: 'GET' })
            .then(res => res.json())

          // Remove the label
          try { 
            const resultObj = JSON.parse(result.data);
            pledgeList.push(resultObj);
            totalPledges += 1;
          } catch (error) { 
            console.log("Aeris: ", error)
          } 


          if (i === 0) {
            // Let's assume the first result is the latest donation
            const { account, amount, coin, url, time = new Date().toDateString() } = JSON.parse(result.data);

            const alias = await searchAccountAlias(ARDOR_NODE, account);

            recentPledge = `
            <span data-account="${account}" class="pictogram"></span>
            Account: ${alias ? `@${alias}` : account} <br>
            Amount: ${(+amount).toFixed(8)} ${coin.toUpperCase()}<br> 
            URL: <a href="${url}" target="_BLANK">${url}</a><br>
            Time: ${time} Eastern Time (EST)
          `;
          }
        }

        let total = { btc: 0, xmr: 0, eos: 0, eth: 0, usdc: 0 };

        if (pledgeList.length) {

          pledgeTable = pledgeList.map(async (item, key) => {
            const { account, amount, coin, url, time = new Date().toDateString() } = item;
            let formatted = scientificToDecimal(amount)
            total[coin] += +formatted;


            const alias = await searchAccountAlias(ARDOR_NODE, account);

            return `<div class="box pledge-box" data-address=${account}>
              <p>
                <span data-account="${account}" class="pictogram"></span>
                <span class="account">Account: ${alias ? `@${alias}` : account}</span><br>
                <span class="amount">Amount: ${formatted} ${coin.toUpperCase()}</span><br>
                <span class="url">URL: <a href="${url}" target="_BLANK">${url}</a></span><br>
                <span class="date">Time: ${time} Eastern Time (EST)</span>
              </p></div>`;
          })
        }

        updateTotalPledgedForUnverified(total);
      }

      getPageTitle(url).then(response => {
        if (response) document.querySelector('.container.campaign-info .ptitle').innerHTML = `<a href="${url}" target="_blank">${response}</a>`;
      })

      // Temporary solution for PROMISE values.
      let pledges = '';
      for (let i = 0; i < pledgeTable.length + 1; i++) {
        if (pledgeTable[i]) {
          let temp = await pledgeTable[i];
          pledges += temp;
        } else {
          $resultContainer.innerHTML = pledges;
        }
      }

      stackDuplicateResults();

      // Done API fetching, load to the screen
      document.querySelector('.recent-pledge').innerHTML = `<p><strong>Recent Pledges:</strong><br><span class="value">${recentPledge}</span></p>`;

      document.querySelectorAll('.pictogram').forEach(item => {
        const account = item.getAttribute('data-account');
        if (account) {
          new Pictogrify(account, 'monsters').render(item)
        }
      })
    }
  }
}

function formSubmitHandler() {
  let urlInput = document.querySelector('input[name="url"]').value;
  urlInput = urlInput.trim()
  if (urlInput) {
    const currentURL = location.origin + location.pathname;
    location.href = currentURL + "?url=" + urlInput;
  }
}//func formSubmitHandler

function stackDuplicateResults() {
  const dataAddressValue = [... document.querySelectorAll('.result .pledge-box')].map(element => element.getAttribute('data-address'));

  const addressSet = new Set(dataAddressValue);

  addressSet.forEach(item => {
    let boxes = document.querySelectorAll(`.result .pledge-box[data-address="${item}"]`);
    if (boxes.length > 1) {
      boxes[0].classList += ' stacked stack';
      for (let i = 1; i < boxes.length; ++i) {
        boxes[i].classList += ' dupe hide';
        boxes[i].style.backgroundColor = getRandColor(5)
      }
    }
  })

  document.querySelectorAll('.pledge-box.stacked').forEach(box => {
    box.addEventListener('click', function (element) {
      if (element.target.getAttribute('data-address')) {
        let address = element.target.getAttribute('data-address');
        this.classList.toggle('stack');
        this.classList.toggle('expand');
        document.querySelectorAll(`.pledge-box.dupe[data-address="${address}"]`).forEach(elm => {
          elm.classList.toggle('hide');
        })
        document.querySelectorAll(`.pledge-box.dupe[data-address="${address}"]`).forEach(elm => {
          elm.classList.toggle('show');
        })
      }
    })
  })
}//func stackDuplicateResults

async function getPledgedStatus(url) {
  let pledgeStatus = '';

  const location = new URL(url);
  const campaignName = location.pathname.split('/').pop();;

  const currentUrlPattern = `${location.origin}/${campaignName}`;
  let escapedURL = currentUrlPattern.replace(/[-:/[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

  try {
    const response = await getApiRequest(`${ARDOR_NODE}/nxt?requestType=searchAssets&query=${escapedURL}`);
    if (response.assets.length == 0) throw "No Assets found.";
    let assetID;
    for (let i = 0; i < response.assets.length; i++) {
      if (response.assets[i].accountRS === MASTER_ARDOR_ACCOUNT && response.assets[i].description === currentUrlPattern) {
        assetID = response.assets[i].asset;
        break;
      }
    }

    if (assetID) {
      const response = await getApiRequest(`${ARDOR_NODE}/nxt?requestType=getAssetProperties&asset=${assetID}&setter=${MASTER_ARDOR_ACCOUNT}`);
      let status = { status: 'New' };
      let currencies = { btc: 0, xmr: 0, eth: 0, eos: 0 };
      if (response.properties.length) {
        for (let p of response.properties) {
          if (p.property === 'status') {
            status.status = p.value;
          }
          if (p.property === 'btc' || p.property === 'xmr' || p.property === 'eth' || p.property === 'eos') {
            currencies[p.property] = p.value;
          }
        }
        pledgeStatus = { ...status, ...currencies };
      }
    }
  } catch (err) {
    pledgeStatus = '';
    // console.log(err);
  }
  return pledgeStatus;
}//func getPledgedStatus

function getApiRequest(url, method = 'GET') {
  return fetch(url, { method })
    .then(res => res.json())
}

function updatePledgedStatusBox(url) {
  getPledgedStatus(url).then(property => {
    if (property.status) {
      document.querySelector('.pledge-output').innerHTML = ' <b>' + property.status + '</b>';
    }
    if (property.btc > 0) {
      document.querySelector('.pledged-total .btc span').innerHTML = property.btc;
      cryptoToUSD('btc', property.btc).then(res => {
        document.querySelector('.pledged-total .btc sup').innerHTML = '($' + res + ')';
      })
    }
    if (property.xmr > 0) {
      document.querySelector('.pledged-total .xmr span').innerHTML = property.xmr;
      cryptoToUSD('xmr', property.btc).then(res => {
        document.querySelector('.pledged-total .xmr sup').innerHTML = '($' + res + ')';
      })
    }
    if (property.eth > 0) {
      document.querySelector('.pledged-total .eth span').innerHTML = property.eth;
      cryptoToUSD('eth', property.btc).then(res => {
        document.querySelector('.pledged-total .eth sup').innerHTML = '($' + res + ')';
      })
    }
    if (property.eos > 0) {
      document.querySelector('.pledged-total .eos span').innerHTML = property.eos;
      cryptoToUSD('eos', property.btc).then(res => {
        document.querySelector('.pledged-total .eos sup').innerHTML = '($' + res + ')';
      })
    }
  });
  document.getElementById('total-pledges').classList.toggle('show');
} //updatePledgedStatusBox

function updateTotalPledgedForUnverified(total) {
  const $status = document.querySelector('.pledge-output b');
  if ($status && $status.textContent !== "verified") {
    Object.keys(total).forEach(coin => {
      if (total[coin] > 0) {
        let amount = total[coin];
        amount = formatCryptoDecimals(coin, amount);
        document.querySelector(`.pledged-total .${coin} span`).textContent = amount;
        cryptoToUSD(coin, amount).then(result => {
          if (result) {
            document.querySelector(`.pledged-total .${coin} sup`).textContent = `($${result})`;
          }
        })
      }
    })
  }
}//func updateTotalPledgedForUnverified

function formatCryptoDecimals(coin, amt) {
  amt = +amt;
  if (isNaN(amt)) return amt;
  if (amt == 0) return 0;
  // xmr = 12
  // eth/eos = 18
  // Cutting them to 8 decimals for now
  switch (coin) {
    case 'btc': return amt.toFixed(8);
    case 'xmr': return amt.toFixed(8);
    case 'eth': return amt.toFixed(8);
    case 'eos': return amt.toFixed(8);
    default: return amt;
  }
}//func formatCryptoDecimals 


async function cryptoToUSD(coin, amt) {
  const $price = document.querySelector('#total-price .price');
  let totalPrice;

  if ($price && $price.textContent.length) {
    totalPrice = $price.textContent;
  } else {
    totalPrice = await getApiRequest(`https://layers.xcubicle.com/cryptoconvert.php?coin=${coin}`)
    totalPrice = totalPrice.price;
  }
  const cryptoToUSD = +totalPrice * amt;
  return cryptoToUSD.toFixed(2);
}//func cryptoToUSD

// Search taggedData -> read donation messages -> filter messages
async function searchOtherPledges() {
  const searchQueryRequest = `${ARDOR_NODE}/nxt?requestType=searchTaggedData&chain=${CHILD_CHAIN}&tag=pledge-note,public,recorded`;

  const cloudResponse = await window
    .fetch(searchQueryRequest, { method: 'GET' })
    .then(res => res.json());

  if (cloudResponse.data.length) {
    let pledgeList = [];
    for (let i = 0; i < cloudResponse.data.length; i++) {
      let data = cloudResponse.data[i];
      const tagArray = data.tags.split(',');
      if (!data.tags.includes('ARDOR') || !tagArray[3].includes('ARDOR')) continue;

      const hash = data.transactionFullHash;
      const tagRequest = `${ARDOR_NODE}/nxt?requestType=getTaggedData&chain=${CHILD_CHAIN}&transactionFullHash=${hash}`;
      const result = await window
        .fetch(tagRequest, { method: 'GET' })
        .then(res => res.json())
      // Remove the label
      try { 
        const resultObj = JSON.parse(result.data);
        pledgeList.push(resultObj);
      } catch (error) { 
        console.log("Aeris: ", error)
      } 
    }

    if (pledgeList.length > 0) {
      let listSet = new Set();
      // remove duplicates
      pledgeList.forEach(item => item.url ? listSet.add(item.url) : '');

      if (listSet.size) {
        q('.pledge-contents').innerHTML = `<div class="urls"></div>`;

        listSet.forEach(async item => {
          try {
            const urlResponse = await fetch(item);
            if (urlResponse.status === 200) {
              const title = await getPageTitle(item);
              const urlElm = document.createElement('div');
              urlElm.className = 'url-list';
              urlElm.innerHTML = `<h4 class="page-title"><a href=${item} target="_BLANK">${title}</a></h4><a class="url" href="index.html?url=${item}">${item}</a>`
              q('.urls').appendChild(urlElm);
            }
          } catch (error) {
            console.log(error)
          }
        })
      } else {
        q('.other-pledges').innerHTML = `<p><strong>List of Pledges:</strong><br><span class="value">None</span></p>`;
      }
    }
  } else { 
    q('.other-pledges').innerHTML = `<p class="empty"><strong>List of Pledges:</strong><span>Empyt.</span></p>`;
  }
}//func searchOtherPledges

async function searchAccountAlias (node, account) { 
  let alias = await getAccountAlias(node, account); 

  if(alias) {
    return alias;
  } else {
    return await getMasterAccountAlias(node, account);
  } 
}

function getAccountAlias (node, account) {
  return getApiRequest(`${node}/nxt?requestType=getAliases&chain=ignis&account=${account}`).then(result => {
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

function getMasterAccountAlias  (node, account) {
  const masterArdor = 'ARDOR-XXXX-XXXX-5496-B3YAC';
  return getApiRequest(`${node}/nxt?requestType=getAliases&chain=ignis&account=${masterArdor}`).then(result => {
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


async function printPublicNotes(url) {
  homeURL = new URL(url).origin;
  currentUrlHashed = await hashUrl(url);
  homeURLHashed = await hashUrl(homeURL);

  const $ul = q('#public-note-list ul'),
    query = currentUrlHashed,
    sitewide_hash = homeURLHashed,
    sitewide_query = sitewide_hash.replace(/[^a-z0-9]/gi, '_');

  let notes = [];
  let queries = { 'query': query, 'sitewide': sitewide_query };

  $ul.innerHTML = '';

  for (let index in queries) {
    const searchQueryRequest = `${ARDOR_NODE}/nxt?requestType=searchTaggedData&chain=ignis&tag=note&query=${queries[index]}`;
    try {
      const queryResponse = await getRequest(searchQueryRequest);
      for (let i = 0; i < queryResponse.data.length && i < 3; i++) {
        const data = queryResponse.data[i];
        // we print the note for current URL
        // and loop thru homepage notes and print it if sitewide is included in the tag
        if (data && (index == 'query') || (index == 'sitewide' && data.tags.includes('sitewide'))) {
          const hash = data.transactionFullHash,
            noteRequest = `${ARDOR_NODE}/nxt?requestType=getTaggedData&chain=ignis&transactionFullHash=${hash}`,
            noteResponse = await getRequest(noteRequest),
            tags = noteResponse.tags.replace(/\s/g, '').split(',');

          if (noteResponse.isText && noteResponse.type == 'text/plain' && !tags.includes('encrypted')) {
            let note = snarkdown(escapeHTML(noteResponse.data)),
              sitewideClass = '';
            copyBtn = `<button class="copy">Clone</button>`;
            if (data.tags.includes('sitewide')) {
              sitewideClass = 'global';
            }
            const account = noteResponse.accountRS,
              time = getDateFormatted(noteResponse.transactionTimestamp),
              decipherBtn = `<button class='decipher-btn ${secondaryPass}'>Decipher</button>`;


            // one sitewide and one none-sitewide
            // This is to prevent the bug when we are on the home page where it would show a duplicate 
            // sitewide notes on the popup
            if (notes.length === 0 || (notes[0].note !== note && notes.length < 3)) {
              const isPledgeNote = data.tags.includes('pledge-note');
              const sender = data.accountRS;
              notes.push({ note, sitewideClass, time, account, decipherBtn, copyBtn, isPledgeNote, sender });
            } else {
              break;
            }

          }
        }
      }
    } catch (error) {
      console.log(error);
    }
  }
  handlePublicNotes(notes);
} //func printPublicNotes

async function handlePublicNotes(notes) {
  if (notes.length == 0) return;
  const $ul = q('#public-note-list ul');
  notes.sort(sortObjectByValue('time', 'desc'));
  for (let n of notes) {
    let { note, sitewideClass, time, account, isPledgeNote, sender } = n; 

    note = await cleanUpNote(note, sender);

    const li = `<li class="${sitewideClass}${isPledgeNote ? " pledge-note" : ''}">
          <div><h4>${time} - <span class="address"><a href="${ARDOR_NODE}/index.html?chain=${CHILD_CHAIN}&account=${account}" target="_BLANK">${account}</a></span></h4></div>
          <span class="raw-text" style="display:none;">${note}</span>
          <div class="note"><span class="pictogram" data-value="${account}"></span><span class="note-content">${note}</span></div>
        </li>`;
    $ul.innerHTML += li;
  }

  showElm('#public-note-list');

  const $pictos = document.querySelectorAll('#public-note-list .pictogram');
  for (let picto of $pictos) {
    new Pictogrify(picto.getAttribute('data-value'), 'monsters').render(picto)
  }
}

async function cleanUpNote(note, sender) {
  try {
    if(sender !== MASTER_ARDOR_ACCOUNT) throw 'Note not from master account';

    const noteObject = JSON.parse(note); 

    const { message='', account, amount, coin, time = new Date().toDateString() } = noteObject;
    let formatted = scientificToDecimal(amount)

    let alias = await searchAccountAlias(ARDOR_NODE, noteObject.account);
    let acctInfo = `<span class="account">${account}</span>`
    if (alias.length) {
      alias = alias.replace(alias[0],alias[0].toUpperCase());
      acctInfo = `<div class="alias"><span class="alias-name">@${alias}</span></div>`; 
    }
    const coinLabel = coin;

    return `<div><div class="account-container">${acctInfo}</div>
      <div class="pledge-amount"><strong>${+formatted} ${coinLabel.toUpperCase()}</strong><span class="date" style="opacity: 0.5"> &#8226; ${time}</span></div>
    </div>${message  && `<div class='note' style="opacity: 0.7;clear:left;"><em>${message}</em></div>`}`; 
  } catch (error) { 
    console.log(error)
    return note.replace(/(\r\n|\n|\r)/gm, "<br>");
  } 
}

function getRandColor(brightness) {
  // Six levels of brightness from 0 to 5, 0 being the darkest
  var rgb = [Math.random() * 256, Math.random() * 256, Math.random() * 256];
  var mix = [brightness * 51, brightness * 51, brightness * 51]; //51 => 255/5
  var mixedrgb = [rgb[0] + mix[0], rgb[1] + mix[1], rgb[2] + mix[2]].map(function (x) { return Math.round(x / 2.0) })
  return "rgb(" + mixedrgb.join(",") + ")";
}//func getRandColor

// Desc
function sortByKey(array, key) {
  return array.sort(function (a, b) {
    var x = a[key]; var y = b[key];
    return ((x > y) ? -1 : ((x < y) ? 1 : 0));
  });
}//func sortByKey

function getQueryParam(urlObj, param) {
  var result = urlObj.search.match(
    new RegExp("(\\?|&)" + param + "(\\[\\])?=([^&]*)")
  );
  return result ? result[3] : false;
}//func getQueryParam

function getPageTitle(url) {
  return window.fetch(`http://textance.herokuapp.com/title/${url}`).then(r => r.text()).then(response => response);
}//func getPageTitle

const hashUrl = async function (url) {
  return encode64(await hash256(url)).replace(/[^a-z0-9]/gi, '_');
} //func hashUrl

const encode64 = function (buff) {
  const hashArray = Array.from(new Uint8Array(buff));

  // convert bytes to hex string
  const hashHex = hashArray.map(b => ('00' + b.toString(16)).slice(-2)).join('');
  return hashHex;
} //func encode64

const supportHasing = function () {
  return window.crypto && crypto.subtle && window.TextEncoder;
} //func supportHasing

const hash256 = function (str) {
  if (!supportHasing) return '';
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
} //func hash


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
  return num;
}//func scientificToDecimal 

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

Date.prototype.customDateFormat = function (month) {
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "June", "July", "Aug", "Sept", "Oct", "Nov", "Dec"];

  const day = this.getDate();
  const year = this.getFullYear();
  return `${monthNames[this.getMonth()]} ${day}, ${year}`;
}

function getDateFormatted(timestamp) {
  // return current time if timestamp is undefined
  const dateObject = (typeof timestamp === "undefined") ?
    new Date() :
    new Date(timestamp * 1000 + 1514296800000 - 500),
    time = dateObject.toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });

  return `${dateObject.customDateFormat()} - ${time} EST`;
} //func getDateFormatted

function getRequest(request) {
  return window.fetch(request, {
    method: 'GET'
  }).then(res => res.json());
} //func getRequestResponse

function escapeHTML(string) {
  var pre = document.createElement('pre');
  var text = document.createTextNode(string);
  pre.appendChild(text);
  return pre.innerHTML;
} //func escapeHTML 

function i(id) {
  try {
    return document.getElementById(id);
  } catch (err) {
    return id;
    console.log(err);
  }
} //func i

function q(selector) {
  try {
    return document.querySelector(selector);
  } catch (err) {
    return selector;
    console.log(err);
  }
} //func q

function hideElm(selector) {
  const elm = q(selector);
  try {
    if (elm.style) elm.style.display = 'none';
  } catch (err) {
  }
}

function showElm(selector) {
  const elm = q(selector);
  try {
    if (elm.style) elm.style.display = 'block';
  } catch (err) {
  }
}

function removeElm(selector) {
  const elm = q(selector);
  if (elm) elm.remove();
}

