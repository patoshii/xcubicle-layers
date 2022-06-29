(function(window) {
  'use strict';

  const GLOBAL = {
    globalUrl: '',
    globalUrlHashed: '',
    globalPrivateUrlHashed: '',
    currentUrl: '',
    currentUrlHashed: '',
    currentPrivateUrlHashed: '',
    powerLevel: 'default',
    node: 'https://testardor.xcubicle.com',
    mainnet: 'https://a1.annex.network',
    chain: 'IGNIS',
    pageTitle: ''
  };

  const MASTER_ARDOR_ACCOUNT = 'COIN-XXXX-XXXX-5496-B3YAC';

  let PAGE_SUPPORTED = false;
  let ALLOW_PLEDGE = false;
  let ALLOW_ALL = false;
  let SUPPORTED_TOKENS = [];
  let CUSTOM_BLOCK_TIMESTAMP = moment().unix();
  let TIMEZONE = moment.tz.guess();
  let NOTE_DISPLAY_LIMIT = 3;

  let secondaryPass = 'disable';
  let nodeType = 'Testnet';
  let isGoogleMap = false;
  let isGoFundMe = false;
  let bountyDetected = false; 
  let bountyHash;
  let registrationLink = "https://docs.google.com/forms/d/e/1FAIpQLSe0tLkBfglKU3DVf8zkfO2XWSDA9WAZUx95OxkfW8ncU5LLcQ/viewform?usp=pp_url&entry.760043283=";

  let privateNoteCounter = 0;

  document.addEventListener('DOMContentLoaded', function() {
    q('.returning-user').addEventListener('click', event => {
      event.currentTarget.parentElement.classList.toggle('open');
      i('login-box').classList.toggle('open');
    });

    q('#scatter-toggle input').addEventListener('change', function() {
      if (this.checked) {
        i('login-box').classList.add('scatter-on');
        i('salt').value = '';
      } else {
        i('login-box').classList.remove('scatter-on');
      }
    });

    q('.scatter').addEventListener('click', event => {
      if (i('xprime').value.length == 0) {
        alert('Please enter your email.');
        return;
      }

      const loader = createLoadingAnimationElement();
      q('.scatter').appendChild(loader);
      fireUpScatterPrompt();
    });

    init();
  }); //event DOMContentLoaded

  // Initialize Scatterjs lib
  // check for scatter login
  // then sign message
  async function fireUpScatterPrompt() {
    try {
      ScatterJS.plugins(new ScatterEOS());

      const network = ScatterJS.Network.fromJson({
        blockchain: 'eos',
        chainId: 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906',
        host: 'nodes.get-scatter.com',
        port: 443,
        protocol: 'https'
      });

      const connected = await ScatterJS.connect('xcubicle', { network });

      if (connected) {
        ScatterJS.scatter
          .checkLogin()
          .then(logged => {
            removeElm('.loading');
            alert('Switch to your scatter App.');
            if (!logged) {
              ScatterJS.scatter
                .login()
                .then(async info => {
                  let email = i('xprime').value.length > 12
                    ? i('xprime').value.match(/.{1,12}/g).join(' ')
                    : i('xprime').value;
                  const data = 'xCubicle Layers Login using ' + email;
                  try {
                    const signed = await ScatterJS.scatter.getArbitrarySignature(
                      info.accounts[0].publicKey,
                      data
                    );
                    i('salt').value = signed;
                    i('btn').click();
                    setLocalStorage('scatter-login', '1');
                  } catch (error) {
                    ScatterJS.logout();
                    console.log('Aeris Error: ', error.message);
                  }
                })
                .catch(error => {
                  console.log('Aeris Error: ', error.message);
                });
            } else {
              alert('You have already linked your Scatter to this app.');
            }
          })
          .catch(error => {
            console.error('Aeris Error: ', error.message);
          });
      } else {
        alert('Make sure Scatter App is Opened.');
      }
    } catch (error) {
      console.log('Aeris Error: ', error);
      alert('Make sure scatter App is Opened.');
    }

    removeElm('.loading');
  } //func fireUpScatterPrompt

  function init() {
    chrome.tabs.query(
      { active: true, currentWindow: true },
      async function(tabs) {
        const urlObj = new URL(tabs[0].url);
        let currentUrl = urlObj.origin + urlObj.pathname.toLowerCase();

        // Remove trailing symbols
        currentUrl = currentUrl.replace(/\/$|\/#$|#$/gi, '');
        // Only need the latitude and longtitude hashed for google maps
        if (urlObj.href.includes('https://www.google.com/maps')) {
          currentUrl = getGoogleMapsURL(urlObj.href);
        }

        isGoogleMap = /^https:\/\/(.*\.)?google\.com\/((maps).)/.test(urlObj);
        isGoFundMe = /^https:\/\/(.*\.)?gofundme\.com/.test(urlObj);

        GLOBAL['globalUrl'] = getUrlHostName(currentUrl);

        const chromeID = location.hostname;
        q('.chrome-id').textContent = `This App ID is: ${chromeID}`;

        if (GLOBAL['currentUrl'].length > 450) handleLongURLs();

        // Store the currentUrl, this variable should never be re-assigned through out the script.
        GLOBAL['currentUrl'] = currentUrl;

        [
          GLOBAL['currentUrlHashed'],
          GLOBAL['globalUrlHashed']
        ] = await Promise.all([
          hashUrl(currentUrl),
          hashUrl(GLOBAL['globalUrl'])
        ]);

        q('#current-url').textContent = currentUrl;

        GLOBAL['pageTitle'] = tabs[0].title;
        chrome.storage.local.get(
          [
            'activeNode',
            'testnetNode',
            'mainnetNode',
            'customPower',
            'secondaryPass',
            'initContent',
            'pageSupported',
            'supportedDomains',
            'supportedTokens',
            'blocktimestamp',
            'timezone',
            'noteDisplayLimit'
          ],
          async function(result) {

            if (result['activeNode']) {
              GLOBAL['node'] = result['activeNode'] || GLOBAL['mainnet']; 
              try {
                const res = await validateNode(GLOBAL['node']); 
                if(!res || (res && res.errorDescription)) { 
                  throw 'Node is throwing an error.';
                } 
              } catch (error) { 
                  alert('We are having trouble accessing your Ardor Node. Please double check ' + GLOBAL['node']);
                  window.close();
              }
            }

            if (result['testnetNode'])
              i('testnet').setAttribute('src-href', result['testnetNode']);

            if (result['mainnetNode'])
              i('mainnet').setAttribute('src-href', result['mainnetNode']);
             
            if (result['pageSupported'] || allowedPledge(new URL(GLOBAL['currentUrl']))) {
              PAGE_SUPPORTED = true;
              ALLOW_PLEDGE = PAGE_SUPPORTED;
            } 

            if (result['supportedDomains'].split(',').includes('all'))
              ALLOW_ALL = true;

            if(result['supportedTokens'])
              SUPPORTED_TOKENS = result['supportedTokens'].split(',');

            if (result['blocktimestamp'])
              CUSTOM_BLOCK_TIMESTAMP = result['blocktimestamp'];

            if (result['timezone']) TIMEZONE = result['timezone'];

            if (result['customPower']) {
              GLOBAL['powerLevel'] = result['customPower'];
              i('power-message').textContent = 'Custom Power Level Is On.*';
            }

            if (result['noteDisplayLimit'])
              NOTE_DISPLAY_LIMIT = result['noteDisplayLimit'];

            // save the hased URl so we can use them on notes.html page
            chrome.storage.local.set({
              source: currentUrl,
              currentUrlHashed: GLOBAL['currentUrlHashed'],
              globalUrlHashed: GLOBAL['globalUrlHashed'],
              account: getLocalStorage('nxtaddr'),
              node: GLOBAL['node']
            });

            const $nodeTypes = document.querySelectorAll('#node-type a');
            for (let nodetype of $nodeTypes) {
              nodetype.addEventListener('click', event => {
                const href = event.target.getAttribute('src-href');
                if (href !== null) {
                  $nodeTypes.forEach(node => {
                    node.classList.remove('active');
                  });
                  event.target.classList.add('active');

                  chrome.storage.local.set({ activeNode: href });
                  GLOBAL['node'] = href;
                  getLocalStorage('nxtaddr') ? restoreSession() : '';
                }
              });
            }

            defineNodeType();

            // This is how we determine if we logged in or not,
            // So then we don't 'login' everytime we switch tabs
            if (getLocalStorage('nxtaddr')) {
              const loggedin = result['initContent'];
              if (loggedin) {
                switchContentUI(result['initContent']);
              }
              chrome.tabs.query(
                { active: true, currentWindow: true },
                function(tabs) {
                  chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'restore'
                  });
                }
              );
              restoreSession();
            } else {
              initLoginPage();
            }

            // #comment/note
            const secondPassEnabled = result['secondaryPass'];
            if (secondPassEnabled) {
              secondaryPass = result['secondaryPass'];
            }
            q('label[for="secondary-pass"]').className = secondaryPass;
          }
        );
      }
    );

    hideElm('#logout');

    i('logout').addEventListener('click', logout);
    i('toggle-expert-mode').addEventListener('click', event => {
      event.preventDefault();
      i('power-select').classList.toggle('visible');
    });

    // Get the power level from the radio buttons
    // Remove the custom set power level from the option page as well
    const $radios = document.getElementsByName('power-level');
    for (let radio of $radios) {
      radio.addEventListener('click', () => {
        GLOBAL['powerLevel'] = radio.value === 'default'
          ? 'default'
          : +radio.value;
        chrome.storage.local.remove('customPower');
        i('power-message').textContent = '';
      });
    }

    // COMMENT/NOTE SECTION #comment/note
    q('#note-box .sync').addEventListener('click', uploadNote);
    q('#note-box .local').addEventListener('click', saveNoteLocal);

    i('note').addEventListener('keyup', characterLimitHandler);
    i('note').addEventListener('paste', characterLimitHandler);

    // re-assign GLOBAL['currentUrlHashed'] when the user selects between 'sitewide' and 'current site'
    i('save-global').addEventListener('change', async function(event) {
      const isChecked = this.checked;
      const txNode = q('.save-global__desc');
      let updatedUrl;
      if(isChecked) {
        updatedUrl = getUrlHostName(GLOBAL['currentUrl'])
        txNode.textContent = 'Show on every page. Private Only';
        hideElm('#public-note-container');
      } else {
        updatedUrl = GLOBAL['currentUrl'];
        txNode.textContent = 'Show on every page';
        showElm('#public-note-container');
      }

      q('#current-url').textContent = updatedUrl;

      GLOBAL['currentUrlHashed'] = await hashUrl(updatedUrl);
    });

    i('secondary-pass').addEventListener('change', function(event) {
      q('.custom-pass').classList.toggle('active');
    });

    i('public-note').addEventListener('change', function(event) {
      if (this.checked) {
        hideElm('#note-box button.local');
        hideElm('#save-global-container');
        i('save-global').checked = false;
        q('#current-url').textContent = GLOBAL['currentUrl'];
      } else {
        q('#note-box button.local').style.display = 'inline';
        showElm('#save-global-container');
      }
    });

    // Dynamic elements.
    // For Copy, Decrypt, and Delete button
    document.addEventListener('click', async event => {
      if (event.target.className.split(' ').includes('decrypt-btn')) {
        const noteEl = event.target
          .closest('li')
          .querySelector('.note span.note-content'),
          rawText = event.target.closest('li').querySelector('.raw-text'),
          note = event.target.getAttribute('data-note');

        try {
          const text = note.replace(' ', '');
          let decryptedText = await aesGcmDecrypt(
            text,
            getLocalStorage('btcpri')
          );
          decryptedText = attemptJSONParse(decryptedText);
          decryptedText = typeof decryptedText === 'object'
            ? decryptedText.note
            : decryptedText;
          try {
            decryptedText = decodeURIComponent(decryptedText);
          } catch (e) {
            console.log('weird text', e);
          }
          rawText.textContent = decryptedText;
          noteEl.innerHTML = snarkdown(escapeHTML(decryptedText)).replace(
            /(\r\n|\n|\r)/gm,
            '<br>'
          );
          event.target.style.display = 'none';
        } catch (error) {
          console.log(error);
        }
      }
      if (event.target.className.split(' ').includes('decipher-btn')) {
        const noteEl = event.target
          .closest('li')
          .querySelector('.note .note-content');
        const rawText = event.target.closest('li').querySelector('.raw-text');
        let text = noteEl.innerHTML;
        const decipherCode = prompt(
          '**Enter your password to decipher the text'
        );
        if (decipherCode != null) {
          text = text.replace(/<br>/g, '\n');
          const d = vigenereCipher(text, decipherCode, true);
          noteEl.innerHTML = d.replace(/(\r\n|\n|\r)/gm, '<br>');
          rawText.textContent = d;
        }
      }
      if (event.target.className === 'copy') {
        const noteEl = event.target.closest('li').querySelector('.raw-text'),
          note = noteEl.textContent;
        i('note').value = note;
      }
      if (event.target.className === 'delete') {
        const index = event.target.getAttribute('data-index');
        if (!index) return;

        chrome.storage.local.get([index], function(result) {
          if (result[index] && result[index].length > 0) {
            result[index].splice(index, 1);
            chrome.storage.local.set(result);
            event.target.closest('li').style.display = 'none';
          }
        });
      }
      if (event.target.className === 'note-content') {
        event.target
          .closest('li')
          .querySelector('.note')
          .classList.toggle('active');
      }
    });

    i('toggle-global-note').addEventListener('click', function(event) {
      const label = this.textContent.split(' ')[0].toLowerCase();
      const $globalNotes = document.querySelectorAll('.global');
      for (const note of $globalNotes) {
        note.style.display = label === 'hide' ? 'none' : 'block';
      }
      this.textContent = label === 'hide' ? 'Show Sitewide' : 'Hide Sitewide';
    }); //toggle global note

    i('decrypt-all').addEventListener('click', async () => {
      const $decryptBtn = document.querySelectorAll('.notes .decrypt-btn');

      for (const btn of $decryptBtn) {
        const noteEl = btn.closest('li').querySelector('.note .note-content'),
          rawText = btn.closest('li').querySelector('.raw-text'),
          note = btn.getAttribute('data-note');
        try {
          const text = note.replace(' ', '');
          let decryptedText = await aesGcmDecrypt(
            text,
            getLocalStorage('btcpri')
          );
          decryptedText = attemptJSONParse(decryptedText);
          decryptedText = typeof decryptedText === 'object'
            ? decryptedText.note
            : decryptedText;
          try {
            decryptedText = decodeURIComponent(decryptedText);
          } catch (e) {
            console.log('weird text', e);
          }
          rawText.textContent = decryptedText;
          noteEl.innerHTML = snarkdown(escapeHTML(decryptedText)).replace(
            /(\r\n|\n|\r)/gm,
            '<br>'
          );
          btn.style.display = 'none';
        } catch (error) {
          console.log(error);
        }
      }
    }); //decrypt all

    i('self-note').addEventListener('click', event => {
      const $publicList = document.querySelectorAll('#public-note-list ul li');
      for (const list of $publicList) {
        const address = list.querySelector('.address').textContent,
          currentAddress = localStorage.getItem('nxtaddr');
        if (address !== currentAddress) list.style.display = 'none';
      }
    }); //self-note

    // Switch between comments, pledge
    const $contentSwitch = document.querySelectorAll('#content-switch a');
    for (let c of $contentSwitch) {
      c.addEventListener('click', event => {
        const value = event.target.getAttribute('id');
        switchContentUI(value);
        chrome.storage.local.set({ initContent: value });
      });
    } 
  }

  function switchContentUI(v) {
    if (v == 'pledge') {
      i('pledge-content').classList.add('on');
      i('comment-content').classList.remove('on');

      i('pledge').classList.add('active');
      i('comment').classList.remove('active');
    } else if (v == 'comment') {
      i('comment-content').classList.add('on');
      i('pledge-content').classList.remove('on');

      i('comment').classList.add('active');
      i('pledge').classList.remove('active');
    } else {
      console.log(v);
    }
  } //func switchContentUI

  function initLoginPage() {
    i('initForm').classList.add('show');

    i('salt').addEventListener('input', function(event) {
      q('body').classList.add('closed');
      const salt = event.currentTarget.value;
      if (salt) {
        i('salt').classList.add('focus');
        i('btn').classList.add('show');
      } else {
        i('btn').classList.remove('show');
        i('salt').classList.remove('focus');
      }
    });

    i('togglePass').addEventListener('click', function(event) {
      const value = event.currentTarget.value;
      if (value == 'Show') {
        event.currentTarget.value = 'Hide';
        i('salt').type = 'text';
      } else {
        event.currentTarget.value = 'Show';
        i('salt').type = 'password';
      }
    });

    i('btn').addEventListener('click', function(event) {
      event.preventDefault();
      const email = i('xprime').value;
      const salt = i('salt').value; 
      if(!isEmailAddress(email)) {
        alert('Please enter a valid email address');
        return;
      }
      if (email && salt) {
        i('login-box').classList.add('fadeOut');
        i('initForm').classList.add('fadeOut');
        generateNXT();
      }
    });
  } //func initLoginPage

  function generateNXT() {
    let power = GLOBAL['powerLevel'];
    console.log(power)

    i('progressText').textContent = 'Generating';
    hideElm('#toggle-expert-mode');
    i('power-select').classList.remove('visible');

    generate(
      power,
      'bitcoin',
      result => {
        setResult('btcpub', result.public);
        setResult('btcpri', result.private);

        setLocalStorage('btcpub', result.public);
        setLocalStorage('btcpri', result.private);

        const addedSalt = i('salt').value,
          nxtpass = addedSalt + '' + result.private,
          publicKey = createNXT(nxtpass).publicKey;

        let address = createNXT(nxtpass).accountID;

        address = address.replace(/NXT/i, 'COIN');
        setResult('nxtaddr', address);
        setResult('nxtpub', publicKey);
        setResult('nxtpass', nxtpass);

        setLocalStorage('nxtaddr', address);
        setLocalStorage('nxtpub', publicKey);
        setLocalStorage('nxtpass', nxtpass);

        generateAltCoins(result.private, power);
        generateEOS(result.private);
      },
      null,
      false
    );
  } //func generateNXT

  function generateAltCoins(privateKey, power) {
    // total of 4 alt coins
    const altCoins = ['litecoin', 'ethereum', 'segwit', 'oxen', 'monero'];
    for (let altcoin of altCoins) {
      let alt = altCoinCode(altcoin);
      i('progressText').textContent = 'Generating alt coins...';

      generate(
        power,
        altcoin,
        result => {
          if (alt === 'seg') {
            // q('#btc-add em').last().html(result.public);
          }
          if (alt === 'oxen' || alt === 'xmr') {
            setResult(`${alt}pub`, result.public);
            setResult(`${alt}pub-spend`, result.public_spend);
            setResult(`${alt}pri-spend`, result.private_spend);
            setResult(`${alt}pub-view`, result.public_view);
            setResult(`${alt}pri-view`, result.private_view);

            setLocalStorage(`${alt}pub`, result.public);
            setLocalStorage(`${alt}pub-spend`, result.public_spend);
            setLocalStorage(`${alt}pri-spend`, result.private_spend);
            setLocalStorage(`${alt}pub-view`, result.public_view);
            setLocalStorage(`${alt}pri-view`, result.private_view);
            login();
          } else {
            setResult(`${alt}pub`, result.public);
            setResult(`${alt}pri`, result.private);

            setLocalStorage(`${alt}pub`, result.public);
            setLocalStorage(`${alt}pri`, result.private);
          }
        },
        privateKey,
        true
      );
    }
  } //func generateAltCoins

  function generateEOS(btcpri) {
    const privateKey = eosjs_ecc.seedPrivate(btcpri);
    const publicKey = eosjs_ecc.privateToPublic(privateKey);

    setResult(`eospub`, publicKey);
    setResult(`eospri`, privateKey);

    setLocalStorage(`eospri`, privateKey);
    setLocalStorage(`eospub`, publicKey);
  }

  function login() {
    i('xprime').value = '';
    i('salt').value = '';

    switchContentUI('pledge');

    reloadInjectedPage();

    setLoginInterface();
  } //func login

  function restoreSession() {
    for (let [key, value] of Object.entries(localStorage)) {
      try {
        setResult(key, value);
      } catch (error) {
        console.log(error);
      }
    }
    setLoginInterface();
  } //func restoreSession

  async function setLoginInterface() {
    const account = getLocalStorage('nxtaddr');

    const cryptos = {
      btc: getLocalStorage('btcpub'),
      eth: getLocalStorage('ethpub'),
      ltc: getLocalStorage('ltcpub'),
      eos: getLocalStorage('eospub'),
      coin: getLocalStorage('nxtaddr'),
    };

    const hiddenBalanceCoin = {
      oxen: getLocalStorage('oxenpub'),
      xmr: getLocalStorage('xmrnpub'), 
    }

    const erc20 = {
      'usdt': getERC20Address('usdt'),
      'usdc': getERC20Address('usdc'),
      'dai': getERC20Address('dai'),
    };

    const supportedCoins = {...cryptos, ...hiddenBalanceCoin, ...erc20};

    const filtered = Object.keys(supportedCoins).filter(coin =>  SUPPORTED_TOKENS.some(i => i.includes(coin))) ;

    filtered.forEach(async crypto => {
      const address = supportedCoins[crypto]; 
      if (crypto == 'eos') {
        const eosAccountName = await getEOSAccountNames(supportedCoins['eos']);
        q(`#cryptos .eos .address`).innerHTML = `<a href="https://eosflare.io/key/${supportedCoins['eos']}" target="_BLANK">${supportedCoins['eos']}</a>`;
        let descMarkup;
        if (eosAccountName.account_names.length) {
          const name = eosAccountName.account_names[0];
          const eb = await getEOSBalance(name);
          descMarkup = `<strong><a href="https://eosflare.io/account/${name}" target="_BLANK" style="all:unset; text-transform: uppercase; color: #ff5052; cursor: pointer;">${name}</a> - </strong>${eb}`;
        } else {
          descMarkup = 'No Account Name Detected';
        }
        q('#cryptos .eos .desc').innerHTML = descMarkup;
      } else if(crypto in hiddenBalanceCoin) {
        q( `#cryptos .${crypto} .address`).innerHTML = `<a href="${getExplorerLink(crypto, getLocalStorage(crypto+'pub'))}" target="_BLANK">${getLocalStorage(crypto+'pub')}</a>`;
      } else {
        const explorer = getExplorerLink(crypto, cryptos[crypto]);
        q(`#cryptos .${crypto} .address`
        ).innerHTML = `<a href="${explorer}" target="_BLANK">${address}</a>`;
        const isERC20 = crypto in erc20;
        if(isERC20) {
          const res = await getBalanceResponse(crypto, supportedCoins['eth'], erc20[crypto]) 
          q(`#cryptos .${crypto} .balance`).textContent = formatCryptoDecimals(crypto, res.result,); 
          q(`#cryptos .${crypto} .address`).innerHTML = `<a href="${getExplorerLink('eth', getLocalStorage('ethpub'))}" target="_BLANK">${getLocalStorage('ethpub')}</a>`;
        } else {
          const res =  await getBalanceResponse(crypto, address);
          q(`#cryptos .${crypto} .balance`).textContent = formatCryptoDecimals(crypto, res.balance); 
        }
      }
        q(`#cryptos .${crypto}`).classList.add('show');
    }); 

    showElm('#cryptos');

    // Get Alias
    const aliasName = await searchAccountAlias(GLOBAL['node'], account);
    if (aliasName) {
      q('#detail .account-alias').innerHTML = '@' + aliasName;
      i('detail').classList.add('aliased');
    } else {
      i('detail').classList.remove('aliased');
    }

    // Get Balance
    setTimeout(
      () => {
        getBalance(GLOBAL['node'],GLOBAL['chain'], account).then(res => {
          new Pictogrify(account, 'monsters').render(i('pictogram'));

          q(
            '#account-detail .account-name'
          ).innerHTML = `<a href="${GLOBAL['node']}/index.html?chain=${GLOBAL['chain']}&account=${account}" target="_BLANK">${account.replace(/ardor-/i, '')}</a>`;
          const balance = scientificToDecimal(+res.balanceNQT / 100000000);
          q(
            '#account-detail .account-balance'
          ).innerHTML = `${balance} COIN`;

          const data = {
            accountAddress: getLocalStorage('nxtaddr'),
            coins: JSON.stringify(localStorage),
            balance: +res.balanceNQT
          };

          chrome.storage.local.set(data, function() {
            // sent stuff to content script
            chrome.tabs.query(
              {
                active: true,
                currentWindow: true
              },
              function(tabs) {
                chrome.tabs.sendMessage(tabs[0].id, data);
              }
            );
          });
        });
      },
      0
    );

    showElm('#content-switch');

    hideElm('#initForm');

    showElm('#logout');
    showElm('#account-detail');
    hideElm('#toggle-expert-mode');

    removeElm('#activate-account');
    q('.pledges a').href = '/html/pledges.html?address=' + account;

    i('power-message').textContent = '';
    showUnconfirmedMessage();

    let is_registered_from_enchant = false;
    try {
      is_registered_from_enchant = await accountRegistered(
        GLOBAL['node'],
        account,
        MASTER_ARDOR_ACCOUNT
      );
    } catch (error) {
      console.log('Aeris: Account not registered via our website.');
    }

    if (is_registered_from_enchant) {
      messageCount();
      campaignStatus();
      printPledgeVerifiedNotes();
      showElm('.pledges');
    } else {
      q(
        '.campaign-status'
      ).innerHTML = "<p>Unable to Pledge. Register on <a href='https://layers.xcubicle.com/' target='_blank'>layers.xcubicle.com</p>";
      ALLOW_PLEDGE = false;
    }

    checkAccountStatus(account, getLocalStorage('nxtpub'));

    GLOBAL['globalPrivateUrlHashed'] = await hashUrl(
      getLocalStorage('nxtpass') + GLOBAL['globalUrl']
    );
    GLOBAL['currentPrivateUrlHashed'] = await hashUrl(
      getLocalStorage('nxtpass') + GLOBAL['currentUrl']
    );

    chrome.storage.local.set({
      currentPrivateUrlHashed: GLOBAL['currentPrivateUrlHashed'],
      globalPrivateUrlHashed: GLOBAL['globalPrivateUrlHashed']
    });

    // #comment/note
    printNotes(); 
    (async function initiateAccount() {
      try { 
        const resultGetPub = await getRequest(`${GLOBAL['node']}/nxt?requestType=getAccountPublicKey&account=${getLocalStorage('nxtaddr')}`);
        if (!resultGetPub.publicKey) { 
          const amt = 1 * 1e8;
          const fee = 1 * 1e8;  //Min fee for ardor is 1ardor
          const chain = 'ARDR';
          const res = await window.fetch(`${GLOBAL['node']}/nxt?requestType=sendMoney&chain=${chain}&recipient=${MASTER_ARDOR_ACCOUNT}&secretPhrase=${getLocalStorage('nxtpass')}&feeNQT=${fee}&amountNQT=${amt}`,{method: 'POST'});
          const resultSendMoney = await res.json();
          if(!resultSendMoney.errorDescription && resultSendMoney.broadcasted) {
            console.log('Account Initialized ', resultSendMoney);
          } else {
            console.log(resultSendMoney);
          }
        }
      } catch (error) { 
        console.error(error)
      }
    })();
  } //func setLoginInterface

  async function messageCount() {
    let note = '';
    let timestamp;
    let hash;
    try {
      const response = await getRequest(
        `${GLOBAL['node']}/nxt?requestType=getBlockchainTransactions&chain=ignis&account=${getLocalStorage('nxtaddr')}&withMessage=true&type=1`
      );
      
      for (let i = 0; i < response.transactions.length; i++) {
        const data = response.transactions[i];
        timestamp = data.timestamp;
        hash = data.fullHash;
        break;
      }

      if (timestamp && hash) {
        const date = getArdorDateFormatted(timestamp, nodeType);
        q('.pledges .last-msg').innerHTML = `
            <br>&#128231; Last Message: <a href="${GLOBAL['node']}/index.html?chain=IGNIS&account=${getLocalStorage('nxtaddr')}&page=my_messages" target="_BLANK">
              ${date}
            </a>
        `;

        getRequest(`${GLOBAL['node']}/nxt?requestType=readMessage&chain=ignis&transactionFullHash=${hash}&secretPhrase=${getLocalStorage('nxtpass')}`)
          .then(res => {
            q('.pledges .last-msg-content').textContent = res.message || ''
          }) 
          .catch(er => {
            console.error(er)
          })
      }
    } catch (err) {
      console.log(err);
    }
    return note;
  }

  async function campaignStatus() {
    if (ALLOW_ALL || ALLOW_PLEDGE) { 
      const urlObj = new URL(GLOBAL['currentUrl']); 
      let campaigns = [urlObj.pathname.split("/").pop()];

      let asset;
      let pledgeCount = 0;
      let searchResponse, assetReponse;

      try {
        for(let campaign of campaigns){ 
          if(asset) break;
          let query_url = isGoogleMap ? `${urlObj.origin}/maps/${campaign}` : isGoFundMe ? `${urlObj.origin}/${campaign}` : GLOBAL['currentUrl'];
          const searchQueryRequest = `${GLOBAL['node']}/nxt?requestType=searchTaggedData&chain=ignis&tag=pledge-note,public,recorded&query=${await hashUrl(query_url)}`;
          const assetRequest = `${GLOBAL['node']}/nxt?requestType=searchAssets&chain=ignis&query=${campaign.replace(/^[^a-z0-9]/gi, '')}`; 

          [searchResponse, assetReponse] = await Promise.all([
            getRequest(searchQueryRequest),
            getRequest(assetRequest)
          ]); 

          if(assetReponse.assets.length) {
            for (let i = 0; i < assetReponse.assets.length; i++) {
              if (
                assetReponse.assets[i].accountRS === MASTER_ARDOR_ACCOUNT &&
                assetReponse.assets[i].description === query_url
              ) {
                asset = assetReponse.assets[i];
                break;
              }
            } 
          }

          if (searchResponse.data) {
            for (let data of searchResponse.data) {
              const tagArray = data.tags.split(',');
              if (
                !data.tags.includes('COIN') || !tagArray[3].includes('COIN')
              )
                continue;
              pledgeCount += 1;
            }
          } 
        } 
      } catch(error) {

      } 

      try { 
        let telegramProperties = [];
        let statusValue = 'Unverified';
        let domain = urlObj.href.includes('gofundme.com') ? getFormattedGoFundMeUrl(urlObj) : urlObj.host + urlObj.pathname;
        let status = `Own this page? Claim it <a href="${registrationLink + GLOBAL['currentUrl']}" target="_BLANKS">here</a>`;
        let assetLink = `${GLOBAL['node']}/index.html?chain=IGNIS&account=${getLocalStorage('nxtaddr')}&page=asset_exchange`;
        if (asset) {
          const statusRequest = `${GLOBAL['node']}/nxt?requestType=getAssetProperties&asset=${asset.asset}`;
          const statusReponse = await getRequest(statusRequest);
          const hasProperties = statusReponse.properties.length > 0;
          const isTelegramPage = /^https:\/\/[www.]*t.me\/[a-zA-Z0-9_]*$/.test(GLOBAL['currentUrl']);
          if(hasProperties) { 
            for(let property of statusReponse.properties) {
              const notHexOrNumber = property.value.substr(0,2) === '0x' || isNaN(property.value);
              if(property.property === 'status') { 
                statusValue = property.value 
              } 
              if(isTelegramPage && getCoinLabel(property.property) !== 'Unknown' && notHexOrNumber) { 
                telegramProperties.push({coin: property.property, address: property.value})
              }
            }
          }
          let urlObj = new URL(GLOBAL['currentUrl']);
          let url = `${urlObj.origin}/${urlObj.pathname.split('/').pop()}`;

          assetLink = `${GLOBAL['node']}/index.html?chain=IGNIS&account=${MASTER_ARDOR_ACCOUNT}&page=asset_exchange&asset=${asset.asset}`;
          if (statusValue == 'unverified') {
            const registrationForm = `${registrationLink + url}`;
            status = `${statusValue}[<a href=${registrationForm} target="_blank">?</a>] - <a href=${assetLink} target="_blank">#${asset.asset}</a>`;
          } else {
            status = `${statusValue} - <a href=${assetLink} target="_blank">#${asset.asset}</a>`;
          }
        }

        domain = `<a href="/landing/index.html?url=${GLOBAL['currentUrl']}" target="_blank">${domain}</a>`;

        // Max is 100 from API calls
        let pledgeTotal = pledgeCount > 100 ? '100+' : pledgeCount; 

        let campaignStatusMarkup = `
          <div class="campaign-title"><strong>Title:</strong> ${GLOBAL['pageTitle']}</div>
          <div class="campaign-domain"><strong>URL:</strong> ${domain}</div>
          <div class="campaign-status"><strong>Status:</strong> ${status}</div>
        `; 

        if(telegramProperties.length > 0 && statusValue.toUpperCase() === "VERIFIED") { 
          const userName = urlObj.pathname.replace('/',''); 
          const tgMarketup = `<div class="campaign-status"><strong>Verified Addresses of @${userName}</strong><br><br>
            ${telegramProperties.map(item => { 
              return (`
                ${getCoinLabel(item.coin)}:<br> 
                <a href=${getExplorerLink(item.coin.replace('recipient_', ''), item.address)} target="_blank">${item.address}</a>
                <br><br>
               `)
            }).join('')}
          </div> `;
          campaignStatusMarkup += tgMarketup;
        } 

        const firstPledgeData = await getFirstPledge(searchResponse.data); 

        campaignStatusMarkup += `
        <a class="create-pledge" id="create-pledge" href="#" target="_BLANK">Make a Pledge</a>
        <a class="create-pledge${bountyDetected ? ' hidden' : ''}" id="create-bounty" href="#" target="_BLANK">Make a Bounty</a>
          <div class="campaign-pledgeTotal">
          <a href="/landing/index.html?url=${urlObj.origin + urlObj.pathname}" target="_BLANK"><strong>Pledges Received:</strong> ${pledgeTotal}</a>
        </div>
        <br>
        ${fristPledgeTemplate(firstPledgeData)}
        `;

        q('.campaign-status').innerHTML = campaignStatusMarkup; 

        q('#create-pledge').addEventListener('click', async function(event) {
          event.preventDefault();
          if (ALLOW_ALL || ALLOW_PLEDGE) {
            chrome.windows.create({
              url: `../html/pledgeContainer.html?url=${GLOBAL['currentUrl']}&node=${GLOBAL['node']}&hash=${GLOBAL['currentUrlHashed']}`,
              top: 0,
              left: 0,
              type: 'popup',
              width: 500,
              height: 600,
              focused: true
            });
          } else {
            alert('Page not supported');
          }
        }); 
        
        i('create-bounty').addEventListener('click', async function(event) {
          event.preventDefault();
          if (ALLOW_ALL || ALLOW_PLEDGE) {
            chrome.windows.create({
              url: `../html/pledgeContainer.html?url=${GLOBAL['currentUrl']}&node=${GLOBAL['node']}&hash=${GLOBAL['currentUrlHashed']}&mode=bounty`,
              top: 0,
              left: 0,
              type: 'popup',
              width: 500,
              height: 650,
              focused: true
            });
          } else {
            alert('Page not supported');
          }
        });

        if(bountyDetected && i("claim-bounty")) { 
          i("claim-bounty").addEventListener('click', async (_) => { 
            let userAnswer = (q('.bounty-answer').value || '').trim();
            const bountyURL = GLOBAL['currentUrl'].replace(/(^http[s]?)/,'bounty');
            const userAnswerHash = await hashUrl(bountyURL + userAnswer);
            if(userAnswerHash === bountyHash) { 
              const paramObj = {
                chain: 'ignis',
                name: GLOBAL['currentUrl'],
                data: userAnswer,
                tags: 'bountyAnswer',
                secretPhrase: encodeURIComponent(getLocalStorage('nxtpass')),
                feeNQT: 50000000,
                deadline: 120,
              };
              const paramString = Object.entries(paramObj)
                .map(([key, val]) => `${key}=${val}`)
                .join('&');
              const request = `${GLOBAL['node']}/nxt?requestType=uploadTaggedData&${paramString}`;
              window.fetch(request , { method: 'POST'})
                .then(res => res.json())
                .then(response => { 
                  if(!response.errorDescription) { 
                    const bountyForm = `${registrationLink + bountyURL}`;
                    const successMsg = `Congratulations! Please fill out the form to claim your award. <a href="${bountyForm}" target="_blank">[Claim]</a>`
                    const successNode = document.createElement('div');
                    successNode.id = 'claim-bounty-success';
                    successNode.setAttribute('style', "color: green;margin-top: 5px;font-size: 0.8em;")
                    successNode.innerHTML = successMsg;
                    i('claim-bounty').insertAdjacentElement('afterend', successNode);
                    i('claim-bounty').remove();
                  } else {
                    alert('Having trouble communicating with the blockchain server, please contact the developer.');
                  }
                })
                .catch(err => {
                  console.log(err)
                });
            } else {
              alert('Incorrect Answer.');
            }
          });
        } 
      } catch (error) {
        console.log(error);
      }
    }
  } 

  async function getFirstPledge(searchResponse=[]) { 
    let firstPledgeData = {
      bountyData: {},
      pledgeData: {},
    }; 
    const bountyResponse = [], pledgeResponse = [];
    searchResponse.forEach(item => {
      if(item.tags !== undefined && item.tags.split(',').includes('bounty')) {
        bountyResponse.push(item)
      } else {
        pledgeResponse.push(item);
      }
    }) 
    firstPledgeData = {
      bountyData: await _getFirstBountyPledge(), 
      pledgeData: await _getFirstPledge(pledgeResponse)
    }
    return firstPledgeData;
  }

  async function _getFirstBountyPledge() {
    const bountyURL = GLOBAL['currentUrl'].replace(/(^http[s]?)/,'bounty');
    const bountySearch = `${GLOBAL['node']}/nxt?requestType=searchTaggedData&chain=ignis&tag=pledge-note,public,recorded&query=${await hashUrl(bountyURL)}`;
    const getResponse = await getRequest(bountySearch);
    const responses = getResponse.data || [];
    const bountyData = {};
    for(let response of responses) {
      try {
        constnoteRequest = MainBlockchain.requestUrl(GLOBAL['node'], 'getTaggedData', {chain: "ignis", ...response}),
        noteResponse = await getRequest(noteRequest);
        const msgData = JSON.parse(noteResponse.data);
        let date;
        if(msgData.time && new Date(msgData.time) != "Invalid Date") { 
          const dateObj = new Date(msgData.time);
          date = dateObj.toISOString().split('T')[0] + ' @ ' + dateObj.toLocaleTimeString();
        } 

        if(!msgData.message.includes('BOUNTY')) continue;

        bountyDetected = true;
        date ? bountyData['Date'] = date : '';
        msgData.amount && msgData.coin ? bountyData['Bounty Amount'] = `${+msgData.amount} ${msgData.coin.toUpperCase()}` : ''; 
        msgData.message ? bountyData['Message'] = msgData.message : ''; 
        const [,hash,] = msgData.message.split(',');
        bountyHash = hash;

        const solved = await getBountyStatus(); 
        if(solved.status) {
          bountyData['Solved By'] = solved.data.user;
          bountyData['wrongAnswer'] = solved.data.wrongAnswer;
          bountyData.solved = true; 
        } else {
          msgData.account ? bountyData['Bounty Created By'] = msgData.account : '';
        } 
        break;
      } catch (error) {
        console.error(error)
      }
    } 
    return bountyData;
  }

  async function _getFirstPledge(responses) {
    let firstPledgeData = {};
    for(let response of responses) {
      try {
        noteRequest =MainBlockchain.requestUrl(GLOBAL['node'], 'getTaggedData', {chain: "ignis", ...response});
        noteResponse = await getRequest(noteRequest);
        const msgData = JSON.parse(noteResponse.data);
        let date;
        if(msgData.time && new Date(msgData.time) != "Invalid Date") { 
          const dateObj = new Date(msgData.time);
          date = dateObj.toISOString().split('T')[0] + ' @ ' + dateObj.toLocaleTimeString();
        } 
        msgData.amount && msgData.coin ? firstPledgeData['First Pledge'] = `${+msgData.amount} ${msgData.coin.toUpperCase()}` : '';
        date ? firstPledgeData['Date'] = date : '';
        msgData.account ? firstPledgeData['By'] = msgData.account : '';
        msgData.message ? firstPledgeData['Message'] = msgData.message : ''; 
        break;
      } catch (error) { 
        console.error(error)
      }
    }
    return firstPledgeData;
  }
  
  async function getBountyStatus() {
    const nodeRequest = `${GLOBAL['node']}/nxt?requestType=searchTaggedData&chain=ignis&tag=bountyAnswer`;
    const result = { 
      status: false,
      data: { 
        wrongAnswer: null,
        user: null,
      }
    }; 

    try {
      const nodeResponse = await getRequest(nodeRequest); 
      if(!nodeRequest.errorDescription) { 
        for(let response of nodeResponse.data) { 
          if(response.name !== GLOBAL['currentUrl']) continue; 
          result.status = true;
          result.data.user = response.accountRS;
          const requestUrl = MainBlockchain.requestUrl(GLOBAL['node'], 'getTaggedData', {chain: "ignis", ...data})
          const {data : bountyAnswer} = await getRequest(requestUrl); 
          if(await hashUrl(GLOBAL['currentUrl'].replace(/(^http[s]?)/,'bounty') + bountyAnswer) != bountyHash) { 
            result.data.wrongAnswer = true
          } 
          return result ;
        }
      } 
    } catch (error) {
      console.log('Error getting getBountyStatus() - ' + error)
    }
    return result;
  }

  /**
   * Get the HTML for the first pledge section, which includes the
   * first bounty and first pledge
   * @param {object} firstPledgeData
   * @return {string} html
   */
  function fristPledgeTemplate(firstPledgeData) { 
    let html = '';
    const {bountyData,pledgeData} = firstPledgeData;
    if(Object.keys(bountyData).length > 0) { 
      const SolvedBy = bountyData['Solved By'] || '';
      const _bountyTemplate = ({solved = false, wrongAnswer = false, message}) => {
        if(wrongAnswer === true) { 
          return '<h4 style="color:red;">Incorrect Bounty Answer.<br>Detected Ext-API Bypass. Contact Devs.</h4>';
        } else if(solved) { 
          const registrationForm = `<a href="${registrationLink + GLOBAL['currentUrl'].replace(/(^http[s]?)/,'bounty')}" target="_blank">[Claim Bounty]</a>`; 
          return getLocalStorage('nxtaddr') === SolvedBy ? `<h4>${registrationForm}</h4>` : '';
        } else { 
          return `
          <br>
          <strong>Message:</strong> ${message}
          <br><br>
          Bounty Answer: <br>
          <input type="text" name="bountyAnswer" class="bounty-answer"  />
          <button class="claim-bounty" id="claim-bounty">Claim Bounty</button>` 
        } 
      }

      const [,,message] = bountyData['Message'].split(',');
    
      const solved = bountyData.solved || false;
      const wrongAnswer = bountyData.wrongAnswer || false;

      if(!message) throw 'No bounty message fonud';

      delete bountyData['Message']; 
      delete bountyData['solved'];
      delete bountyData['wrongAnswer'];

      html += `
      <div class="firstPledge bountyWrapper">
        <h2>Bounty</h2>
        ${Object.keys(bountyData).map(k => {return (
          `<strong>${k}</strong>: ${bountyData[k]}<br>`
          )}).join('')}
        ${_bountyTemplate({solved, wrongAnswer, message})}
      </div>
      `; 
    }

    if(Object.keys(pledgeData).length > 0) { 
      html += `
      <div class="firstPledge pledgeWrapper">
        <h2>First Pledge</h2>
        ${Object.keys(pledgeData).map(k => {return (
          `<strong>${k}</strong>: ${pledgeData[k]}<br>`
        )}).join('')}
      </div>`; 
    }

    return html;
  }

  async function printPledgeVerifiedNotes() {
    let notes = [];
    let urls = {
      query: GLOBAL['currentUrl'],
    };

    if (GLOBAL['currentUrl'].includes('gofundme')) {
      const urlObj = new URL(GLOBAL['currentUrl']);
      const path = urlObj.pathname.split('/').pop();
      const oldURL = `${urlObj.origin}/${path}`;

      urls['oldURL'] = oldURL;
    }

    let urlHashes = await getQueries(urls);

    for (let _urlHash in urlHashes) {
      const searchQueryRequest = `${GLOBAL['node']}/nxt?requestType=searchTaggedData&chain=ignis&account=${MASTER_ARDOR_ACCOUNT}&tag=pledge-note&query=${urlHashes[_urlHash]}`;
      try {
        const queryResponse = await getRequest(searchQueryRequest);
        let limit = queryResponse.data.length > 20
          ? 20
          : queryResponse.data.length;
        for (let i = 0; i < limit; i++) {
          const data = queryResponse.data[i];
          const withinSetTime  = transactionIsOlderThanSetTime(nodeType, CUSTOM_BLOCK_TIMESTAMP, data.blockTimestamp);
          if (withinSetTime) {
            const noteRequest = MainBlockchain.requestUrl(GLOBAL['node'], 'getTaggedData', {chain: "ignis", ...data}),
              noteResponse = await getRequest(noteRequest);

            if (noteResponse.isText && noteResponse.type == 'text/plain') {
              let note = snarkdown(escapeHTML(noteResponse.data));
              const time = getTimeByTimezone(
                noteResponse.transactionTimestamp,
                TIMEZONE,
                nodeType
              );

              try {
                let resultObj = JSON.parse(note);
                resultObj.time = time;
                resultObj.timestamp = noteResponse.transactionTimestamp;
                notes.push(resultObj);
              } catch (error) {
                console.log('AERIS error: ', error);
              }
            }
          }
        }
      } catch (error) {
        console.log(error);
      }
    }
    handleVerifiedNote(notes);
  }

  async function handleVerifiedNote(notes) {
    notes.sort((a, b) => a.timestamp < b.timestamp ? 1 : -1);
    notes = removeDuplicatePledgeNotes(notes);
    let done = false;
    if (notes.length) {
      const $ul = q('#verified-note-list ul');
      $ul.innerHTML = '';
      let noteCounter = 0;
      for (let i = 0; i < 5; i++) {
        const noteObj = notes[i];
        let li = '';
        if (noteCounter < NOTE_DISPLAY_LIMIT) {
          try {
            let {
              account,
              amount,
              coin,
              message,
              publicKey = '',
              time
            } = noteObj;
            const amtFormatted = parseFloat(amount);
            let aliasName = account;
            let alias = await searchAccountAlias(GLOBAL['node'], account);

            if (alias) aliasName = '@' + alias;

            let cutPublicKey = publicKey.substring(0, 5) +
              '...' +
              publicKey.substring(publicKey.length - 5);

            li += `<li>
            <div><h4>${time} - <span class="address"><a href="${GLOBAL['node']}/index.html?chain=${GLOBAL['chain']}&account=${account}" target="_BLANK">${account.replace(/ardor-/i, '')}</a></span></h4></div>
              <div class="note">
                <span class="pictogram" data-value="${account}"></span>
                <span class="note-content">
                  <strong>${aliasName} Pledged: ${amtFormatted} ${coin.toUpperCase()}</strong><br />
                  <span class="pledge-msg">${message}</span></br >
                  <div class="publicKey">
                   Sender Address:
                   <a href="${getExplorerLink(coin, publicKey)}" target="_BLANK">${cutPublicKey}</a>
                  <div>
                </span>
              </div>
            </li >`;
            noteCounter += 1;
            $ul.innerHTML += li;
          } catch (error) {
            console.log(error);
          }
        }
        showElm('#verified-note-list');

        const $pictos = document.querySelectorAll(
          '#verified-note-list .pictogram'
        );
        for (let picto of $pictos) {
          new Pictogrify(picto.getAttribute('data-value'), 'monsters').render(
            picto
          );
        }
      }
      done = true;
    }
    return done;
  }

  async function logout() {
    if (
      confirm(
        'Logout? You will lose all your Bitcoin keys if you did not backup your username and passphrase.'
      )
    ) {
      chrome.tabs.query(
        {
          active: true,
          currentWindow: true
        },
        function(tabs) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'logout'
          });
        }
      );

      const network = ScatterJS.Network.fromJson({
        blockchain: 'eos',
        chainId: 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906',
        host: 'nodes.get-scatter.com',
        port: 443,
        protocol: 'https'
      });

      if (getLocalStorage('scatter-login') == '1') {
        logoutAnimation('Logging out Scatter');
        try {
          const connected = await ScatterJS.connect('xcubicle layer', {
            network
          });
          if (connected) {
            await ScatterJS.logout();
          }
        } catch (error) {
          // We don't want to console log this becuase the window will be closed.
          alert('Aeris Error: ', error.toString());
        }
      }

      localStorage.clear();
      chrome.storage.local.remove('coins')
      reloadInjectedPage();
      window.close();
    }
  } //func logout

  function logoutAnimation(msg) {
    const container = document.createElement('div');
    container.id = 'loading-dots';
    container.setAttribute(
      'style',
      'display: inline-block; position: fixed; height: 100vh; width: 100vw; margin: 0;top:0; left: 0; background: rgba(0, 0, 0, 0.8); color: #fff; text-align: center; z-index: 99999;'
    );

    container.innerHTML = `<h1 style="margin-top: calc(50vh - 2em);">${msg}</h1>
    <span class="dot">.</span>
    <span class="dot">.</span>
    <span class="dot">.</span>`;

    document.body.insertAdjacentElement('afterbegin', container);
  }

  function checkAccountStatus(address, publicKey) {
    if (!address) return;
    getNodeType(GLOBAL['node']).then(result => {
      if (result === 'Testnet') {
        const request = `${GLOBAL['node']}/nxt?requestType=getAccount&account=${address}`;
        getRequest(request).then(res => {
          if (
            res.errorDescription && res.errorDescription === 'Unknown account'
          ) {
            const $accountDetail = i('account-detail');
            const newElm = i('activate-account') ||
              document.createElement('div');
            const span = `<span>New account? Click here to receive "testnet" coins and a random Alias name</span>`;
            newElm.id = 'activate-account';
            newElm.innerHTML = span;
            $accountDetail.after(newElm);
            const url = `https://layers.xcubicle.com/xactivate.php?address=${address}&publicKey=${publicKey}`;
            i('activate-account').addEventListener(
              'click',
              activateHandler,
              false
            );
            i('activate-account').url = url;
          }
        });
      }
    });
  }

  function activateHandler(event) {
    const $activateAccount = i('activate-account');
    $activateAccount.removeEventListener('click', activateHandler, false);
    const url = event.currentTarget.url;
    const loader = createLoadingAnimationElement();
    $activateAccount.appendChild(loader);
    window.fetch(url, { method: 'GET' }).then(r => r.json()).then(result => {
      if (result.text === 'Account Activated') {
        createProgressBar(0.5);
      } else {
        alert('Try again later.');
      }
    });
  }

  async function defineNodeType() {
    try {
      let type = await getNodeType(GLOBAL['node']);
      nodeType = type;
      if (type === 'Testnet') {
        q(`#testnet`).classList.add('active');
        q(`#mainnet`).classList.remove('active');
      } else {
        q(`#testnet`).classList.remove('active');
        q(`#mainnet`).classList.add('active');
      }
      showElm('#node-type');
    } catch (err) {}
  } //funcdefineNodeType

  function showUnconfirmedMessage() {
    window
      .fetch(
        `${GLOBAL['node']}/nxt?requestType=getUnconfirmedTransactions&chain=${GLOBAL['chain']}&account=${getLocalStorage('nxtaddr')}`,
        {
          method: 'GET'
        }
      )
      .then(res => res.json())
      .catch(error => console.log(error))
      .then(res => {
        if (res.errorDescription || res.unconfirmedTransactions.length == 0)
          return;
        const unconfirms = res.unconfirmedTransactions;
        for (let unconfirm of unconfirms) {
          // Type 6 is 'Upload Data'
          if (unconfirm.type == 6) {
            i(
              'unconfirmed-notify'
            ).textContent = 'Note is being processed. Please Wait 45 seconds.';
            break;
          }
        }
      });
  } //func showUnconfirmedMessage

  function reloadInjectedPage() {
    chrome.tabs.query(
      { active: true, currentWindow: true },
      function(arrayOfTabs) {
        const url = arrayOfTabs[0].url;
        if (url.includes('gofundme') || url.includes('patreon')) {
          chrome.tabs.reload(arrayOfTabs[0].id);
        }
      }
    );
  }

  // COMMENT/NOTE SECTION #comment/note
  async function uploadNote() {
    let description = i('note').value;
    let currentUrlHashed = GLOBAL['currentUrlHashed'];
    let currentPrivateUrlHashed = GLOBAL['currentPrivateUrlHashed'];
    if (description.length === 0) return;

    if (i('secondary-pass').checked && q('.custom-pass').value.length) {
      description = vigenereCipher(description, q('.custom-pass').value);
      q('.custom-pass').value = '';
    }

    try {
      const account = getLocalStorage('nxtaddr');
      const res = await getBalance(GLOBAL['node'], GLOBAL['chain'], account);
      const balance = formatCryptoDecimals('ardr', res.balanceNQT);
      if (balance && +balance < 1) {
        showElm('#balance-warning');
        return;
      }
    } catch (error) {
      console.log(error);
    }

    console.log(GLOBAL);

    let passphrase = encodeURIComponent(getLocalStorage('nxtpass')),
      fee = 200000000, //We need to calculate the fee.
      deadline = 120;

    description = encodeURIComponent(description);
    let request;
    let paramObj = {
      chain: 'ignis',
      name: currentUrlHashed,
      tags: 'note',
      data: description,
      secretPhrase: passphrase,
      feeNQT: fee,
      deadline: deadline
    };

    if (i('save-global').checked) {
      paramObj.tags += ',sitewide';
      paramObj.name = GLOBAL['globalUrlHashed'];
    }

    // If 'public btn' is not checked, we encrypt the note and add encrypted to the tags
    // otherwise we keep the raw note, add the host name of the url for the channel field
    // and if this is not a global note, we put the url to the description field
    if (!q('#public-note').checked) {
      //private note
      let noteObject = {
        note: description,
        url: GLOBAL['currentUrl'].slice(0, 300)
      };
      let noteString = JSON.stringify(noteObject);
      let noteEncrypted = await aesGcmEncrypt(
        noteString,
        getLocalStorage('btcpri')
      );
      noteEncrypted = encodeURIComponent(noteEncrypted);

      paramObj.data = noteEncrypted;
      paramObj.tags += ',encrypted';

      paramObj.name = i('save-global').checked
        ? GLOBAL['globalPrivateUrlHashed']
        : currentPrivateUrlHashed;
    } else {
      //public
      paramObj.channel = new URL(GLOBAL['currentUrl']).hostname.slice(0, 100);
      if (!i('save-global').checked)
        paramObj.description = GLOBAL['currentUrl'].slice(0, 1000);
    }

    request = MainBlockchain.requestUrl(GLOBAL['node'], 'uploadTaggedData', paramObj);
    if (request) upload(request);
  } //func uploadNote

  function upload(request) {
    window
      .fetch(request, {
        method: 'POST'
      })
      .then(res => res.json())
      .catch(error => console.error())
      .then(response => {
        console.log(response);
        if (!response.errorDescription) {
          i('unconfirmed-notify').classList.add('show');
          const disappearTimer = 10000;
          setTimeout(() => {
            i('unconfirmed-notify').classList.remove('show');
          }, disappearTimer);

          i('note').value = '';
          i('addnote').checked = false
        }
      });
  } //func upload

  async function saveNoteLocal() {
    let description = i('note').value, encrypted = '', global = '';
    if (description.length === 0) return;

    if (i('secondary-pass').checked && q('.custom-pass').value.length) {
      description = vigenereCipher(description, q('.custom-pass').value);
      q('.custom-pass').value = '';
    }

    if (i('save-global').checked) {
      global = 'sitewide';
    }

    description = await aesGcmEncrypt(description, getLocalStorage('btcpri'));
    encrypted = 'encrypted';

    const key = GLOBAL['currentUrlHashed'],
      account = getLocalStorage('nxtaddr'),
      // currentTime = getDateFormatted(),
      currentTime = moment().format('llll'),
      note = description +
        ';' +
        currentTime +
        ';' +
        encrypted +
        ';' +
        account +
        ';' +
        global;

    chrome.storage.local.get([key], function(result) {
      if (result[key] && result[key].length > 0) {
        result[key].push(note);
        chrome.storage.local.set(result);
      } else {
        result[GLOBAL['currentUrlHashed']] = [];
        result[GLOBAL['currentUrlHashed']].push(note);
        chrome.storage.local.set(result);
      }
    });

    const $ul = q('#private-note-list ul');
    let sitewideClass = 'local', sitewideLabel = '';
    if (i('save-global').checked) {
      sitewideClass = 'global';
      sitewideLabel = `<span>*Sitewide Note</span>`;
    }
    const li = `<li class="${sitewideClass}">
                    <div><h4>${getDateFormatted()} - <span class="address"><a href="${GLOBAL['node']}/index.html?chain=${GLOBAL['chain']}&account=${account}" target="_BLANK">${account}</a></span></h4></div>
                    <span class="raw-text" style="display:none;"></span>
                    <div class="new-note note">
                      <span class="pictogram" data-value="${account}"></span>
                      <span class="note-content">Encrypted Note</span>
                    </div>
                    <div class="note-actions">
                      <button class='decrypt-btn' data-note='${description}'>Decrypt</button>
                      <button class="copy">Clone</button>${sitewideLabel}
                      </div>
                </li>`;

    $ul.innerHTML = li + $ul.innerHTML;

    i('note').value = '';

    const $pictos = document.querySelectorAll(
      '.new-note .pictogram'
    );
    for (let picto of $pictos) {
      new Pictogrify(picto.getAttribute('data-value'), 'monsters').render(
        picto
      );
    }
    
  } //func saveNoteLocal

  async function printNotes() {
    const localNote = await printLocalNotes(),
      publicNote = await printPublicNotes(),
      privateNote = await printPrivateNotes();

    if (privateNote || publicNote || localNote) {
      i('comment').style.backgroundColor = '#f00';
    } else {
      showElm('#no-notes');
    }
  }

  async function printPrivateNotes() {
    const $ul = q('#private-note-list ul'),
      account = getLocalStorage('nxtaddr');

    let notes = [];

    let urls = {
      query: getLocalStorage('nxtpass') + GLOBAL['currentUrl'],
      sitewide: getLocalStorage('nxtpass') + getUrlHostName(GLOBAL['currentUrl']),
    };

    if (GLOBAL['currentUrl'].includes('gofundme')) {
      const urlObj = new URL(GLOBAL['currentUrl']);
      const path = urlObj.pathname.split('/').pop();
      const oldURL = `${urlObj.origin}/${path}`;

      urls['oldURL'] = getLocalStorage('nxtpass') + oldURL;
    }

    let queries = await getQueries(urls);

    for (let index in queries) {
      const searchQueryRequest = `${GLOBAL['node']}/nxt?requestType=searchTaggedData&chain=ignis&tag=note,encrypted&query=${queries[index]}&account=${account}`;
      try {
        const queryResponse = await getRequest(searchQueryRequest);
        let limit = queryResponse.data.length > 10
          ? 10
          : queryResponse.data.length;
        for (let i = 0; i < limit; i++) {
          const data = queryResponse.data[i];
          // If custom block timestap is set, and the transaction time is greater than the set time
          // we skip it
          if (
            transactionIsOlderThanSetTime(
              nodeType,
              CUSTOM_BLOCK_TIMESTAMP,
              data.blockTimestamp
            )
          ) {
            if (
              data || (index == 'sitewide' && data.tags.includes('sitewide'))
            ) {
              const noteRequest = MainBlockchain.requestUrl(GLOBAL['node'], 'getTaggedData', {chain: "ignis", ...data}),
                noteResponse = await getRequest(noteRequest);

              if (noteResponse.isText && noteResponse.type == 'text/plain') {
                let sitewideClass = '',
                  copyBtn = `<button class="copy">Clone</button>`;
                if (data.tags.includes('sitewide')) {
                  sitewideClass = 'global';
                }
                const decryptBtn = `<button class='decrypt-btn' data-note='${noteResponse.data}'>Decrypt</button>`,
                  decipherBtn = `<button class='decipher-btn ${secondaryPass}'>Decipher</button>`,
                  account = noteResponse.accountRS,
                  time = getTimeByTimezone(
                    noteResponse.transactionTimestamp,
                    TIMEZONE,
                    nodeType
                  );

                privateNoteCounter += 1;
                // one sitewide and one none-sitewide
                // This is to prevent the bug when we are on the home page and it's showing a duplicate
                // sitewide notes on the popup
                if (notes.length === 0 || notes[0].decryptBtn !== decryptBtn) {
                  notes.push({
                    sitewideClass,
                    time,
                    account,
                    decryptBtn,
                    decipherBtn,
                    copyBtn
                  });
                }
              }
            }
          }
        }
      } catch (error) {
        console.log(error);
      }
    }

    return handlePrivateNotes(notes);
  } //func printPrivateNotes

  function handlePrivateNotes(notes) {
    let done = false;
    if (notes.length) {
      const $ul = q('#private-note-list ul');
      notes.sort(sortObjectByValue('time', 'desc'));

      let noteCounter = 0;
      let sitewideCounter = 0;
      for (let note of notes) {
        const {
          isSitewide,
          time,
          account,
          decryptBtn,
          decipherBtn,
          copyBtn
        } = note;
        let li = '';
        // non-sitewide note uses custom set limit
        if (!isSitewide && noteCounter < NOTE_DISPLAY_LIMIT) {
          li += `<li>
            <div><h4>${time} - <span class="address"><a href="${GLOBAL['node']}/index.html?chain=${GLOBAL['chain']}&account=${account}" target="_BLANK">${account.replace(/ardor-/i, '')}</a></span></h4></div>
            <span class="raw-text" style="display:none;"></span>
            <div class="note"><span class="pictogram" data-value="${account}"></span><span class="note-content">Encrypted Note</span></div>
            <div class="note-actions">${decryptBtn}${decipherBtn}${copyBtn}</div>
          </li>`;
          noteCounter += 1;
        }

        if (isSitewide && sitewideCounter < 3) {
          // sitewide note is limited to 3
          li += `<li class="global">
            <div><h4>${time} - <span class="address"><a href="${GLOBAL['node']}/index.html?chain=${GLOBAL['chain']}&account=${account}" target="_BLANK">${account.replace(/ardor-/i, '')}</a></span></h4></div>
            <span class="raw-text" style="display:none;"></span>
            <div class="note"><span class="pictogram" data-value="${account}"></span><span class="note-content">Encrypted Note</span></div>
            <div class="note-actions">${decryptBtn}${decipherBtn}${copyBtn}</div>
          </li>`;
          sitewideCounter += 1;
        }

        $ul.innerHTML += li;
      }
      showElm('#private-note-list');
      const $pictos = document.querySelectorAll(
        '#private-note-list .pictogram'
      );
      for (let picto of $pictos) {
        new Pictogrify(picto.getAttribute('data-value'), 'monsters').render(
          picto
        );
      }
      done = true;
    }
    return done;
  }

  async function printPublicNotes() {
    const $ul = q('#public-note-list ul');

    let notes = [];

    let urls = {
      query: GLOBAL['currentUrl']
      //sitewide: getUrlHostName(GLOBAL['currentUrl'])
    };

    $ul.innerHTML = '';

    const loader = createLoadingAnimationElement(100, 100);
    $ul.appendChild(loader);

    if (GLOBAL['currentUrl'].includes('gofundme')) {
      const urlObj = new URL(GLOBAL['currentUrl']);
      const path = urlObj.pathname.split('/').pop();
      const oldURL = `${urlObj.origin}/${path}`;

      urls['oldURL'] = oldURL;
    }

    let queries = await getQueries(urls);

    for (let index in queries) {
      const searchQueryRequest = MainBlockchain.requestUrl(GLOBAL['node'],'searchTaggedData', {chain: 'ignis', tag:'note', query:queries[index]});
      try {
        const queryResponse = await getRequest(searchQueryRequest);
        let limit = queryResponse.data.length > 20
          ? 20
          : queryResponse.data.length;
        for (let i = 0; i < limit; i++) {
          const data = queryResponse.data[i];
          const withinSetTime = transactionIsOlderThanSetTime( nodeType, CUSTOM_BLOCK_TIMESTAMP, data.blockTimestamp);
          if (withinSetTime) {
            // we print the note for current URL
            // and loop thru homepage notes and print it if sitewide is included in the tag
            if (
              data || (index == 'sitewide' && data.tags.includes('sitewide'))
            ) {
              const noteRequest = MainBlockchain.requestUrl(GLOBAL['node'], 'getTaggedData', {chain: "ignis", ...data}),
                noteResponse = await getRequest(noteRequest),
                tags = noteResponse.tags.replace(/\s/g, '').split(',');
                

              if (
                noteResponse.isText &&
                noteResponse.type == 'text/plain' &&
                !tags.includes('encrypted')
              ) {
                let note = snarkdown(escapeHTML(noteResponse.data)),
                  isSitewide = false,
                  copyBtn = `<button class="copy">Clone</button>`;
                if (data.tags.includes('sitewide')) {
                  isSitewide = true;
                }
                const account = noteResponse.accountRS,
                  time = getTimeByTimezone(
                    noteResponse.transactionTimestamp,
                    TIMEZONE,
                    nodeType
                  ),
                  decipherBtn = `<button class='decipher-btn ${secondaryPass}'>Decipher</button>`;

                // one sitewide and one none-sitewide
                // This is to prevent the bug when we are on the home page where it would show a duplicate
                // sitewide notes on the popup
                if (notes.length === 0 || notes[0].note !== note) {
                  const pledgeNote = data.tags.includes('pledge-note');
                  const sender = data.accountRS;
                  const timestamp = noteResponse.transactionTimestamp;
                  notes.push({
                    note,
                    isSitewide,
                    time,
                    account,
                    decipherBtn,
                    copyBtn,
                    pledgeNote,
                    sender,
                    timestamp
                  });
                }
              }
            }
          }
        }
      } catch (error) {
        console.log(error);
      }
    }

    if (notes.length > 4) {
      const text = document.createTextNode(`${notes.length} - `);
      q('#public-note-list h2').prepend(text);
    }

    return handlePublicNotes(notes);
  } //func printPublicNotes

  async function handlePublicNotes(notes) {
    const $ul = q('#public-note-list ul');
    $ul.innerHTML = '';
    let done = false;
    if (notes.length) {
      notes.sort(sortObjectByValue('timestamp', 'desc'));
      // This also removes notes that are created by users...
      notes = removeDuplicatePledgeNotes(notes);
      let noteCounter = 0;
      let sitewideCounter = 0;
      for (let n of notes) {
        let {
          note,
          isSitewide,
          time,
          account,
          decipherBtn,
          copyBtn,
          pledgeNote = false,
          sender
        } = n;

        note = await noteTemplate(
          note,
          sender,
          MASTER_ARDOR_ACCOUNT,
          GLOBAL['node']
        );

        let li = '';

        if(pledgeNote) {
          try { 
            const noteJson = JSON.parse(n.note)
            if(noteJson.message === "") continue;
            account = noteJson.account;
          } catch (error) { 
            console.log(error)
          }
        }
        // non-sitewide note uses custom set limit
        if (!isSitewide && noteCounter < NOTE_DISPLAY_LIMIT) {
          li += `<li ${pledgeNote ? 'class="pledge-note"' : ''}>
            <div><h4>${time} - <span class="address"><a href="${GLOBAL['node']}/index.html?chain=${GLOBAL['chain']}&account=${account}" target="_BLANK">${account.replace(/ardor-/i, '')}</a></span></h4></div>
            <span class="raw-text" style="display:none;">${note}</span>
            <div class="note"><span class="pictogram" data-value="${account}"></span><span class="note-content">${note}</span></div>
            <div class="note-actions">${decipherBtn}${copyBtn}</div>
          </li >`;
          noteCounter += 1;
          showElm('#public-note-list');
        }

        /**
        if (isSitewide && sitewideCounter < 3) {
          // sitewide note is limited to 3
          li += `<li class="global${pledgeNote ? 'pledge-note' : ''}">
            <div><h4>${time} - <span class="address"><a href="${GLOBAL['node']}/index.html?chain=${GLOBAL['chain']}&account=${account}" target="_BLANK">${account.replace(/ardor-/i, '')}</a></span></h4></div>
            <span class="raw-text" style="display:none;">${note}</span>
            <div class="note"><span class="pictogram" data-value="${account}"></span><span class="note-content">${note}</span></div>
            <div class="note-actions">${decipherBtn}${copyBtn}</div>
          </li>`;
          sitewideCounter += 1;
        }
        */
        $ul.innerHTML += li;
      }

      const $pictos = document.querySelectorAll('#public-note-list .pictogram');
      for (let picto of $pictos) {
        new Pictogrify(picto.getAttribute('data-value'), 'monsters').render(
          picto
        );
      }
      done = true;
    }
    return done;
  }

  async function noteTemplate(note, sender, masterAccount, ardorNode) {
    const formattedNote = await cleanUpNote(
      note,
      sender,
      masterAccount,
      ardorNode
    );

    if (typeof formattedNote !== 'object')
      return note.replace(/(\r\n|\n|\r)/gm, '<br>');

    const { coinLabel, acctInfo, formatted, time, message } = formattedNote;

    return `<div><div class="account-container">${acctInfo}</div>
    <div class="pledge-amount"><strong>${+formatted} ${coinLabel.toUpperCase()}</strong><span class="date" style="opacity: 0.5"> &#8226; ${time}</span></div>
  </div>${message && `<div class='note' style="opacity: 0.7;clear:left;"><em>${message}</em></div>`}`;
  }

  async function printLocalNotes() {
    const $ul = q('#private-note-list ul');

    $ul.innerHTML = '';

    const key = GLOBAL['currentUrlHashed'];
    let done = false;

    try {
      //      const sitewide_hash = await hashUrl(getUrlHostName(GLOBAL['currentUrl'])),
      //  sitewide_key = sitewide_hash.replace(/[^a-z0-9]/gi, '_');
      const sitewide_key = null;

      return new Promise(resolve => {
        chrome.storage.local.get([key], function(result) {
          let noteCounter = 0;
          let sitewideCounter = 0;

          for (let index in result) {
            if (result.hasOwnProperty(index)) {
              for (let j = 0; j < result[index].length; j++) {
                const value = result[index][j];
                if (typeof value === 'undefined') break;
                const isLoggedin = value.split(';')[3] ===
                  localStorage.getItem('nxtaddr');
                const isSitewide = value.split(';')[4] === 'sitewide';

                if (!isLoggedin) continue;

                if (index == key || (index == sitewide_key && isSitewide)) {
                  privateNoteCounter + 1;
                  // decreypt button are always present because we are not allowing un-encrypt notes to save locally.
                  const account = getLocalStorage('nxtaddr'),
                    note = escapeHTML(value.split(';')[0]),
                    time = value.split(';')[1],
                    encrypted = value.split(';')[2] === 'encrypted',
                    copyBtn = note.trim() === 'Encrypted Note'
                      ? ''
                      : `<button class="copy">Clone</button>`,
                    decryptBtn = `<button class='decrypt-btn' data-note='${note}'>Decrypt</button>`,
                    decipherBtn = `<button class='decipher-btn ${secondaryPass}'>Decipher</button>`,
                    dltBtn = `<button class='delete' data-index="${index}">Delete</button>`;

                  let li = '';

                  if (!isSitewide && noteCounter < NOTE_DISPLAY_LIMIT) {
                    li += `<li class="local">
                          <div><h4>${time} - *<span class="address">${account.replace(/ardor-/i, '')}</span>*</h4></div>
                          <span class="raw-text" style="display:none;"></span>
                          <div class="note"><span class="pictogram" data-value="${account}"></span><span class="note-content">${encrypted ? 'Encrypted Note' : note}</span></div>
                          <div class="note-actions">${decryptBtn}${decipherBtn}${copyBtn}${dltBtn}</div>
                        </li>`;
                    noteCounter += 1;
                  }
                  $ul.innerHTML += li;
                  showElm('#private-note-list');
                  done = true;
                }
                privateNoteCounter += 1;
              }

              if (privateNoteCounter > 4) {
                const text = document.createTextNode(
                  `${privateNoteCounter} - `
                );
                q('#private-note-list h2').prepend(text);
              }
            }
          }
          const $pictos = document.querySelectorAll(
            '#private-note-list .pictogram'
          );
          for (let picto of $pictos) {
            new Pictogrify(picto.getAttribute('data-value'), 'monsters').render(
              picto
            );
          }
        });
        resolve(done);
      });
    } catch (err) {
      console.log(err);
    }
  } //func printLocalNotes

  function characterLimitHandler(evet) {
    const value = this.value;
    const length = value.length;
    i('char-count').textContent = length + '/1500';
    if (length > 1500) this.value = value.substring(0, 1500);
  } //funccharacterLimitHandler

})(window);
