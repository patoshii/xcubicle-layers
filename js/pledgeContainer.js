;(function() {
  'use strict';

  let GLOBAL = { node: "https://a1.annex.network" };
  let coins = {};
  let CURRENT_URL,
    MASTER_ACCOUNT = "COIN-XXXX-XXXX-5496-B3YAC",
    urlHash,
    mode = 'pledge',
    balanceOutput,
    amount, 
    accountBalance, 
    coinLabel, 
    coinChosen, 
    pledgeNote, 
    recurrence,
    usdValue, 
    bountyQuestion, 
    bountyAnswer,
    coinAddress;
    const icons = {
      btc: "../images/btc-icon.png",
      ltc: "../images/ltc-icon.png",
      xmr: "../images/xmr-icon.png",
      eos: "../images/eos-icon.png",
      eth: "../images/eth-icon.png",
      sol: "../images/sol-icon.png",
      usdc: "../images/usdc-icon.png",
      usdt: "../images/usdt-icon.png",
      dai: "../images/dai-icon.png",
      coin: "../images/ignis-icon.png",
      oxen: "../images/oxen-icon.png",
    }; 
  
  document.addEventListener('DOMContentLoaded', async function () {
    const urlParams = new URLSearchParams(window.location.search);
    CURRENT_URL = urlParams.get('url').includes('gofundme.com') ? getFormattedGoFundMeUrl(new URL(urlParams.get('url'))) : urlParams.get('url'), 
    mode = urlParams.get('mode') || 'pledge';
  
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
  
    recurrenceOptionListener();
    coinSwap();
    pledgeConversionListener();
    submitPledgeListener();
  
    // INIT
    const balanceRes = await getBalanceResponse('solpub', coins.solpub)
    const balance = (balanceRes && balanceRes.balance) ? balanceRes.balance : 0;
    balanceOutput = formatBalanceMessage('solpub', balance);
  
    const imgBlob = await getImgBlob(coins.solpub);
    const url = URL.createObjectURL(imgBlob);
    q('#cdonate .balance').textContent = balanceOutput;
    q('#cdonate .coin-qr').src = url;
    q('#cdonate .coin-address').innerHTML = `
      <a href="${getExplorerLink("sol", coins.solpub)}" target="_blank">${coins.solpub}</a>
      <img src="${icons['sol']}" alt="coin-icon" style="width:30px;margin:5px auto 0 auto;"/>
      `;
  
    // USD conversion
    let { price } = await onMessageAPIWrapper({ requestType: "getConversionValue", coin: 'btc' });
    q('#total-price .price').textContent = price;
  
    if(mode && mode == 'bounty') {
      bountyMode();
    }
  
  });
  
  function bountyMode() {
   Array.from(document.querySelectorAll('.bounty-mode')).forEach(elm => elm.style.display = "block");
   Array.from(document.querySelectorAll('.pledge-mode')).forEach(elm => elm.style.display = "none");
   q('.pledge-btn').textContent = 'Make Bounty';
   q('title').textContent = 'Make a Bounty';
  } 
  
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
      const isBalanceHiddenCoin = (c) => c === 'xmr' || c === 'oxen';
      if (erc20Token !== undefined) coinSelect = 'ethpub';
  
      coinAddress = coins[getPublicKeyIndex(coinSelect)];
  
      try {
        let balanceOutput;
  
        if (coinSelect === 'eos') {
          balanceOutput = await handleEOSOutput();
        } else if (isBalanceHiddenCoin(coinSelect)) {
          balanceOutput = 'Your Balance: Hidden';
          coinAddress = coins['xmrpub']
        } else {
          let $pAmtClasses = q(".pledge-amount").classList;
          let $pBtnClasses = q(".pledge-btn").classList;
          $pAmtClasses.contains('disabled') ? $pAmtClasses.remove('disabled') : '';
          $pBtnClasses.contains('disabled') ? $pBtnClasses.remove('disabled') : '';
  
          const balanceRes = await getBalanceResponse(coinSelect, coinAddress)
          const balance = (balanceRes && balanceRes.balance)
            ? balanceRes.balance
            : 0;
  
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
        q('#cdonate .coin-address').innerHTML = `
          <a href="${explorerLink}" target="_blank">${coinAddress}</a>
          <img src="${icons[this.value]}" alt="coin-icon" style="width:30px;margin:5px auto 0 auto;"/>
        `;
        q('#cdonate .pledge-btn').value = 'Pledge ' + coinLabel; 
        q("#cdonate .pledge-amount").setAttribute('placeholder', `0.00 ${this.value.toUpperCase()}`)
  
        // USD conversion
        q('#total-price .label').textContent = this.value.toUpperCase();
        q("#total-price > a").href = getCoinPriceLink(this.value);
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
      recurrence = q(".recurrence-container input").value || 'One time pledge'
      usdValue = q('#pledge-usd-value em') ? q('#pledge-usd-value em').textContent : 0;
      bountyQuestion = q('.bounty-question') ? q('.bounty-question').value : null;
      bountyAnswer = q('.bounty-answer') ? q('.bounty-answer').value : null;
  
      const notSupportedPunctuationRegex = /[^a-z0-9!?.\s]+/i;
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
      const formattedCoinChosen = Constant.getCrypto(coinChosen);
      if (formattedCoinChosen && minimumAmountRequired(coinChosen, amount) === false) {
        alert(`Not Enough Funds to Pay for ${formattedCoinChosen} Network Fees - Minimum Balance Requirements: ${Constant.minimumAmountEnum[formattedCoinChosen]}`);
        return false;
      }
  
      if(mode == 'bounty' && (!bountyAnswer || !bountyQuestion)) {
        alert('Please fill in both the bounty question and bounty secret.');
        return false;
      } 
  
      function showPreview() {
        // Toggle confirmation box
        i(event.target.getAttribute('for')).checked = true;
        
        if(mode == 'bounty') {
          q('#cdonate__confirm .balance').textContent = `${amount} ${coinLabel}`;
          q('#cdonate__confirm .usd-value').textContent = usdValue;
          q('#cdonate__confirm .campaign-url').textContent = CURRENT_URL.length > 100 ? CURRENT_URL.substr(0,100) + '...' : CURRENT_URL;
          q('#cdonate__confirm .bounty-question').textContent = 'Bounty Tip: ' + bountyQuestion;
          q('#cdonate__confirm .bounty-answer').textContent =  'Bounty Secret: ' + bountyAnswer; 
        } else  { 
          q('#cdonate__confirm .balance').textContent = `${amount} ${coinLabel}`;
          q('#cdonate__confirm .usd-value').textContent = usdValue;
          q('#cdonate__confirm .campaign-url').textContent = CURRENT_URL.length > 100 ? CURRENT_URL.substr(0,100) + '...' : CURRENT_URL;
          q("#cdonate__confirm .recurrence").textContent = `Recurrence: ${recurrence}`;
          q('#cdonate__confirm .pledge-note').textContent = pledgeNote ? 'Message: ' + pledgeNote : ''; 
        }
      }
  
      showPreview();
  
    });
  
    q('#cdonate .pledge-submit').addEventListener('click', async (event) => {
      event.preventDefault();
      if (accountBalance < amount) {
        alert('Insufficient ' + coinLabel);
        return false;
      }
      // For bitcoin, seems like the min-amount is correlate to the current value of the bitcoin
      // min-amount needs to be increased when the bitcoin price goes up
      const formattedCoinChosen = Constant.getCrypto(coinChosen);
      if (formattedCoinChosen && minimumAmountRequired(coinChosen, amount) === false) {
        alert(`Not Enough Funds to Pay for ${formattedCoinChosen} Network Fees - Minimum Balance Requirements: ${Constant.minimumAmountEnum[formattedCoinChosen]}`);
        return false;
      } 

      const coinLabel = getCoinLabel(coinChosen);
      const pubAddress = q('#cdonate .coin-address').textContent.trim();
      const priIndex = getPrivateKeyIndex(coinChosen);
      const privateKey = coins[priIndex];
  
      let url = CURRENT_URL;
      let hash = urlHash;
  
      if (url.includes('gofundme.com')) {
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
  
      const DELAY_MAP = {
        "Every day": 24,
        "Every week" : 7 * 24,
        "Every month" : 4 * 7 * 24 
      };
  
      if(DELAY_MAP[recurrence]) { 
        //delay,repeat 
        message.delay = DELAY_MAP[recurrence] + ",99";
      }
  
      if (pledgeNote) message.pledgeNote = pledgeNote;
  
      if(mode == 'bounty') {
        const bountyURL = CURRENT_URL.replace(/(^http[s]?)/,'bounty');
        const bountyURLHash = await hashUrl(bountyURL);
        message.pledgeNote = `BOUNTY,${await hashUrl(bountyURL + bountyAnswer)},${bountyQuestion}`;
        message.url = bountyURL;
        message.urlHash = bountyURLHash;
      } 
  
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
  
  function recurrenceOptionListener () {
    const $options = q('.recurrence-options');
    const $containerBtn = q('.recurrence-container button');
    const $mainContainer = i('donate-modal');
    $containerBtn.addEventListener("click", (e) => { 
      $options.classList.toggle('visible'); 
      $mainContainer.classList.toggle('modal_hidden');
    }); 
  
    const $list = document.querySelectorAll('.recurrence-options__list li'); 
  
    for(let list of $list) { 
      list.addEventListener('click', e => { 
        const selectedText = e.currentTarget.textContent; 
  
        $mainContainer.classList.toggle('modal_hidden');
        q('.recurrence-options__list li.selected').classList.remove('selected');
        e.currentTarget.classList.add('selected');
        $containerBtn.textContent = selectedText;
        console.log(selectedText)
        q('.recurrence-container input').value = selectedText;
        $options.classList.toggle('visible'); 
      }) 
    } 
  }
  
  function pledgeConversionListener() {
    const $val = document.getElementById('pledge-usd-value');
    try {
      q('.pledge-amount').addEventListener('input', async function () {
        const coin = q('.coin-options option:checked').value;
        const value = +this.value;
        if (value > 0) {
          Array.from(document.querySelectorAll('#cdonate .fadeToggle')).forEach(elm => {
            elm.classList.replace('fadeToggle','fadeToggle--off')
          })
          const usd = await cryptoToUSD(coin, value);
          $val.innerHTML = `<strong>USD Value:</strong> <em>$${usd}</em>`;
          !q('.amount-container').classList.contains('active') ? q('.amount-container').classList.add('active') : null;
        } else {
          $val.innerHTML = `<strong>USD Value:</strong> <em>$0</em>`;
          q('.amount-container').classList.contains('active') ? q('.amount-container').classList.remove('active') : null;
          Array.from(document.querySelectorAll('#cdonate .fadeToggle--off')).forEach(elm => {
            elm.classList.replace('fadeToggle--off','fadeToggle')
          })
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
          alert('Please wait 45 seconds between each pledge');
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

  //pat added this, the yes/cancel buttons stayed on page. and it doesnt show the message above ^ not sure why.
  //Leon TODO
  document.querySelector(".pledge-submit").style.display = 'none';
  document.querySelector("#cdonate__confirm .pledge-btn").style.display = 'none';

  
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
})();
