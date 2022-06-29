(function(window, document) {
  "use strict";
  var coins = {};
  var balance = 0;
  var urlHash = "";
  var GLOBAL = { node: "https://a1.annex.network" };
  var MASTER_ACCOUNT = "COIN-XXXX-XXXX-5496-B3YAC";
  var CURRENT_URL = "";
  var SUPPORTED_TOKENS = [];
  var coinAddress;
  var nodeType = "Testnet";
  var TIMEZONE = "America/New_York";

  var $appendToButton; //querySelect
  var cryptoBtnLabel = "Pledge Bitcoin"; //HTML;

  var reload = false;

  var AVAILABLE_PAGE_ELM_FOUND = false;


  const icons = {
    btc: chrome.extension.getURL("../images/btc-icon.png"),
    ltc: chrome.extension.getURL("../images/ltc-icon.png"),
    xmr: chrome.extension.getURL("../images/xmr-icon.png"),
    eos: chrome.extension.getURL("../images/eos-icon.png"),
    eth: chrome.extension.getURL("../images/eth-icon.png"),
    usdc: chrome.extension.getURL("../images/usdc-icon.png"),
    usdt: chrome.extension.getURL("../images/usdt-icon.png"),
    dai: chrome.extension.getURL("../images/dai-icon.png"),
    coin: chrome.extension.getURL("../images/ignis-icon.png"),
    oxen: chrome.extension.getURL("../images/oxen-icon.png"),
  }; 

  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    reload = false;
    if (request.pageUpdate === "update") {
      pageListener();
    } else if (request.message === "reload") {
      reload = true;
      pageListener();
    } 
  });

  function pageListener() {

    if (/^https:\/\/www\.google\.com\/maps/.test(location.href)) {
      googleMapImplementation();
      return;
    }

    chrome.storage.local.get(
      [
        "supportedTokens",
        "pageSupported",
        "supportedDomains",
        "coins",
        "activeNode",
        'notePopup',
      ],
      async result => {

        if(result['notePopup'] === "enable" && !document.getElementById('xc-note-dialog')) {
          const btn = ContentUtils.createNoteToggleButton();
          showPopupButton(btn);
        }
        if (result["activeNode"]) GLOBAL["node"] = result["activeNode"];

        if (result["supportedTokens"]) SUPPORTED_TOKENS = result["supportedTokens"].split(",");

         const supportAllPages = result["supportedDomains"].split(",").includes("all") && i("xc-dialog") === null;
        if (result["pageSupported"]) {
          // validate user before doing any other computations.
          let temp;
          let is_registered_from_enchant = false;
          try {
            if(!result.coins) throw 'User not logged in';
            temp = JSON.parse(result.coins);
            let response = await onMessageAPIWrapper({
              node: GLOBAL["node"],
              requestType: "getAccountPropertyByPropertyName",
              account: temp["nxtaddr"],
              searchProperty: 'btc-pub',
              MASTER_ACCOUNT
            });
      
            is_registered_from_enchant =
              response.properties && response.properties[0].value !== null;
          } catch (error) {
            console.log(error);
          }

          if (!is_registered_from_enchant) {
            console.log("Layers: Account not registered via our website or we have an issue getting the property value.");
            return;
          }
          
          AVAILABLE_PAGE_ELM_FOUND = pageSupportedInit();
          if (AVAILABLE_PAGE_ELM_FOUND) {
            init();
          }
        } else if (supportAllPages) {
          const btn = ContentUtils.createFloatButton(GLOBAL["node"]); 
          showPopupButton(btn);
        } else {
          console.log("not supported");
        }
      }
    );
  }

  /**
   * Search the current DOM for the matching element.
   * Set the current $appendToButton value of the found element
   * 
   * @returns boolean found
   */
  function pageSupportedInit() {
    let found = false; 
    // Two templates for gofundme 
    if (/^https:\/\/(.*\.)?gofundme.com/.test(location.href)) {
      // Old main domain template
      // New main domain template
      // charity subdomain template
      $appendToButton =
        document.querySelector(".js-xl-donate-button") ||
        document.querySelector('[data-element-id="btn_share"]') ||
        document.querySelector('.js-sm-up-container .js-donate-now');
      found = true;
    } else if (/^https:\/\/(www\.)?patreon.com/.test(location.href)) {
      $appendToButton = document.querySelector(".sc-fzoLsD.etpOIT");
      found = true;
    } else if (/^https:\/\/(www\.)?linkedin.com/.test(location.href)) {
      linkedInButton(document.querySelector(".pv-s-profile-actions__overflow"));
    } else if (/^https:\/\/github.com/.test(location.href)) {
      $appendToButton = document.querySelector('[aria-label="Select assignees"]');
      found = true;
    } else if (/^https:\/\/(www\.)?kickstarter.com/.test(location.href)) {
      // kickStarters
      $appendToButton = document.querySelector(".NS_projects__rewards_list ol");
      found = true;
    } else if (/^https:\/\/(www\.)?stackoverflow.com/.test(location.href)) {
      // stackoverflow
      bountyButton(document.querySelector(".question .comments-link"));
    } else if (document.querySelector(".ProfileSidebar .PhotoRail")) {
      $appendToButton = document.querySelector( ".ProfileSidebar .PhotoRail");
      found = true;
    } else if(/^https:\/\/(www\.)?twitter.com/.test(location.href) && document.querySelector('header > div > div > div > div > div + div + div')) {
      $appendToButton = document.querySelector('header > div > div > div > div > div + div + div');
      found = true; 
    } else if (/^https:\/\/(www\.)?facebook.com.*/.test(location.href)) {
      // facebook 
      // pagerefresh doesn't work due to how the site was made, we have to monitor it when we land on this page
      // we will give it about 20s to find the right element, or when it's found, remove the monitoring.
      slowPageTimer('#profile_timeline_tiles_unit_pagelets');
    } else if (/^https:\/\/(www\.)?ebay.com/.test(location.href) && document.getElementById("RightSummaryPanel")) {
      // ebay
      $appendToButton = document.querySelector("#RightSummaryPanel").lastChild;
      found = true;
    } else if (/^https:\/\/(www\.)?youtube.com/.test(location.href)) {
      // youtube pledge allowed, don't inject box yet
      found = true;
    } else if ( /^https:\/\/(www\.)?fiverr.com/.test(location.href) ){
      // fiverr
      $appendToButton = document.querySelector( ".contact-seller.display-contact-seller");
      document.querySelector('.sidebar.poly-sticky').style.position = "static";
      found = true;
    } else if (/^https:\/\/(www\.)?t.me/.test(location.href)) {
      $appendToButton = document.querySelector(".tgme_page").lastChild;
      found = true;
    } else if(/^https:\/\/(www\.)?blockchain.com\/(btc|eth)\/address\//.test(location.href)) {
      $appendToButton = document.querySelector('.fieq4h-0.eGdsW:nth-child(3) > div .fieq4h-0.eGdsW .ild1xh-1.dBgUTl') || 
                          document.querySelector('.fieq4h-0.eGdsW:nth-child(3) > div .fieq4h-0.eGdsW .ahwase-1.dZEFco');
      found = true;
    } else if (/^https:\/\/(www.)?xmrchain.net\/search\?value=/.test(location.href)) { 
      $appendToButton = document.querySelector('body div:nth-child(2) h4');
      found = true; 
    } else if (/^https:\/\/(www\.)?ardor.tools\/account\//.test(location.href)) { 
      // account for slow load(angular app? loading animation) 
      slowPageTimer('#accountTable')
    }

    return found;
  }

  function slowPageTimer(selector) {
    let counter = 0;
    let waitForPageToLoad = setInterval(() => {
      if (counter > 20) clearInterval(waitForPageToLoad);
      if (document.querySelector(selector)) {
        $appendToButton = document.querySelector(selector);
        clearInterval(waitForPageToLoad);
        init();
      }
      counter += 1;
    }, 1000); 
  }

  function linkedInButton(selector) {
    if (!reload && i("msg-with-bitcoin")) return;

    removeElm("#msg-with-bitcoin");

    const msgWithBitcoinBtn = document.createElement("div");
    msgWithBitcoinBtn.id = "msg-with-bitcoin";

    msgWithBitcoinBtn.innerHTML = `
      <div id="msg-with-bitcoin__container" style="margin: auto;">
        <img src="https://i.imgur.com/xB1Zs68.png" width="25" height="25" style="width: 25px; height: 25px; vertical-align: middle;">
         Message with Bitcoin
      </div>
    `;
    selector.before(msgWithBitcoinBtn);

    document
      .getElementById("msg-with-bitcoin")
      .addEventListener("click", event => {
        alert("Experimental POC - Work in Progress");
      });
  }

  function bountyButton(selector) {
    if (!reload && i("bounty-with-bitcoin")) return;

    removeElm("#bounty-with-bitcoin");

    const bitcoinBountyButton = document.createElement("a");
    bitcoinBountyButton.id = "bounty-with-bitcoin";
    bitcoinBountyButton.setAttribute("css", "height: 20px;");
    bitcoinBountyButton.innerHTML = `
        <img src="https://i.imgur.com/xB1Zs68.png" style="width: 15px; height: auto; vertical-align: text-bottom; margin-right: 5px;">
        Start a Bitcoin bounty reward
    `;

    selector.after(bitcoinBountyButton);

    document
      .getElementById("bounty-with-bitcoin")
      .addEventListener("click", event => {
        alert("Experimental POC - Work in Progress");
      });
  }

  async function init() {
    if (!reload && q(".pledge-status-container") || !AVAILABLE_PAGE_ELM_FOUND) return;

    // to remove random params in URL like querystrings
    CURRENT_URL = getFormattedGoFundMeUrl(location);
    urlHash = await hashUrl(CURRENT_URL);

    chrome.storage.local.get(["coins", "balance"], async item => {
      if (item.coins && item.coins.length) {
        coins = JSON.parse(item.coins);
        const result = await onMessageAPIWrapper({
          node: GLOBAL["node"],
          requestType: "getAccount",
          account: coins["nxtaddr"]
        });
        if (result.errorDescription) {
          createActivateButton();
        } else {
          createPledgeButton();
        }
      } else {
        createPledgeButton();
        coins = {};
      }
      if (item.balance) {
        balance = item.balance / 100000000;
      }
      getRecentPledges();
    });
  }

  function createPledgeButton() {
    const cssID = "donate-btc-btn";
    if (!i(cssID)) {
      const donateCryptoBtn = createCustomButton(cssID);
      donateCryptoBtn.innerHTML = cryptoBtnLabel;
      if ($appendToButton) {
        // If the appendto elment is the last element, we put it after, orelse insert it before the selected elm
        $appendToButton.nextSibling == null
          ? $appendToButton.after(donateCryptoBtn)
          : $appendToButton.before(donateCryptoBtn);
        document.getElementById("donate-btc-btn")
          ? document
              .getElementById("donate-btc-btn")
              .addEventListener("click", donateHandler)
          : "";
        campaignStatusMarkupContainer(cssID);
        const btcaddress = coins.btcpub;
        drawModal("btcpub", btcaddress);
      }
    }
  }

  function createActivateButton() {
    const cssID = "activate-account";
    if (!i(cssID)) {
      const donateCryptoBtn = createCustomButton(cssID);
      donateCryptoBtn.innerHTML = "Pledge Bitcoin <br/> Activate Account First";
      if ($appendToButton) {
        $appendToButton.nextSibling === null
          ? $appendToButton.after(donateCryptoBtn)
          : $appendToButton.before(donateCryptoBtn);
        document
          .getElementById("activate-account")
          .addEventListener("click", activateHandler);
        campaignStatusMarkupContainer(cssID);
      }
    }
  }

  function createCustomButton(cssID) {
    const cryptoBtn = document.createElement("a");
    cryptoBtn.setAttribute("id", cssID);
    cryptoBtn.setAttribute("href", "javascript:void(0)");
    return cryptoBtn;
  }

  async function campaignStatusMarkupContainer(cssID) {
    if (document.querySelector(".pledge-status-container")) return;
    const $pledgeBtn = document.getElementById(cssID);
    if ($pledgeBtn) {
      const pledgeStatusContainer = document.createElement("div");
      pledgeStatusContainer.setAttribute("class", "pledge-status-container");
      pledgeStatusContainer.setAttribute(
        "style",
        "border: 1px solid #eee;background: #eee8d8; clear: both; color: #000; margin: 10px auto 10px auto; max-width: 300px"
      );
      pledgeStatusContainer.innerHTML = pledgeStatusTemplate();
      $pledgeBtn.before(pledgeStatusContainer);
    }

    const isTelegramPage = /^https:\/\/[www.]*t.me\/[a-zA-Z0-9_]*$/.test(
      CURRENT_URL
    );
    if (!document.querySelector(".pledge-verified-address") && isTelegramPage) {
      const addressContainer = document.createElement("div");
      addressContainer.setAttribute("class", "pledge-verified-address");
      addressContainer.innerHTML = await createTelegramPageMarkup();
      document
        .querySelector(".pledge-status-container")
        .before(addressContainer);

      const pledgeListContainer = document.createElement("ul");
      pledgeListContainer.className = "pledge-list-container";
      const recentPledges = await getTelegramRecentPledgesMarkup();
      pledgeListContainer.innerHTML = recentPledges;
      setTimeout(() => {
        document.querySelector("#donate-modal").after(pledgeListContainer);
      }, 1000);
    }

    try {
      
      const properties = await getPledgedStatus();
      if (!properties.status) {
        q(
          ".pledge-status"
        ).innerHTML = `<strong>Be first to make a pledge!</strong>`;
      } else if (properties.status == "unverified") {
        const verifyURL = `${location.protocol}//${getDomainWithoutSubdomain(location.origin)}/${location.pathname.split("/").pop()}`;
        const registrationForm = `https://docs.google.com/forms/d/e/1FAIpQLSe0tLkBfglKU3DVf8zkfO2XWSDA9WAZUx95OxkfW8ncU5LLcQ/viewform?usp=pp_url&entry.760043283=${verifyURL}`;
        q(
          ".pledge-output"
        ).innerHTML = `<strong>${properties.status}<strong> <a href=${registrationForm} target="_blank">[?]</a>`;
      } else {
        q(".pledge-output").innerHTML = `<strong>${properties.status}</strong>`;
      }

      delete properties.status;

      handleAltCoinPropertyResponse(properties);
    } catch (error) { 
      console.error(error)
    }
  }

  // filter out zero-balance coins and only work on the coins with money in it.
  function handleAltCoinPropertyResponse(properties) {
    const filteredByBalance = SUPPORTED_TOKENS.filter(
      coin => properties[coin] > 0
    );

    const filteredBySupportedTokens = SUPPORTED_TOKENS.filter(
      coin =>
        SUPPORTED_TOKENS.some(i => i.includes(coin)) &&
        !filteredByBalance.some(j => j.includes(coin))
    );

    filteredByBalance.forEach(coin => {
      q(`.pledged-total .${coin} span`).innerHTML = properties[coin];
      cryptoToUSD(coin, properties[coin]).then(res => {
        if (res > 0)
          q(`.pledged-total .${coin} sup`).innerHTML = "($" + res + ")";
      });
      q(`.pledged-total .${coin}`).classList.remove("hide");
    });

    if (filteredBySupportedTokens.length > 0) {
      filteredBySupportedTokens.forEach(coin => {
        q(`.pledged-total-empty .${coin}`).classList.remove("hide");
      });
    } else {
      hideElm(".pledged-total-empty-container");
    }
  }

  function activateHandler() {
    if (coins.btcpub) {
      const $activateAccount = document.querySelector("#activate-account");
      const loader = createLoadingAnimationElement();
      $activateAccount.appendChild(loader);
      onMessageAPIWrapper({
        requestType: "activateAccount",
        account: coins["nxtaddr"],
        publicKey: coins["nxtpub"]
      }).then(result => {
        removeLoadingAnimationElement();
        let { text } = result;
        if (text === "Account Activated") {
          createProgressBar(0.5);
        } else {
          alert("Try again later.");
        }
      });
    } else {
      alert("Sign into Extension and Reload Page.");
    }
  }

 

 function toggleGofundmeDefaultBtns({show}) {
    if(show) { 
      showElm('[data-element-id="btn_donate"]');
      showElm('[data-element-id="btn_share"]')

      // Charity subdomain
      showElm('.js-sm-up-container .js-lp-donate-button');
      showElm('.js-sm-up-container .js-facebook-share');
    } else { 
      hideElm('[data-element-id="btn_donate"]');
      hideElm('[data-element-id="btn_share"]')

      hideElm('.js-sm-up-container .js-lp-donate-button');
      hideElm('.js-sm-up-container .js-facebook-share');
    }
  }

  function donateHandler() {
    if (coins.btcpub) {
      if (document.getElementById("donate-modal")) {
        const $donateModal = document.getElementById("donate-modal");
        $donateModal.classList.toggle("close"); 
        
        if ($donateModal.classList.contains("close")) {
          toggleGofundmeDefaultBtns({show: true})
          displayProcessingMsg();
          if (balance > 0 && document.getElementById("empty-account")) {
            document.getElementById("empty-account").remove();
            document.querySelector(".pledge-btn").disabled = false;
          }
        } else {
          toggleGofundmeDefaultBtns({show: false})
        }
      } else {
        const btcaddress = coins.btcpub;
        drawModal("btcpub", btcaddress);
        displayProcessingMsg();
      }
    } else {
      alert("Sign into Extension and Reload Page.");
    }
  }

  async function drawModal(coinSelect = "btcpub", btcAddress) {
    let balanceOutput = "",
      url = "";

    try {
      const [imgBlob, balanceRes] = await Promise.all([
        getImgBlob(btcAddress),
        getBalanceResponse("btc", btcAddress)
      ]);
      balanceOutput = +balanceRes.balance / 100000000 + " BTC";
      url = URL.createObjectURL(imgBlob);
    } catch (err) {
      console.log("Layers Error: ", err);
    }
    if (document.getElementById("donate-modal")) {
      document.getElementById("donate-modal").remove();
    }

    const modal = document.createElement("div");
    modal.setAttribute("id", "donate-modal");
    modal.setAttribute("class", "close");
    modal.setAttribute(
      "style",
      "position: relative;border: 1px solid #eee;padding: 0 0 9px; margin: 0 auto 10px auto; background: #eee8d8; clear: both; max-width: 300px"
    );

    const explorerLink = getExplorerLink("btc", btcAddress);

    modal.innerHTML = modalTemplate({
      url,
      explorerLink,
      btcAddress,
      balanceOutput
    });

    document.getElementById("donate-btc-btn").after(modal);

    SUPPORTED_TOKENS.forEach(token => {
      const newElm = `<option value=${token}>${getCoinLabel(token)}`;
      q(".coin-options").insertAdjacentHTML("beforeend", newElm);
    });

    onMessageAPIWrapper({
      requestType: "getConversionValue",
      coin: "btc"
    }).then(result => {
      if (result)
        document.querySelector("#total-price .price").textContent =
          result.price;
    });

    // get the first note
    getRecentNote().then(note => {
      if (note) {
        const newElm = document.createElement("div");
        newElm.setAttribute(
          "style",
          "background:rgba(206,206,206,0.5);margin: 10px 0 0 0;"
        );
        newElm.innerHTML = note;
        document.querySelector("#donate-modal .coin-address").after(newElm);
      }
    });

    recurrenceOptionListener();
    coinSwap();
    pledgeConversionListener();
    submitPledgeListener();
  }

  //Returns HTML markup
  async function getRecentNote() {
    let note = "";
    const query = await hashUrl(CURRENT_URL);
    try {
      const response = await onMessageAPIWrapper({
        node: GLOBAL["node"],
        requestType: "searchTaggedData",
        chain: "IGNIS",
        tag: "donation",
        query,
        MASTER_ACCOUNT
      });
      for (let i = 0; i < response.data.length; i++) {
        const data = response.data[i],
          hash = data.transactionFullHash,
          noteResponse = await onMessageAPIWrapper({
            node: GLOBAL["node"],
            requestType: "getTaggedData",
            chain: "IGNIS",
            query: hash
          });

        if (
          noteResponse.isText &&
          noteResponse.type == "text/plain" &&
          noteResponse.tags === "donation"
        ) {
          note = escapeHTML(noteResponse.data);
          // break;
        }
        if (
          noteResponse.isText &&
          noteResponse.type == "text/plain" &&
          noteResponse.tags === "pledged"
        ) {
          console.log(noteResponse);
        }
      }
      return note;
    } catch (err) {
      console.log("Layers Error: ", err);
      return "";
    }
  } //func getRecentNote

  async function getRecentPledges() {
    const $sideColumn =
      document.querySelector(".side-column") ||
      document.querySelector(".o-campaign-sidebar");
    const $columnContainer =
      document.querySelector(".donations-column-contain") ||
      document.querySelector(".o-campaign-sidebar-wrapper");
    if (!$sideColumn || !$columnContainer) return;

    let pledgeList = [];
    let urls = [CURRENT_URL];

    if (CURRENT_URL.includes('gofundme')) {
      const urlObj = new URL(CURRENT_URL);
      const oldURL = getFormattedGoFundMeUrl(urlObj);

      urls['oldURL'] = oldURL;
    }
    const urlHashes = await getQueries(urls);

    // CHeck url, sae them in an array, get url response.
    for (let _urlHash in urlHashes) {
      const searchResponse = await onMessageAPIWrapper({
        node: GLOBAL["node"],
        requestType: "searchTaggedData",
        chain: "IGNIS",
        tag: "pledge-note",
        query: urlHashes[_urlHash]
      });

      if (searchResponse.data && searchResponse.data.length) {
        let limit =
          searchResponse.data.length > 20 ? 20 : searchResponse.data.length;
        for (let i = 0; i < limit; i++) {
          const data = searchResponse.data[i];
          // the label explicitly contains the follow tags only
          const tagArray = data.tags.split(",");
          if (!data.tags.includes("COIN") || !tagArray[3].includes("COIN"))
            continue;

          const hash = data.transaction;
          const result = await onMessageAPIWrapper({
            node: GLOBAL["node"],
            requestType: "getTaggedData",
            chain: "IGNIS",
            query: hash
          });
          try {
            let resultObj = JSON.parse(result.data) || {};
            resultObj.timestamp = result.transactionTimestamp;
            pledgeList.push(resultObj);
          } catch (error) {
            console.log("Layers error: ", error);
          }
        }
      }
    }

    if (pledgeList.length) {
      pledgeList.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
      pledgeList = removeDuplicatePledgeNotes(pledgeList);

      document.querySelectorAll(".crypto-pledges").forEach(elm => elm.remove());

      const pledgelist = document.createElement("div");
      pledgelist.setAttribute("class", "crypto-pledges");
      pledgelist.setAttribute(
        "style",
        "margin-bottom: 1.5rem;max-height:500px;overflow:auto;"
      );

      pledgelist.innerHTML = `
          <div class="link-bar" style="color:rgb(134, 88, 1); margin: 15px 0">Recent Crypto Pledges</div>
          <div class="crypto-pledge-list"><div class="loading-pledges">${
            createLoadingAnimationElement(100, 100).outerHTML
          }<h3>Filtering Pledges...</div></div></div>
      `;

      const isgofundmeNewTemplate = $sideColumn.classList.contains(
        "o-campaign-sidebar"
      );

      if (isgofundmeNewTemplate) {
        document.querySelector(".o-campaign-sidebar").style.position = "static";
        pledgelist.style.paddingLeft = "1.5rem";
        pledgelist.style.paddingRight = "1.5rem";
        $columnContainer.after(pledgelist);
      } else {
        $sideColumn.insertBefore(pledgelist, $columnContainer);
      }

      const $list = q(".crypto-pledges .crypto-pledge-list");

      try {
        let total = {
          btc: 0,
          xmr: 0,
          eos: 0,
          eth: 0,
          usdc: 0,
          usdt: 0,
          dai: 0
        };

        let list = pledgeList.map(async resultObj => {
          const {
            message = "",
            account,
            amount,
            coin,
            time = new Date().toDateString()
          } = resultObj;
          let formatted = scientificToDecimal(amount);
          total[coin] += formatted;

          let alias = await onMessageAPIWrapper({
            node: GLOBAL["node"],
            requestType: "getAliases",
            chain: "IGNIS",
            account
          });
          let acctInfo = `<span class="account">${account}</span>`;
          if (alias) {
            alias = alias.replace(alias[0], alias[0].toUpperCase());
            acctInfo = `<div class="alias"><span class="alias-name">@${alias}</span></div>`;
          }
          const coinLabel = coin;
          return `
            <img src="${
              icons[coinLabel.toLowerCase()]
            }" style="vertical-align:top;width:50px; float: left;" alt="${coinLabel} icon"/>
            <div style="padding-left: 60px;">
              <div class="account-container">${acctInfo}</div>
              <div class="pledge-amount"><strong>${formatted} ${coinLabel.toUpperCase()}</strong><div class="date" style="opacity: 0.5;font-size: 13px;">${time}</div></div>
            </div>
            ${message &&
              `<div class='note' style="opacity: 0.7;clear:left; margin: 10px 0 0; border-bottom: 1px solid #ccc; padding: 0 0 10px;"><em>${message}</em></div>`}
          `;
        });
        $list.innerHTML = "";

        list.map((item, index) => {
          item.then(result => {
            $list.innerHTML += `<div class="pledge-${index} supporter" style="margin: 0 0 20px">${result}</div>`;
          });
        });
        updateTotalPledgedForUnverified(total);
      } catch (error) {
        console.log("Layers: ", error);
      }
    }
  }

  function parseDonationList(array) {
    // Come up with a better way to format this, will do for now
    const clean = array.map(donation => {
      // We assume the data we are retrieving have the exact format as below
      // This will break othewise.
      const a = donation.split(" - ");
      const account = a[1].split(": ")[1];
      const date = a[4].split(": ")[1];
      const amtString = a[2].split(": ")[1];
      const amount = amtString.split(" ")[0];
      const coinLabel = amtString.split(" ")[1];
      return { account, date, amount, coinLabel };
    });

    let newArray = {};
    clean.forEach(current => {
      let index = current["account"];
      if (newArray[index]) {
        if (newArray[index]["account"] === current["account"]) {
          if (+newArray[index]["date"] < +current["date"]) {
            newArray[index] = current;
          }
        }
      } else {
        newArray[index] = current;
      }
    });
    return newArray;
  }

  function updateTotalPledgedForUnverified(total) {
    const $status = document.querySelector(".pledge-output b");
    if ($status && $status.textContent !== "verified") {
      Object.keys(total).forEach(coin => {
        if (total[coin] > 0) {
          let amount = total[coin];
          amount = formatCryptoDecimals(coin, amount);
          if (amount > 0)
            document.querySelector(
              `.pledged-total .${coin} span`
            ).textContent = amount;
          cryptoToUSD(coin, amount).then(result => {
            if (result) {
              document.querySelector(
                `.pledged-total .${coin} sup`
              ).textContent = `($${result})`;
            }
          });
        }
      });
    }
  }

  //Returns donated balance and status
  async function getPledgedStatus() {
    let campaignNames = [location.pathname.split("/").pop(), location.pathname.split("/").pop().toLowerCase()];
    let assetID;

    for(let campaignName of campaignNames) { 
      const currentUrlPattern = location.href.includes('gofundme.com') ? getFormattedGoFundMeUrl(location) : `${location.origin}/${campaignName}`;
      let escapedURL = currentUrlPattern.replace(
        /[-:/[\]{}()*+?.,\\^$|#\s]/g,
        "\\$&"
      );
      try {
        const response = await onMessageAPIWrapper({
          node: GLOBAL["node"],
          requestType: "searchAssets",
          chain: "IGNIS",
          query: escapedURL
        });

        if(response.assets.length) {
          for (let i = 0; i < response.assets.length; i++) {
            if (
              response.assets[i].accountRS === MASTER_ACCOUNT &&
              response.assets[i].description === currentUrlPattern
            ) {
              assetID = response.assets[i].asset;
              break;
            }
          } 
        }
      } catch (error) { 
        console.log("Layers Error: ", err);
      }
      if(assetID) break;
    }

    try { 
      if (assetID) {
        let pledgeStatus = { status: "unverified" };
        const response = await onMessageAPIWrapper({
          node: GLOBAL["node"],
          requestType: "getAssetProperties",
          asset: assetID,
          MASTER_ACCOUNT
        });

        let currencies = { btc: 0, ltc: 0, xmr: 0, eth: 0, eos: 0 };
        if (response.properties.length) {
          for (let p of response.properties) {
            if (p.property === "status") {
              pledgeStatus.status = p.value;
            }
            if (
              p.property === "btc" ||
              p.property === "xmr" ||
              p.property === "eth" ||
              p.property === "eos" ||
              p.property === "coin"
            ) {
              currencies[p.property] = p.value;
            }
          }
          pledgeStatus = { ...pledgeStatus, ...currencies };
        }
        return pledgeStatus;
      }
      return "";
    } catch (err) {
      console.log("Layers Error: ", err);
      return "";
    }
  } //func pledged

  function coinSwap() {
    q("#cdonate .coin-options").addEventListener("change", async function() {
      // reset
      q(".pledge-amount").value = "";
      q("#pledge-usd-value").innerHTML = "<strong>USD Value:</strong> <em>$0</em>";
      q("#total-price .price").textContent = "";
      removeElm("#cdonate .eos-label");

      let coinSelect = this.value;
      const coinLabel = this.options[this.selectedIndex].text;

      // use eth for USDC
      const erc20Tokens = ["usdc", "usdt", "dai"];
      const erc20Token = erc20Tokens.find(token => token === coinSelect);
      if (erc20Token !== undefined) coinSelect = "ethpub";

      console.log(coinSelect)
      coinAddress = coins[getPublicKeyIndex(coinSelect)];

      const isHiddenBalanceCoin = (coinSelect) => {
        if(coinSelect === "xmr") return true;
        if(coinSelect === "oxen") return true; 
        
        return false;
      }

      try {
        let balanceOutput;

        if (coinSelect === "eos") {
          balanceOutput = await handleEOSOutput();
        } else if (isHiddenBalanceCoin(coinSelect)) {
          balanceOutput = "Your Balance: Hidden";
        } else {
          let $pAmtClasses = q(".pledge-amount").classList;
          let $pBtnClasses = q(".pledge-btn").classList;

          $pAmtClasses.contains("disabled")
            ? $pAmtClasses.remove("disabled")
            : "";
          $pBtnClasses.contains("disabled")
            ? $pBtnClasses.remove("disabled")
            : "";

          const balanceRes = await getBalanceResponse(coinSelect, coinAddress);
          const balance =
            balanceRes && balanceRes.balance ? balanceRes.balance : 0;

          balanceOutput = formatBalanceMessage(coinSelect, balance);

          if (erc20Token !== undefined) {
            const erc20BalanceRes = await getBalanceResponse(
              coinSelect,
              coinAddress,
              getERC20Address(erc20Token)
            );
            const tokenBalance =
              erc20BalanceRes && erc20BalanceRes.message === "OK"
                ? erc20BalanceRes.result
                : 0;
            //usdc and usdt has 6 decimal places
            balanceOutput = `Your Balance: ${formatCryptoDecimals(
              erc20Token,
              tokenBalance
            )} ${erc20Token.toUpperCase()}<br><span>${balance /
              Math.pow(10, 18)} ETH</span>`;
          }
        }

        const imgBlob = await getImgBlob(coinAddress);
        const url = URL.createObjectURL(imgBlob);
        const explorerLink = erc20Token ? `https://etherscan.io/token/${getERC20Address(erc20Token)}` : getExplorerLink(coinSelect, coinAddress);
        q("#cdonate").setAttribute("class", "wrap-" + coinLabel.toLowerCase());
        q("#cdonate .balance").innerHTML = balanceOutput;
        q("#cdonate .coin-qr").src = url; 
        q("#cdonate .coin-address").innerHTML = 
          `<a href="${explorerLink}" target="_blank">${coinAddress}</a>
          <img src="${icons[this.value]}" alt="coin-icon" style="width:30px;margin:5px auto 0 auto;"/>
          `;
        q("#cdonate .pledge-btn").value = "Pledge " + coinLabel;
        q("#cdonate .pledge-amount").setAttribute('placeholder', `0.00 ${this.value.toUpperCase()}`)

        // USD conversion
        q("#total-price .label").textContent = this.value.toUpperCase();
        q("#total-price > a").href = getCoinPriceLink(this.value);
        let { price } = await onMessageAPIWrapper({
          requestType: "getConversionValue",
          coin: this.value
        });
        q("#total-price .price").textContent = price;
      } catch (err) {
        console.log("Layers Error: ", err);
      }
    });
  }

  async function handleEOSOutput() {
    let balanceOutput = "";
    try {
      const $eosElm = document.createElement("div");
      $eosElm.setAttribute("class", "eos-label");
      const accountNames = await onMessageAPIWrapper({
        requestType: "getEosAccountName",
        publicKey: coinAddress
      });
      if (accountNames[0]) {
        const accountName = accountNames[0];
        $eosElm.innerHTML = `<a href="https://eosflare.io/account/${accountName}" target="_BLANK">${accountName}</a>`;
        const b = await onMessageAPIWrapper({
          requestType: "getEOSBalance",
          accountName
        });
        // API returns balance + coinlabel, so no need to call formatBalanceMessage
        balanceOutput = "Your Balance: " + b;
      } else {
        q(".pledge-amount").classList.add("disabled");
        q(".pledge-btn").classList.add("disabled");
        $eosElm.innerHTML = "No EOS Account Linked to Key:";
        balanceOutput = "Your Balance: 0.00 EOS";
      }
      q("#cdonate .balance").after($eosElm);
      return balanceOutput;
    } catch (error) {
      console.log("Layers Error: ", error);
      return balanceOutput;
    }
  }

  function submitPledgeListener() {
    let amount,
      accountBalance,
      coinLabel,
      coinChosen,
      pledgeNote,
      usdValue,
      status,
      campaignStatus,
      recurrence;

    document.querySelectorAll('#cdonate__init input').forEach(elm => {
      elm.addEventListener('keydown', (event) =>{
        if(event.key === "Enter" || event.keyCode === 13) { 
          q('#cdonate .pledge-btn').click()
        } 
      })
    })

    q("#cdonate .pledge-btn").addEventListener("click", event => {
      event.preventDefault();
      amount = q("#cdonate .pledge-amount").value * 1 || 0;
      accountBalance = q(".balance").textContent.split(" ")[2] * 1;
      coinChosen = q("#cdonate .coin-options").value;
      coinLabel = coinChosen.toUpperCase();
      pledgeNote = q(".pledge-note").value;
      recurrence = q(".recurrence-container input").value || 'One time pledge';
      usdValue = q("#pledge-usd-value em")
        ? q("#pledge-usd-value em").textContent
        : 0;
      status = q(".pledge-output strong")
        ? q(".pledge-output strong").textContent
        : "";

      if (status === "verified") {
        campaignStatus =
          "This owner has verified and your pledge funds will be sent within 24 hours.";
      } else {
        campaignStatus =
          "This onwer has not verified this page yet, once verified your pledged funds will be sent.";
      }

      const notSupportedPunctuationRegex = /[^a-z0-9!?.\s]+/;
      pledgeNote = pledgeNote.replace(notSupportedPunctuationRegex, ' ');

      if (!location.protocol.includes("http")) {
        alert("We only accept pledges from a valid domain (https/http)");
        return;
      }

      if (accountBalance < amount) {
        alert("Insufficient " + coinLabel);
        return false;
      }
      // For bitcoin, seems like the min-amount is correlate to the current value of the bitcoin
      // min-amount needs to be increased when the bitcoin price goes up
      const formattedCoinChosen = Constant.getCrypto(coinChosen);
      if (formattedCoinChosen && minimumAmountRequired(coinChosen, amount) === false) {
        alert(`Not Enough Funds to Pay for Network Fees - Minimum Balance Requirements: ${Constant.minimumAmountEnum[formattedCoinChosen]}`);
        return false;
      }

      // Toggle confirmation box
      i(event.target.getAttribute("for")).checked = true;

      q("#cdonate__confirm .balance").textContent = `${amount} ${coinLabel}`;
      q("#cdonate__confirm .usd-value").textContent = usdValue;
      q("#cdonate__confirm .campaign-url").textContent =
      CURRENT_URL.length > 100
      ? CURRENT_URL.substr(0, 100) + "..."
      : CURRENT_URL;
      q("#cdonate__confirm .campaign-status").textContent = campaignStatus;
      q("#cdonate__confirm .recurrence").textContent = 'Pledge Frequency: ' + recurrence;
      q("#cdonate__confirm .pledge-note").textContent = pledgeNote
        ? "Message: " + pledgeNote
        : "";
    });

    q("#cdonate .pledge-submit").addEventListener("click", async event => {
      event.preventDefault();

      if (accountBalance < amount) {
        alert("Insufficient " + coinLabel);
        return false;
      }
      // For bitcoin, seems like the min-amount is correlate to the current value of the bitcoin
      // min-amount needs to be increased when the bitcoin price goes up
      const formattedCoinChosen = Constant.getCrypto(coinChosen);
      if (formattedCoinChosen && minimumAmountRequired(coinChosen, amount) === false) {
        alert(`Not Enough Funds to Pay for Network Fees - Minimum Balance Requirements: ${Constant.minimumAmountEnum[formattedCoinChosen]}`);
        return false;
      }

      const coinLabel = getCoinLabel(coinChosen);
      const pubAddress = q("#cdonate .coin-address").textContent.trim();
      const priIndex = getPrivateKeyIndex(coinChosen);
      const privateKey = coins[priIndex];

      let url = CURRENT_URL;
      let hash = urlHash;

      if (url.includes("gofundme.com")) {
        hash = await hashUrl(getFormattedGoFundMeUrl(new URL(url)));
      }

      let message = {
        coinPublic: pubAddress, //Sender
        coinPrivate: privateKey, //Sender Private
        coinChosen: coinLabel, //CoinType
        amount: amount, //Amount
        url: url, //URL
        urlHash: hash,
        nxtAddress: coins["nxtaddr"]
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

      if (coinChosen == "eos") {
        try {
          const accountNames = await onMessageAPIWrapper({
            requestType: "getEosAccountName",
            publicKey: pubAddress
          });
          if (accountNames[0]) {
            message.accountName = accountNames[0];
          } else {
            return false;
          }
        } catch (error) {
          console.log("Layers Error: ", error);
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

        if(getUID.properties && getUID.properties.length) {
          // there should only be one uid, otherwise something is off
          if(getUID.properties.length > 1) throw "Found more than one UID property.";
          message.uid = getUID.properties[0].value;
        } 
        
      } catch (error) { console.log(error) } 

      sendMessage(message); 
    });
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
        q('.recurrence-container input').value = selectedText;
        $options.classList.toggle('visible'); 
      }) 
    } 
  }

  function pledgeConversionListener() {
    const $val = document.getElementById("pledge-usd-value");
    try {
      q(".pledge-amount").addEventListener("input", async function() {
        const coin = q(".coin-options option:checked").value;
        const value = +this.value;

        if (value > 0) {
          Array.from(document.querySelectorAll('#cdonate .fadeToggle')).forEach(elm => {
            elm.classList.replace('fadeToggle','fadeToggle--off')
          })
          const usd = await cryptoToUSD(coin, value);
          $val.innerHTML = `<strong>USD Value:</strong> <em>$${usd}</em>`;
          !q(".amount-container").classList.contains("active")
            ? q(".amount-container").classList.add("active")
            : null;
        } else {
          $val.innerHTML = `<strong>USD Value:</strong> <em>$0</em>`;
          q(".amount-container").classList.contains("active")
            ? q(".amount-container").classList.remove("active")
            : null;
            Array.from(document.querySelectorAll('#cdonate .fadeToggle--off')).forEach(elm => {
              elm.classList.replace('fadeToggle--off','fadeToggle')
            }) 
        }
      });
    } catch (error) {
      console.log("Layers Error: ", error);
    }
  }

  function sendMessage(message) {
    onMessageAPIWrapper({
      node: GLOBAL["node"],
      requestType: "sendMessage",
      recipient: MASTER_ACCOUNT,
      secretPhrase: encodeURIComponent(coins["nxtpass"]),
      message: JSON.stringify(message)
    })
      .then(response => {
        if(response === 'user not logged in') throw 'user not logged in';
        if (!response.errorDescription) {
          q(".pledge-amount").value = "";
          q(".pledge-note").value = "";
          document.getElementById("processingMsg")
            ? document.getElementById("processingMsg").remove()
            : "";
          localStorage.setItem(
            "tx_store",
            location.pathname + ";" + response.fullHash
          );
          displayProcessingMsg();
          console.log(`${message["amount"]} ${message["coinChosen"]} pledged.`);
        } else if (response.errorDescription === "Insufficient balance") {
          alert("Please wait 2 minutes between each pledge");
        }
      })
      .catch(error => {
        if(error == 'user not logged in') {
          alert('Please check if you are logged in.')
        } else {
          console.error("Layers Error:", error) 
        }
      });
      
  }

  function displayProcessingMsg() {
    if (q("#processingMsg") || !q(".pledge-btn")) return;
    if (!localStorage.getItem("tx_store")) return;

    const txstore = localStorage.getItem("tx_store");
    const storeArray = txstore.split(";");
    const hash = storeArray[1];

    if (storeArray[0] !== location.pathname) return;
    onMessageAPIWrapper({
      node: GLOBAL["node"],
      requestType: "getTransaction",
      query: hash
    }).then(_ => {
      const div = document.createElement("div");
      const account = coins["nxtaddr"];
      div.id = "processingMsg";
      div.innerHTML = `<h2>Pledge Sent!</h2> <p>Processing in 2 hours. Your coins will be forwarded to the recipient if they are "verified". <br><br>If its a crowdfunding campaign it must also be fully funded for at least 14 days to prevent scams.</p><p>If there is not enough funds in your addresses, all your pending pledges on every site will be removed to help reduce spam.</p> Temporary ID: <a href="${GLOBAL["node"]}/index.html?account=${account}" target="_BLANK"> ${hash}</a>`;
      q("#cdonate__init-btn").before(div);

      const $cdonate = document.getElementById("cdonate");
      const containerHeight = $cdonate.clientHeight;
      const msgHeight = document.querySelector("#processingMsg").clientHeight;
      $cdonate.style.height = containerHeight + "px";

      const hideAll = document.querySelectorAll(
        "#cdonate > *:not(#processingMsg)"
      );
      hideAll.forEach((elm, key) => {
        elm.setAttribute("style", "transition: 2s all; opacity: 0;");
        setTimeout(() => {
          elm.style.display = "none";
        }, 1200);

        if (Object.is(hideAll.length - 1, key)) {
          setTimeout(() => {
            $cdonate.style.height = msgHeight + 20 + "px";
          }, 1000);
        }
      });
    });
  }

  async function cryptoToUSD(coin, amt) {
    try {
      const $price = document.querySelector("#total-price .price");
      let totalPrice;

      if ($price && $price.textContent.length) {
        totalPrice = $price.textContent;
      } else {
        totalPrice = await onMessageAPIWrapper({
          requestType: "getConversionValue",
          coin
        });
        totalPrice = totalPrice.price;
      }
      const cryptoToUSD = +totalPrice * amt;
      return cryptoToUSD.toFixed(2);
    } catch (error) {
      console.log("Layers Error:", error);
      return 0;
    }
  }

  async function createTelegramPageMarkup() {
    const defaultMessage =
      "<h2 style='text-align: center'>All funds sent to this user will remain unclaimed until they claim this page.</h2>";

    try {
      let telegramProperties = [];
      let name = location.pathname.split("/").pop();

      const currentUrlPattern = `${location.origin}/${name}`;
      let escapedURL = currentUrlPattern.replace(
        /[-:/[\]{}()*+?.,\\^$|#\s]/g,
        "\\$&"
      );
      const response = await onMessageAPIWrapper({
        node: GLOBAL["node"],
        requestType: "searchAssets",
        chain: "IGNIS",
        query: escapedURL
      });

      if (response.assets === undefined || response.assets.length == 0)
        throw "No Assets found.";
      let assetID;
      for (let i = 0; i < response.assets.length; i++) {
        if (
          response.assets[i].accountRS === MASTER_ACCOUNT &&
          response.assets[i].description === currentUrlPattern
        ) {
          assetID = response.assets[i].asset;
          break;
        }
      }
      if (assetID) {
        const response = await onMessageAPIWrapper({
          node: GLOBAL["node"],
          requestType: "getAssetProperties",
          asset: assetID,
          MASTER_ACCOUNT
        });
        if (response.properties.length) {
          const isVerified = response.properties.some(
            p => p.property === "status" && p.value.toUpperCase() === "VERIFIED"
          );
          if (isVerified) {
            for (let p of response.properties) {
              if (p.property !== "status") {
                telegramProperties.push({
                  coin: getCoinLabel(p.property),
                  address: p.value
                });
              }
            }
          } else {
            throw new Error("User Not Verified");
          }
        }
      }

      const notHexOrNumber = value =>
        value.substr(0, 2) === "0x" || isNaN(value);

      //Change of request March 26, 2020
      //We don't need this if we are only showing the address, because we can just filter
      //it during API request
      //Keeping this just in case for now.
      const merge = telegramProperties.reduce((acc, cur) => {
        const key = cur.coin;
        if (acc[key]) {
          if (notHexOrNumber(cur.address)) {
            acc[key].address = cur.address;
          } else {
            acc[key].amount = cur.address;
          }
        } else {
          acc[key] = {};
          if (notHexOrNumber(cur.address)) {
            acc[key].address = cur.address;
          } else {
            acc[key].amount = cur.address;
          }
        }
        return acc;
      }, {});

      const coinMap = {
        Ethereum: {
          url: "https://etherscan.io/address/",
          icon:
            "https://s2.coinmarketcap.com/static/img/coins/64x64/1027.png?_=05911ce"
        },
        Monero: {
          url: "https://duckduckgo.com/?ia=answer&q=qr+code+",
          icon:
            "https://s2.coinmarketcap.com/static/img/coins/64x64/328.png?_=05911ce"
        },
        Bitcoin: {
          url: "https://www.blockchain.com/btc/address/",
          icon:
            "https://s2.coinmarketcap.com/static/img/coins/64x64/1.png?_=05911ce"
        },
        EOS: {
          url: "https://eosflare.io/key/",
          icon:
            "https://s2.coinmarketcap.com/static/img/coins/64x64/1765.png?_=05911ce"
        },
        Litecoin: {
          url: "https://blockchair.com/litecoin/address/",
          icon:
            "https://s2.coinmarketcap.com/static/img/coins/64x64/2.png?_=05911ce"
        },
        Coin: {
          url: "https://a1.annex.network/index.html?account=",
          icon:
            "https://s2.coinmarketcap.com/static/img/coins/64x64/2276.png?_=05911ce"
        }
      };
      const userName = location.pathname.replace("/", "");
      const tgMarketup = `<div class="campaign-status" style="line-height: 25px;"><h2>@${userName} Verified the following addresses<br>and can be paid directly to:</h2>
      ${Object.keys(merge)
        .map(item => {
          return `
            ${item}:<br>
            <img src=${coinMap[item].icon} style="width:25px; margin: 0 5px;"/>
            <a href=${coinMap[item].url +
              merge[item].address} target="_blank">${merge[item].address}</a>
            <br><br>
          `;
        })
        .join("")}
        <div class="crypto-pledges">
          <div class="crypto-pledge-list"></div>
        </div>
      </div> `;

      return tgMarketup;
    } catch (error) {
      console.log(error);
      return defaultMessage;
    }
  }

  async function getTelegramRecentPledgesMarkup() {
    let pledgeList = [];
    const searchResponse = await onMessageAPIWrapper({
      node: GLOBAL["node"],
      requestType: "searchTaggedData",
      chain: "IGNIS",
      tag: "pledge-note",
      query: urlHash
    });
    if (searchResponse.data && searchResponse.data.length) {
      let limit =
        searchResponse.data.length > 20 ? 20 : searchResponse.data.length;
      for (let i = 0; i < limit; i++) {
        const data = searchResponse.data[i];
        // the label explicitly contains the follow tags only
        const tagArray = data.tags.split(",");
        if (!data.tags.includes("COIN") || !tagArray[3].includes("COIN"))
          continue;

        const hash = data.transactionFullHash;
        const result = await onMessageAPIWrapper({
          node: GLOBAL["node"],
          requestType: "getTaggedData",
          chain: "IGNIS",
          query: hash
        });
        if (result.isText && result.type == "text/plain") {
          let note = snarkdown(escapeHTML(result.data));
          const time = getTimeByTimezone(
            result.transactionTimestamp,
            TIMEZONE,
            nodeType
          );

          try {
            let resultObj = JSON.parse(note);
            resultObj.time = time;
            resultObj.timestamp = result.transactionTimestamp;
            pledgeList.push(resultObj);
          } catch (error) {
            console.log("AERIS error: ", error);
          }
        }
      }

      if (pledgeList.length > 0) {
        let li = "";
        for (let i = 0; i < pledgeList.length; i++) {
          const noteObj = pledgeList[i];
          try {
            let {
              account,
              amount,
              coin,
              message,
              publicKey = "",
              time
            } = noteObj;
            const amtFormatted = parseFloat(amount);
            let aliasName = account;
            let alias = await onMessageAPIWrapper({
              node: GLOBAL["node"],
              requestType: "getAliases",
              chain: "IGNIS",
              account
            });

            if (alias) aliasName = "@" + alias;

            let cutPublicKey =
              publicKey.substring(0, 5) +
              "..." +
              publicKey.substring(publicKey.length - 5);

            li += `<li>
              <div><h4>${time} - <span class="address"><a href="${
              GLOBAL["node"]
            }/index.html?chain=${
              GLOBAL["chain"]
            }&account=${account}" target="_BLANK">${account.replace(
              /ardor-/i,
              ""
            )}</a></span></h4></div>
                <div class="note">
                  <span class="note-content">
                    <strong>${aliasName} Pledged: ${amtFormatted} ${coin.toUpperCase()}</strong><br />
                    <span class="pledge-msg">${message}</span></br >
                    <div class="publicKey">
                     Sender Address:
                     <a href="${getExplorerLink(
                       coin,
                       publicKey
                     )}" target="_BLANK">${cutPublicKey}</a>
                    </div>
                  </span>
                </div>
              </li >`;
          } catch (error) {
            console.log(error);
          }
        }

        return li;
      }
    }

    return "";
  }

  async function googleMapImplementation() {
    try {
      // set location url and location hash to localstorage;
      const mapURL = getGoogleMapsURL(location.href);

      // if (!getLocalStorage('xcmapurl') || getLocalStorage('xcmapurl') != mapLocationURL) {
      if (q(".xc-note-container"))
        document
          .querySelectorAll(".xc-note-container")
          .forEach(elm => elm.remove());

      setLocalStorage("xcmapurl", mapURL);

      const query = await hashUrl(mapURL);
      const response = await onMessageAPIWrapper({
        node: GLOBAL["node"],
        requestType: "searchTaggedData",
        chain: "IGNIS",
        tag: "pledge-note",
        query,
        MASTER_ACCOUNT
      });
      if (response.data.length > 0) {
        const noteContainer = document.createElement("div");
        noteContainer.className = "xc-note-container";
        noteContainer.style = `
          position: absolute;
          width: 130px;
          height: 90px;
          top: 0;
          right: 0;
          text-align:center;
          background: #edff75;
          padding: 15px;
          font-size: 16px;
          word-break: break-word;
          z-index: 999;
        `; 
        noteContainer.textContent = `${response.data.length} Pledges Detected here (${mapURL.split("@")[1]}). View in Layers Extension.`;
        if (!q(".xc-note-container")) document.body.appendChild(noteContainer);
      }
      // }
    } catch (error) {
      console.log(error);
    }
  } //func googleMapImplementation 


  function showPopupButton(btn) { 
    const buttonHost = document.querySelector("body");
    buttonHost.appendChild(btn);
  }

  function onMessageAPIWrapper(data) { 
    return new Promise(resolve => {
      chrome.runtime.sendMessage(data, res => {
        resolve(res);
      });
    });
  }
})(window, document);
