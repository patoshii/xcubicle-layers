let GLOBAL = { node: "https://testardor.jelurida.com" };
let coins = {}
let CURRENT_URL;
let MASTER_ACCOUNT = "ARDOR-XXXX-XXXX-5496-B3YAC";
let urlHash;

document.addEventListener('DOMContentLoaded', async function () {
  const urlParams = new URLSearchParams(window.location.search);
  CURRENT_URL = urlParams.get('url');

  chrome.storage.local.get(['supportedTokens'], result => {
    result['supportedTokens'] && result['supportedTokens'].split(',').forEach(token => {
      const newElm = `<option value=${token}>${getCoinLabel(token)}`;
      q('.coin-options').insertAdjacentHTML('beforeend', newElm);
    })
  });
  GLOBAL['node'] = urlParams.get('node');
  urlHash = urlParams.get('hash');

  coins = { ...localStorage };

  q('.page-title').innerHTML = `<a href="${CURRENT_URL}" target="_BLANK">${CURRENT_URL}</a>`;

  coinSwap();
  pledgeConversionListener();
  submitPledgeListener();

  // INIT
  const balanceRes = await getBalanceResponse('btcpub', coins.btcpub)
  const balance = (balanceRes && balanceRes.balance) ? balanceRes.balance : 0;
  balanceOutput = formatBalanceMessage('btcpuc', balance);

  const imgBlob = await getImgBlob(coins.btcpub);
  const url = URL.createObjectURL(imgBlob);
  q('#cdonate .balance').textContent = balanceOutput;
  q('#cdonate .coin-qr').src = url;
  q('#cdonate .coin-address').innerHTML = `<a href="${getExplorerLink("btc", coins.btcpub)}" target="_blank">${coins.btcpub}</a>`;

  // USD conversion
  let { price } = await onMessageAPIWrapper({ requestType: "getConversionValue", coin: 'btc' });
  q('#total-price .price').textContent = price;

});

function getBalance(chain, account) {
  if (!account) console.error('Account is need to check the balance.');
  return window.fetch(`${GLOBAL['node']}/nxt?requestType=getBalance&chain=${chain}&account=${account}`, {
    method: "GET"
  }).then(res => res.json());
} //func getBalance

function coinSwap() {
  q('#cdonate .coin-options').addEventListener('change', async function () {
    // reset
    q('.pledge-amount').value = '';
    q('.pledge-note').value = '';
    q('#pledge-usd-value').innerHTML = '<strong>USD Value:</strong> <em>$0</em>';
    q('#total-price .price').textContent = '';
    removeElm('#cdonate .eos-label');

    let coinSelect = this.value;
    const coinLabel = this.options[this.selectedIndex].text;

    // use eth for USDC
    const erc20Tokens = ['usdc', 'usdt', 'dai'];
    const erc20Token = erc20Tokens.find(token => token === coinSelect);
    if (erc20Token !== undefined) coinSelect = 'ethpub';

    coinAddress = coins[getPublicKeyIndex(coinSelect)];

    try {
      let balanceOutput;

      if (coinSelect === 'eos') {
        balanceOutput = await handleEOSOutput();
      } else if (coinSelect === 'xmr') {
        balanceOutput = 'Your Balance: Hidden';
        coinAddress = coins['xmrpub']
      } else {
        $pAmtClasses = q(".pledge-amount").classList;
        $pBtnClasses = q(".pledge-btn").classList;
        $pAmtClasses.contains('disabled') ? $pAmtClasses.remove('disabled') : '';
        $pBtnClasses.contains('disabled') ? $pBtnClasses.remove('disabled') : '';

        const balanceRes = await getBalanceResponse(coinSelect, coinAddress)
        const balance = (balanceRes && balanceRes.balance)
          ? balanceRes.balance
          : 0;

         console.log(coinSelect, balance)
        balanceOutput = formatBalanceMessage(coinSelect, balance);

        if (erc20Token !== undefined) {
          const erc20BalanceRes = await getBalanceResponse(
            coinSelect,
            coinAddress,
            getERC20Address(erc20Token),
          );
          const tokenBalance = erc20BalanceRes &&
            erc20BalanceRes.message === 'OK'
            ? erc20BalanceRes.result
            : 0;
          balanceOutput = `Your Balance: ${formatCryptoDecimals(erc20Token, tokenBalance)} ${erc20Token.toUpperCase()}<br><span>${balance / Math.pow(10, 18)} ETH</span>`;
        }
      }

      const imgBlob = await getImgBlob(coinAddress);
      const url = URL.createObjectURL(imgBlob);
      const explorerLink = erc20Token ? `https://etherscan.io/token/${getERC20Address(erc20Token)}` : getExplorerLink(coinSelect, coinAddress);
      q('#cdonate').setAttribute('class', 'wrap-' + coinLabel.toLowerCase());
      q('#cdonate .balance').innerHTML = balanceOutput;
      q('#cdonate .coin-qr').src = url;
      q('#cdonate .coin-address').innerHTML = `<a href="${explorerLink}" target="_blank">${coinAddress}</a>`;
      q('#cdonate .pledge-btn').value = 'Pledge ' + coinLabel;

      // USD conversion
      q('#total-price .label').textContent = this.value.toUpperCase();
      let { price } = await onMessageAPIWrapper({ requestType: "getConversionValue", coin: this.value });
      q('#total-price .price').textContent = price;
    } catch (err) {
      console.log("Aeris Error: ", err);
    }
  });
}

async function handleEOSOutput() {
  let balanceOutput = "";
  try {
    const $eosElm = document.createElement('div');
    $eosElm.setAttribute('class', 'eos-label');
    const accountNames = await onMessageAPIWrapper({ requestType: "getEosAccountName", publicKey: coinAddress });
    if (accountNames[0]) {
      const accountName = accountNames[0];
      $eosElm.innerHTML = `<a href="https://eosflare.io/account/${accountName}" target="_BLANK">${accountName}</a>`;
      const b = await onMessageAPIWrapper({ requestType: "getEOSBalance", accountName });
      // API returns balance + coinlabel, so no need to call formatBalanceMessage
      balanceOutput = 'Your Balance: ' + b;
    } else {
      q(".pledge-amount").classList.add('disabled');
      q(".pledge-btn").classList.add('disabled');
      $eosElm.innerHTML = 'No EOS Account Linked to Key:'
      balanceOutput = 'Your Balance: 0.00 EOS';
    }
    q('#cdonate .balance').after($eosElm);
    return balanceOutput;
  } catch (error) {
    console.log("Aeris Error: ", error)
    return balanceOutput;
  }
}


function submitPledgeListener() {
  let amount, accountBalance, coinLabel, coinChosen, pledgeNote, usdValue;

  document.querySelectorAll('#cdonate__init input').forEach(elm => {
    elm.addEventListener('keydown', (event) =>{
      if(event.key === "Enter" || event.keyCode === 13) { 
        q('#cdonate .pledge-btn').click()
      } 
    })
  })

  q('#cdonate .pledge-btn').addEventListener('click',  event => {
    event.preventDefault();
    amount = q('#cdonate .pledge-amount').value * 1 || 0;
    accountBalance = q('.balance').textContent.split(' ')[2] * 1;
    coinChosen = q('#cdonate .coin-options').value;
    coinLabel = coinChosen.toUpperCase();
    pledgeNote = q('.pledge-note').value;
    usdValue = q('#pledge-usd-value em') ? q('#pledge-usd-value em').textContent : 0;

    const notSupportedPunctuationRegex = /[^a-z0-9!?.\s]+/;
    pledgeNote = pledgeNote.replace(notSupportedPunctuationRegex, ' ');

    if (!CURRENT_URL.substr(0,5).includes('http')) {
      alert('We only accept pledges from a valid domain (https/http)');
      return;
    }

    if (accountBalance < amount) {
      alert('Insufficient ' + coinLabel);
      return false;
    }
    // For bitcoin, seems like the min-amount is correlate to the current value of the bitcoin
    // min-amount needs to be increased when the bitcoin price goes up
    if (minimumAmountRequired(coinChosen, amount) === false) {
      alert('Not Enough Funds to Pay for Network Fees - Minimum Balance Requirements: .0001 BTC or .0001 ETH');
      return false;
    }

    // Toggle confirmation box
    i(event.target.getAttribute('for')).checked = true;

    q('#cdonate__confirm .balance').textContent = `${amount} ${coinLabel}`;
    q('#cdonate__confirm .usd-value').textContent = usdValue;
    q('#cdonate__confirm .campaign-url').textContent = CURRENT_URL.length > 100 ? CURRENT_URL.substr(0,100) + '...' : CURRENT_URL;
    q('#cdonate__confirm .pledge-note').textContent = pledgeNote ? 'Message: ' + pledgeNote : '';
  });

  q('#cdonate .pledge-submit').addEventListener('click', async (event) => {
    event.preventDefault();
    if (accountBalance < amount) {
      alert('Insufficient ' + coinLabel);
      return false;
    }
    // For bitcoin, seems like the min-amount is correlate to the current value of the bitcoin
    // min-amount needs to be increased when the bitcoin price goes up
    if (minimumAmountRequired(coinChosen, amount) === false) {
      alert('Not Enough Funds to Pay for Network Fees - Minimum Balance Requirements: .0001 BTC or .0001 ETH');
      return false;
    }

    const coinLabel = getCoinLabel(coinChosen);
    const pubAddress = q('#cdonate .coin-address').textContent;
    const priIndex = getPrivateKeyIndex(coinChosen);
    const privateKey = coins[priIndex];

    let url = CURRENT_URL;
    let hash = urlHash;

    if (url.includes('gofundme.com')) {
      let urlObj = new URL(url);
      url = `${urlObj.origin}/${urlObj.pathname.split('/').pop()}`;
      hash = await hashUrl(url);
    }

    let message = {
      coinPublic: pubAddress, //Sender
      coinPrivate: privateKey, //Sender Private
      coinChosen: coinLabel, //CoinType
      amount: amount, //Amount
      url: url, //URL
      urlHash: hash,
      nxtAddress: coins['nxtaddr']
    };

    if (pledgeNote) message.pledgeNote = pledgeNote;

    if (coinChosen == 'eos') {
      try {
        const accountNames = await onMessageAPIWrapper({
          requestType: 'getEosAccountName',
          publicKey: pubAddress
        });
        if (accountNames[0]) {
          message.accountName = accountNames[0];
        } else {
          return false;
        }
      } catch (error) {
        console.log('Layers Error: ', error);
      }
    }

    try {
      const getUID = await onMessageAPIWrapper({
        node: GLOBAL["node"],
        requestType: 'getAccountPropertyByPropertyName',
        searchProperty: 'Xcubicle Layers',
        account: coins['nxtaddr'],
        MASTER_ACCOUNT
      });

      if(getUID.properties) {
        // there should only be one uid, otherwise something is off
        if(getUID.properties.length > 1) throw "Found more than one UID property.";
        message.uid = getUID.properties[0].value;
      } 
      
    } catch (error) { console.log(error) } 

    sendMessage(message);
  })
}

function pledgeConversionListener() {
  const $val = document.getElementById('pledge-usd-value');
  try {
    q('.pledge-amount').addEventListener('input', async function () {
      const coin = q('.coin-options option:checked').value;
      const value = +this.value;
      if (value > 0) {
        const usd = await cryptoToUSD(coin, value);
        $val.innerHTML = `<strong>USD Value:</strong> <em>$${usd}</em>`;
        !q('.amount-container').classList.contains('active') ? q('.amount-container').classList.add('active') : null;
      } else {
        $val.innerHTML = `<strong>USD Value:</strong> <em>$0</em>`;
        q('.amount-container').classList.contains('active') ? q('.amount-container').classList.remove('active') : null;
      }
    });
  } catch (error) {
    console.log("Aeris Error: ", error);
  }
}


function sendMessage(message) {
  const xx = '5KNtqrAVpdgKYk4xghVwsJgi5B6wMFiHPj2YR8p1cj28JxN6i96';
  //Setting message to prunable for long messages.

  onMessageAPIWrapper({ node: GLOBAL['node'], requestType: 'sendMessage', recipient: MASTER_ACCOUNT, secretPhrase: encodeURIComponent(coins['nxtpass']), message: JSON.stringify(message) })
    .then(response => {
      if (!response.errorDescription) {
        q('.pledge-amount').value = '';
        q('.pledge-note').value = '';
        document.getElementById('processingMsg') ? document.getElementById('processingMsg').remove() : '';
        localStorage.setItem('tx_store', location.pathname + ';' + response.fullHash);

        displayProcessingMsg();
        alert(`${message['amount']} ${message['coinChosen']} pledged.`);
      } else if (response.errorDescription === 'Insufficient balance') {
        alert('Please wait 2 minutes between each pledge');
        console.log('Insufficient balance')
      }
    })
    .catch(error => console.error('Aeris Error:', error));
}

function displayProcessingMsg() {
  if (q('#processingMsg') || !q('.pledge-btn')) return;
  if (!localStorage.getItem('tx_store')) return;

  const txstore = localStorage.getItem('tx_store');
  const storeArray = txstore.split(';');
  const hash = storeArray[1];

  if (storeArray[0] !== location.pathname) return;
  onMessageAPIWrapper({ node: GLOBAL['node'], requestType: "getTransaction", chain: "IGNIS", query: hash })
    .then(response => {
      if (response.errorDescription) {
        localStorage.removeItem('txid');
      } else {
        const div = document.createElement('div');
        const account = coins['nxtaddr'];
        div.id = 'processingMsg';
        div.innerHTML = `<h2>Pledge Sent!</h2> <p>Processing in 2 hours. Your coins will be forwarded to the recipient if they are "verified". <br><br>If its a crowdfunding campaign it must also be fully funded for at least 14 days to prevent scams.</p><p>If there is not enough funds in your addresses, all your pending pledges on every site will be removed to help reduce spam.</p> Temporary ID: <a href="${GLOBAL['node']}/index.html?chain=IGNIS&account=${account}" target="_BLANK"> ${hash}</a>`;
        q('#cdonate__init-btn').before(div);

        const $cdonate = document.getElementById('cdonate');
        const containerHeight = $cdonate.clientHeight;
        const msgHeight = document.querySelector('#processingMsg').clientHeight;
        $cdonate.style.height = containerHeight + "px";

        const hideAll = document.querySelectorAll("#cdonate > *:not(#processingMsg)");
        hideAll.forEach((elm, key) => {
          elm.setAttribute('style', 'transition: 2s all; opacity: 0;')
          setTimeout(() => { elm.style.display = 'none' }, 1200);

          if (Object.is(hideAll.length - 1, key)) {
            setTimeout(() => { $cdonate.style.height = (msgHeight + 20) + "px"; }, 1000);
          }
        })
      }
    });
}

async function cryptoToUSD(coin, amt) {
  try {
    const $price = document.querySelector('#total-price .price');
    let totalPrice;

    if ($price && $price.textContent.length) {
      totalPrice = $price.textContent;
    } else {
      totalPrice = await onMessageAPIWrapper({ requestType: 'getConversionValue', coin });
      totalPrice = totalPrice.price;
    }
    const cryptoToUSD = +totalPrice * amt;
    return cryptoToUSD.toFixed(2);
  } catch (error) {
    console.log("Aeris Error:", error)
    return 0;
  }
}

function onMessageAPIWrapper(data) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(data, res => {
      resolve(res);
    })
  });
}
