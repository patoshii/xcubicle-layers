(function(window) {
  let GLOBAL_ACTIVE_NODE = 'https://a1.annex.network',
    GLOBAL_TESTNET_NODE = 'https://testardor.xcubicle.com',
    GLOBAL_MAINNET_NODE = 'https://a1.annex.network',
    CUSTOM_LEVEL = 'Not Set',
    CIPHER = 'disable',
    NOTE_POPUP = 'disable',
    CURRENT_TIME_STAMP = moment().unix(),
    TIMEZONE = moment.tz.guess() || 'America/New_York',
    NODE_TYPE = 'Testnet';

  document.addEventListener('DOMContentLoaded', function() {
    i('timestamp').max = new Date().toISOString().split('T')[0];

    const $testnetForm = document.getElementById('testnet-node-form'),
      $mainnetForm = document.getElementById('mainnet-node-form'),
      $activeBtn = document.querySelectorAll('.activeBtn'),
      $powerLevelForm = document.getElementById('power-level-form'),
      $blocktimestampForm = document.getElementById('blockTimestamp'),
      $supportedDomainForm = document.querySelector('#supported-domains form'),
      $supportedTokensForm = document.querySelector('#supported-tokens form'),
      $cipherForm = document.getElementById('cipher-option-form'),
      $notePopupForm = document.getElementById('note-popup-option-form'),
      $timezoneForm = document.getElementById('timezone-form'),
      $noteLimitForm = document.getElementById('noteDisplayLimit-form');

    $testnetForm.addEventListener('submit', testnetNodeFormHandler);
    $mainnetForm.addEventListener('submit', mainnetNodeFormHandler);
    $powerLevelForm.addEventListener('submit', customPowerHandler);
    $blocktimestampForm.addEventListener('submit', blocktimestampHandler);
    $cipherForm.addEventListener('submit', cipherFormHandler);
    $notePopupForm.addEventListener('submit', notePopupFormHandler);
    $supportedDomainForm.addEventListener('submit', supportedDomainsHandler);
    $supportedTokensForm.addEventListener('submit', supportedTokensHandler);
    $timezoneForm.addEventListener('submit', timezoneHandler);
    $noteLimitForm.addEventListener('submit', noteLimitHandler);

    //uncheck and hide other checkbox if 'all' is selected
    const domainCheckBox = document.querySelectorAll(
      '#supported-domains input[type="checkbox"]'
    );
    for (let checkbox of domainCheckBox) {
      checkbox.addEventListener('change', event => {
        const _this = event.currentTarget;
        if (_this.value === 'all' && _this.checked === true) {
          Array.prototype.forEach.call(domainCheckBox, elm => {
            if (elm !== _this) {
              !elm.parentNode.classList.contains('control-checkbox--fade') &&
                elm.parentNode.classList.add('control-checkbox--fade');
            }
          });
        } else {
          Array.prototype.forEach.call(domainCheckBox, elm => {
            elm.value !== 'google' &&
              elm.parentNode.classList.remove('control-checkbox--fade');
          });
        }
      });
    }

    for (let $active of $activeBtn) {
      $active.addEventListener('click', activeButtonHandler);
    }

    document.querySelector(
      '.your-timezone'
    ).textContent = `Your Timezone: ${moment.tz.guess()}`;
    document
      .querySelector('input#timezone')
      .setAttribute('placeholder', `e.g ${moment.tz.guess()}`);

    timezoneAutoComplete();

    const sidebars = document.querySelectorAll('.sidebar > div');
    const contents = document.querySelectorAll('.content > div'); 
    sidebars.forEach(nav => { 
      nav.addEventListener('click', (e) => { 
        sidebars.forEach(i => i.classList.remove('current'));
        contents.forEach(i => i.classList.remove('current'));
        const id = e.currentTarget.dataset.id;
        q(id).classList.add('current'); 
        e.currentTarget.classList.add('current'); 
      })
    })

    init();
  }); //event DOMContentLoaded

  function timezoneAutoComplete() {
    var dataList = document.getElementById('timezone-datalist');

    var jsonOptions = moment.tz.names();

    jsonOptions.forEach(function(item) {
      var option = document.createElement('option');
      option.value = item;
      dataList.appendChild(option);
    });
  }

  function init() {
    chrome.storage.local.get(
      [
        'testnetNode',
        'mainnetNode',
        'activeNode',
        'customPower',
        'supportedDomains',
        'supportedTokens',
        'blocktimestamp',
        'timezone',
        'noteDisplayLimit',
        'secondaryPass',
        'notePopup',
      ],
      async result => {
        if (result['testnetNode']) GLOBAL_TESTNET_NODE = result['testnetNode'];
        if (result['mainnetNode']) GLOBAL_MAINNET_NODE = result['mainnetNode'];
        if (result['activeNode']) {
          GLOBAL_ACTIVE_NODE = result['activeNode'];
          try {
            NODE_TYPE = await getNodeType(GLOBAL_ACTIVE_NODE);
            chrome.storage.local.set({ isTestnet: NODE_TYPE === 'Testnet' });
          } catch (error) {
            console.log(error, `check ${GLOBAL_ACTIVE_NODE} node.`);
            GLOBAL_ACTIVE_NODE = 'https://a1.annex.network';
            chrome.storage.local.set({
              activeNode: 'https://a1.annex.network'
            });
            chrome.storage.local.set({
              testnetNode: 'https://a1.annex.network'
            });
          }
        }

        if (result['customPower']) CUSTOM_LEVEL = result['customPower'];

        if (result['secondaryPass'])
          CIPHER = result['secondaryPass'] || 'disable';

        if (result['notePopup'])
          NOTE_POPUP = result['notePopup'] || 'disable';

        if (result['noteDisplayLimit'])
          q('.noteDisplayLimit .output .value').textContent = result[
            'noteDisplayLimit'
          ];

        if (result['timezone']) {
          TIMEZONE = result['timezone'];
          document.querySelector(
            '.set-timezone'
          ).textContent = 'Set Timezone: ' + result['timezone'];
        }

        if (result['blocktimestamp']) {
          const date = moment
            .unix(result['blocktimestamp'])
            .tz(TIMEZONE)
            .format('llll z');
          q('#timestamp-display .value').textContent = date;
        }

        if (result['supportedDomains']) {
          const domainArray = result['supportedDomains'].split(',');
          const allowAll = domainArray.find(elm => elm === 'all');
          for (let domain of domainArray) {
            const $elm = document.querySelector(
              `#supported-domains input[value="${domain}"]`
            );
            $elm.checked = true;
            allowAll &&
              domain !== 'all' &&
              $elm.parentNode.classList.add('control-checkbox--fade');
          }
        }

        if (result['supportedTokens']) {
          const tokenArray = result['supportedTokens'].split(',');
          for (let token of tokenArray) {
            const $elm = document.querySelector(
              `#supported-tokens input[value="${token}"]`
            );
            $elm.checked = true;
          }
          outputAddresses(tokenArray);
        }

        setStatus();

        try {
          const selector = NODE_TYPE === 'Mainnet' ? 'mainnet' : 'testnet';
          document.getElementById(selector).classList.add('active');
        } catch (error) {
          console.log('getNodeType error', error);
        }

        try {
          const timestamp = await getTimeStamp(GLOBAL_ACTIVE_NODE);
          const genesisBlockTime = NODE_TYPE == 'Mainnet'
            ? 1514764800
            : 1514296800;
          CURRENT_TIME_STAMP = +timestamp + genesisBlockTime;
          const date = moment
            .unix(CURRENT_TIME_STAMP)
            .tz(TIMEZONE)
            .format('llll z');
          q(
            '#blockTimestamp .current'
          ).innerHTML = `Current blockchain time: <strong>${date}</strong>`;
        } catch (error) {
          console.log('getTimeStamp Error', error);
        }
      }
    );
  } //func init

  async function testnetNodeFormHandler(event) {
    event.preventDefault();
    const $nodeInput = document.getElementById('testnet-node-input'),
      node = $nodeInput.value;

    try {
      const res = await validateNode(node);
      if (
        res &&
        res.blockchainState === 'UP_TO_DATE' &&
        res.blockchainState !== 'DOWNLOADING' &&
        res.isTestnet
      ) {
        GLOBAL_TESTNET_NODE = node;

        NODE_TYPE = 'Testnet';

        chrome.storage.local.set({ testnetNode: node });
        chrome.storage.local.set({ activeNode: node });
        chrome.storage.local.set({ isTestnet: true });
        q('#testnet .activeBtn').click();

        setStatus();
        alert('Node Updated.');
      } else {
        alert('Not a Valid Node.');
      }
    } catch (error) {
      alert('Not a Valid Node.');
      console.log(error);
    }
    $nodeInput.value = '';
  } //func testnetFormHandler

  async function mainnetNodeFormHandler(event) {
    event.preventDefault();
    const $nodeInput = document.getElementById('mainnet-node-input'),
      node = $nodeInput.value;

    try {
      const res = await validateNode(node);
      if (
        res &&
        res.blockchainState === 'UP_TO_DATE' &&
        res.blockchainState !== 'DOWNLOADING' &&
        !res.isTestnet
      ) {
        GLOBAL_MAINNET_NODE = node;

        NODE_TYPE = 'Mainnet';

        chrome.storage.local.set({ mainnetmNode: node });
        chrome.storage.local.set({ activeNode: node });
        chrome.storage.local.set({ isTestnet: false });
        q('#mainnet .activeBtn').click();

        setStatus();
        alert('Node Updated.');
      } else {
        alert('Not a Valid Node.');
      }
    } catch (error) {
      alert('Not a Valid Node.');
      console.log(error);
    }
    $nodeInput.value = '';
  } //mainnetNodeFormHandler

  function customPowerHandler(event) {
    event.preventDefault();
    const $powerInput = document.getElementById('power-input');

    let power = +$powerInput.value;
    let alertMsg = 'Power Level Set!';

    let scrypt = Number(power).toString().substring(0, 2);
    const suggest = '20' + Number(power).toString().substring(2);
    if (+scrypt > 20) {
      alert(scrypt + ' is too large for a scrypt key. Try ' + suggest);
      return;
    }

    if (power == 0 || power < 0) {
      alert('Power should be greater than 0');
      return;
    }

    if (power === 1815.9881521) {
      power = null;
      alertMsg = 'Custom Encryption Level REMOVED!';
    }

    chrome.storage.local.set({ customPower: power });

    alert(alertMsg);

    $powerInput.value = '';
    CUSTOM_LEVEL = power;
    setStatus();
  }

  function blocktimestampHandler(event) {
    event.preventDefault();
    const inputTime = i('timestamp').value;
    if (!moment(inputTime).isValid()) {
      alert('Invalid Time');
      return;
    }

    const timestamp = moment(inputTime).unix();

    chrome.storage.local.set({ blocktimestamp: timestamp });

    i('timestamp').value = '';
    event.target.submit();
  }

  async function activeButtonHandler(event) {
    if (!this.parentNode.classList.contains('active')) {
      const node = this.parentNode.querySelector('a').href.replace(/\/$/, "");

      chrome.storage.local.set({ activeNode: node });

      GLOBAL_ACTIVE_NODE = node;
      NODE_TYPE = await getNodeType(node);
      chrome.storage.local.set({ isTestnet: NODE_TYPE === 'Testnet' });
      document
        .querySelectorAll('.activeBtn')
        .forEach(btn => btn.parentNode.classList.remove('active')); 
      this.parentNode.classList.add('active');
    }
  }

  function cipherFormHandler(event) {
    event.preventDefault();
    const selected = document.querySelector(
      '#cipher-option [name="cipher"]:checked'
    ).value;
    chrome.storage.local.set({
      secondaryPass: selected
    });
    alert('Secondary Password: ' + selected);
  }

  function notePopupFormHandler(event) {
    event.preventDefault();
    const selected = document.querySelector(
      '#note-popup-option [name="note-popup"]:checked'
    ).value;
    chrome.storage.local.set({
      notePopup: selected
    });
    alert('Note Popup: ' + selected);
  }

  function supportedTokensHandler(event) {
    const $checked = document.querySelectorAll(
      '#supported-tokens input:checked'
    );
    let checkedValues = [];
    let values = 'btc';
    for (let $check of $checked) {
      checkedValues.push($check.value);
    }

    if (checkedValues.length) {
      values = checkedValues.toString();
    }

    chrome.storage.local.set({ supportedTokens: values });

    return false;
  }


  function supportedDomainsHandler(event) {
    const $checked = document.querySelectorAll(
      '#supported-domains input:checked'
    );
    let checkedValues = [];
    let values = '';
    for (let $check of $checked) {
      checkedValues.push($check.value);
    }

    if (checkedValues.length) {
      values = checkedValues.toString();
    }

    chrome.storage.local.set({ supportedDomains: values });

    return false;
  }

  function timezoneHandler(event) {
    const selectedTimezone = event.target.timezone.value;

    if (!!!moment.tz.zone(selectedTimezone)) {
      alert('Invalid timezone');
      return false;
    }
    chrome.storage.local.set({ timezone: selectedTimezone });
  }

  function noteLimitHandler(event) {
    const limit = event.target.limit.value;

    if (!isNaN(limit)) {
      chrome.storage.local.set({ noteDisplayLimit: limit });
    }
  }

  async function setStatus() {
    const $testnetNode = document.querySelector('#testnet a'),
      $mainnetNode = document.querySelector('#mainnet a'),
      $customLevel = document.querySelector('#custom-level .value'),
      $cipherOpt = document.querySelector(`#cipher-option [value="${CIPHER}"]`),
      $notePopupOpt = document.querySelector(`#note-popup-option [value="${NOTE_POPUP}"]`);
      
    NODE_TYPE = await getNodeType(GLOBAL_ACTIVE_NODE);

    $testnetNode.href = GLOBAL_TESTNET_NODE;
    $testnetNode.textContent = GLOBAL_TESTNET_NODE;

    $mainnetNode.href = GLOBAL_MAINNET_NODE;
    $mainnetNode.textContent = GLOBAL_MAINNET_NODE;

    if (NODE_TYPE == 'Testnet') {
      i('testnet').classList.add('active');
      i('mainnet').classList.remove('active');
    } else {
      i('testnet').classList.remove('active');
      i('mainnet').classList.add('active');
    }

    $customLevel.textContent = CUSTOM_LEVEL;

    $cipherOpt.checked = true;
    $notePopupOpt.checked = true;
  } //func setStatus

  function outputAddresses(tokens) { 
    if (!localStorage || !localStorage.length || tokens.length <= 0) return;

    let listhtml = ''; 

    if(tokens.includes('coin')) { 
      tokens.splice(tokens.indexOf('coin'),1, 'nxtaddr','nxtpass');
    }

    const filtered = Object.keys(localStorage).filter(coin => tokens.some(elm => coin.includes(elm)));
    const orderedKeys = filtered.sort();
    const isXmrOrOxen = (c) => c === 'xmr' || c === 'oxen';

    for (let key of orderedKeys) {
      let html = '';
      if (key.includes('pub')) {
        let coinLabel = key.split('pub')[0]; 
        if(isXmrOrOxen(coinLabel)) { 
          html = `<li class="${coinLabel}"> 
                  <details>
                    <summary><span class="icon"></span><strong>${getCurrencyName(key)}</strong></summary>
                    <p class="public-key">Public Key: ${localStorage.getItem(coinLabel+'pub')}</p>
                    <p class="public-key">Public Spend Key: ${localStorage.getItem(coinLabel+'pub-spend')}</p>
                    <p class="public-key">Public View Key: ${localStorage.getItem(coinLabel+'pub-view')}</p>
                    <p class="private-key">Private Spend Key: <span class="value">${localStorage.getItem(coinLabel+'pri-spend')}<span></p>
                    <p class="private-key">Private View Key: <span class="value">${localStorage.getItem(coinLabel+'pri-view')}<span></p>
                  </details>
                </li>`; 
          orderedKeys.splice(orderedKeys[coinLabel+'pub-spend'], 1);;
          orderedKeys.splice(orderedKeys[coinLabel+'pub-view'], 1);;
        } else {
          html = `<li class="${coinLabel}"> 
                  <details>
                    <summary><span class="icon"></span><strong>${getCurrencyName(key)}</strong></summary>
                    <p class="public-key">Public Key: ${localStorage.getItem(coinLabel+'pub')}</p>
                    <p class="private-key">Private Key: <span class="value">${localStorage.getItem(coinLabel+'pri')}<span></p>
                  </details>
                </li>`; 
        }
      }
      // nxtaddr / nxtpass
      if (key.includes('pass')) {
        let coinLabel = key.split('pass')[0];
        html = `<li class="${coinLabel}">
                  <details>
                    <summary><span class="icon"></span><strong>${getCurrencyName(key)}</strong></summary>
                    <p class="public-key">Public Key: ${localStorage.getItem('nxtaddr')}</p>
                    <p class="private-key">Private Key: <span class="value">${localStorage.getItem('nxtpass')}</span></p>
                  </details>
                </li>`;
        }
        listhtml += html;
    }
            
    const erc20 = ['usdt', 'usdc', 'dai'];
    const erc20Logos = {
      'usdt' : '../images/usdt-icon.png',
      'usdc' : '../images/usdc-icon.png',
      'dai' : '../images/dai-icon.png',
    };

    const filteredERC20 = erc20.filter(coin => tokens.some(c => c === coin)); 
    for(let coin of filteredERC20) { 
      listhtml += `<li class="${coin}">
                  <details>
                    <summary><span class="icon-img"><img src=${erc20Logos[coin]} alt=${coin.toUpperCase()}></span><strong>${coin.toUpperCase()}</strong></summary>
                    <p class="public-key">Public Key: ${localStorage.getItem('ethpub')}</p>
                  </details>
              </li>`; 
    }

    if (listhtml.length) {
      $privateKey = document.getElementById('addresses');
      $privateKey.innerHTML = `<ul> ${listhtml} </ul>
      `;
    }
  }

  function getCurrencyName(currencyCode) {
    if (!currencyCode) return;
    const c = currencyCode;
    switch (true) {
      case c.includes('btc'):
        return 'Bitcoin';
      case c.includes('eth'):
        return 'Ethereum';
      case c.includes('sol'):
        return 'Solana';
      case c.includes('ltc'):
        return 'Litecoin';
      case c.includes('seg'):
        return 'Segwit';
      case c.includes('xmrpri-spend') || c.includes('xmrpub-spend'):
        return 'Monero-Spend';
      case c.includes('xmrpri-view') || c.includes('xmrpub-view'):
        return 'Monero-View';
      case c === 'xmrpub':
        return 'Monero';
      case c.includes('oxenpri-spend') || c.includes('oxenpub-spend'):
        return 'Oxen-Spend';
      case c.includes('oxenpri-view') || c.includes('oxenpub-view'):
        return 'Oxen-View';
      case c === 'oxenpub':
        return 'Oxen';
      case c.includes('eos'):
        return 'EOS';
      case c.includes('nxt'):
        return 'COIN';
      default:
        return currencyCode;
    }
  }
})(window);

var user_keys = [], konami = '38,38,40,40,37,39,37,39,66,65';

document.onkeydown = function(e) {
  user_keys.push(e.keyCode);

  if (user_keys.toString().indexOf(konami) >= 0) {
    Array.from(document.querySelectorAll('.section.konami')).forEach(v =>
      v.classList.remove('konami'));

    user_keys = [];
  }
};
