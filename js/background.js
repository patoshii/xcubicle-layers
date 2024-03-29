const defaultNode = "https://a1.annex.network";

chrome.runtime.onInstalled.addListener(async function () {
  chrome.contextMenus.create({
    id: "pledge-search",
    title: "Search Pledges by URL",
    contexts: ["browser_action"],
  });

  chrome.contextMenus.create({
    id: "notes-search",
    title: "Search Notes by URL",
    contexts: ["browser_action"],
  });

  chrome.contextMenus.create({
    id: "pledge-history",
    title: "View My Pledge History",
    contexts: ["browser_action"],
  });

  chrome.contextMenus.create({
    title: "View My Private Notes",
    id: "private-note",
    contexts: ["browser_action"],
  });

  // preset supported domains
  const supportedDomains = [
    "gofundme",
    "patreon",
    "linkedin",
    "github",
    "kickstarter",
    "facebook",
    "twitter",
    "stackoverflow|stackexchange",
    "ebay",
    "youtube",
    "fiverr",
    "google",
    "t",
    "blockchain",
    "xmrchain",
    "ardor",
  ];
  chrome.storage.local.set({ supportedDomains: supportedDomains.join(",") });
  const supportedTokens = "sol,btc,eth,usdc,coin";
  chrome.storage.local.set({ supportedTokens });

  try {
    const result = await validateNode(defaultNode);
    console.log(result);
    if (
      result &&
      result.blockchainState === "UP_TO_DATE" &&
      result.blockchainState !== "DOWNLOADING"
    ) {
      chrome.storage.local.set({
        activeNode: defaultNode,
      });
      chrome.storage.local.set({
        testnetNode: defaultNode,
      });
      chrome.storage.local.set({ isTestnet: result.isTestnet });
    } else {
      console.log(
        `Check ${defaultNode}. \Blockchain State:  ${result.blockchainState}`
      );
      chrome.storage.local.set({ activeNode: "https://a1.annex.network" });
      chrome.storage.local.set({
        testnetNode: "https://a1.annex.network",
      });
    }
  } catch (error) {
    console.log(error, "check testardor.xcubicle node.");
    chrome.storage.local.set({ activeNode: "https://a1.annex.network" });
    chrome.storage.local.set({ testnetNode: "https://a1.annex.network" });
  }
}); // onInstalled

// chrome.omnibox.onInputEntered.addListener(function (text) {
// 	chrome.tabs.update({ url: "https://www.google.com/search?q=eos://" + text });
// })

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (
    info.menuItemId === "pledge-history" &&
    localStorage.getItem("nxtaddr") != null
  ) {
    chrome.tabs.create({
      url: "/html/pledges.html?address=" + localStorage.getItem("nxtaddr"),
    });
  } else if (info.menuItemId === "pledge-search") {
    chrome.tabs.create({ url: "/landing/index.html" });
  } else if (info.menuItemId === "notes-search") {
    chrome.tabs.create({ url: "/html/notes.html" });
  } else if (info.menuItemId === "private-note") {
    chrome.tabs.create({
      url: "/html/private-notes.html",
    });
  }
});

chrome.tabs.onActivated.addListener(function (activeInfo) {
  if (!chrome.runtime.lastError) {
    chrome.tabs.sendMessage(activeInfo.tabId, { pageUpdate: "update" });
    chrome.tabs.get(activeInfo.tabId, function (tab) {
      if (tab.url && !tab.url.includes("pledgeContainer"))
        setSupportedPage(tab.url);
      try {
        let url = tab.url.replace(/\/$|\/#$|#$/gi, "");
        chrome.storage.local.get(
          ["activeNode", "accountAddress", "blocktimestamp"],
          async (item) => {
            const node = item.activeNode ? item.activeNode : defaultNode;
            const account = item.accountAddress ? item.accountAddress : "";
            const customTime = item.blocktimestamp
              ? item.blocktimestamp
              : moment().unix();
            const nodeType = await getNodeType(node);

            if (url.includes("https://www.google.com/maps")) {
              url = getGoogleMapsURL(url);
            }

            const current_url_hashed_public = await hashUrl(url);

            /*
						The extension icon should not light up if there are only PUBLIC + Sitewide notes. It should ONLY light up if there is a note on the URL itself that is public.
						Add the letter P to the extension if it detects a private note for the URL.
						Add the letter PS to the extnsion if it detects a private note or private sitewide note.
					*/
            const privateUrlHashes = await Promise.all([
              hashUrl(getLocalStorage("nxtpass") + getUrlHostName(url)),
              hashUrl(getLocalStorage("nxtpass") + url),
            ]);
            const globalUrlHashedPrivate = privateUrlHashes[0];
            const currentUrlHashedPrivate = privateUrlHashes[1];

            if (
              (await checkPledge(
                node,
                [current_url_hashed_public],
                customTime,
                nodeType
              )) ||
              (await checkPublicNote(
                node,
                [current_url_hashed_public],
                customTime,
                nodeType
              ))
            ) {
              setIconView(activeInfo.tabId);
              chrome.tabs.sendMessage(activeInfo.tabId, {
                pageUpdate: "note-found",
              });
            }

            if (
              await checkPrivateNote(
                [currentUrlHashedPrivate],
                account,
                node,
                customTime,
                nodeType
              )
            ) {
              setIconText("P", activeInfo.tabId);
            }

            if (
              await checkPrivateNote(
                [globalUrlHashedPrivate],
                account,
                node,
                customTime,
                nodeType
              )
            ) {
              setIconText("PS", activeInfo.tabId);
            }
          }
        );
      } catch (error) {
        console.log(error);
      }
    });
  }
});

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo) {
  if (!chrome.runtime.lastError) {
    chrome.tabs.sendMessage(tabId, { pageUpdate: "update" });
    if (changeInfo.status === "complete") {
      chrome.tabs.get(tabId, function (tab) {
        if (tab.url && !tab.url.includes("pledgeContainer"))
          setSupportedPage(tab.url);
        try {
          let url = tab.url.replace(/\/$|\/#$|#$/gi, "");
          chrome.storage.local.get(
            ["activeNode", "accountAddress", "blocktimestamp"],
            async (item) => {
              const node = item.activeNode ? item.activeNode : defaultNode;
              const account = item.accountAddress ? item.accountAddress : "";
              const customTime = item.blocktimestamp
                ? item.blocktimestamp
                : moment().unix();
              const nodeType = await getNodeType(node);

              if (url.includes("https://www.google.com/maps")) {
                url = getGoogleMapsURL(url);
              }

              const current_url_hashed_public = await hashUrl(url);

              const privateUrlHashes = await Promise.all([
                hashUrl(getLocalStorage("nxtpass") + getUrlHostName(url)),
                hashUrl(getLocalStorage("nxtpass") + url),
              ]);
              const globalUrlHashedPrivate = privateUrlHashes[0];
              const currentUrlHashedPrivate = privateUrlHashes[1];
              const publicNotes = await checkPublicNote(
                node,
                [current_url_hashed_public],
                customTime,
                nodeType
              );
              const privateNotes = await checkPrivateNote(
                [currentUrlHashedPrivate],
                account,
                node,
                customTime,
                nodeType
              );
              const pledge = await checkPledge(
                node,
                [current_url_hashed_public],
                customTime,
                nodeType
              );

              if (publicNotes.length || pledge) {
                setIconView(tabId);
                chrome.tabs.sendMessage(tabId, {
                  pageUpdate: "note-found",
                  payload: { publicNotes },
                });
              }

              if (privateNotes) {
                setIconText("P", tabId);
              }

              if (
                await checkPrivateNote(
                  [globalUrlHashedPrivate],
                  account,
                  node,
                  customTime,
                  nodeType
                )
              ) {
                setIconText("PS", tabId);
              }
            }
          );
        } catch (error) {}
      });
    }
  }
});

function setSupportedPage(location) {
  if (!location) return;
  location = new URL(location);
  chrome.storage.local.get("supportedDomains", (result) => {
    const supportedDomains = result["supportedDomains"];
    if (
      supportedDomainList(supportedDomains, location) &&
      (allowedPages(location) || allowedPledge(location))
    ) {
      chrome.storage.local.set({ pageSupported: true });
    } else {
      chrome.storage.local.set({ pageSupported: false });
    }
  });
}

async function checkPledge(node, urlHash, customTime, nodeType) {
  let found = false;
  try {
    const searchQueryRequest = `${node}/nxt?requestType=searchTaggedData&chain=ignis&tag=pledge-note,public,recorded&query=${urlHash}`;
    const searchResponse = await getRequest(searchQueryRequest);
    if (searchResponse.data) {
      for (let data of searchResponse.data) {
        if (
          transactionIsOlderThanSetTime(
            nodeType,
            customTime,
            data.blockTimestamp
          )
        ) {
          const tagArray = data.tags.split(",");
          if (!data.tags.includes("COIN") || !tagArray[3].includes("COIN"))
            continue;
          if (data.name != urlHash) continue;
          found = true;
          break;
        }
      }
    }
    return found;
  } catch (error) {
    return found;
  }
}

async function checkPublicNote(node, queries, customTime, nodeType) {
  try {
    for (let query of queries) {
      const response = await getRequest(
        node +
          "/nxt?requestType=searchTaggedData&chain=ignis&tag=note&query=" +
          query
      );
      let notes = [];

      for (let data of response.data) {
        if (data && !data.tags.includes("encrypted")) {
          if (
            transactionIsOlderThanSetTime(
              nodeType,
              customTime,
              data.blockTimestamp
            )
          ) {
            const noteResponse = await getRequest(
              node +
                "/nxt?requestType=getTaggedData&tag=note&transaction=" +
                data.transaction
            );

            notes.push({
              note: noteResponse.data,
              sender: noteResponse.accountRS,
              time: noteResponse.transactionTimestamp
            });
          }
        }
      }
      return notes;
    }
    return false;
  } catch (err) {
    return false;
  }
}

async function checkPrivateNote(queries, account, node, customTime, nodeType) {
  try {
    for (let query of queries) {
      const response = await getRequest(
        node +
          `/nxt?requestType=searchTaggedData&chain=ignis&tag=note,encrypted&query=${query}&account=${account}`
      );
      for (let data of response.data) {
        if (data) {
          if (
            transactionIsOlderThanSetTime(
              nodeType,
              customTime,
              data.blockTimestamp
            )
          ) {
            return true;
          }
        }
      }
    }
    return false;
  } catch (err) {
    console.log(err);
    return false;
  }
}

function setIconView(tabId) {
  if (!chrome.runtime.lastError) {
    chrome.browserAction.setIcon({ path: "../images/icon-1.png", tabId });
  }
}

function setIconText(text, tabId) {
  if (!chrome.runtime.lastError) {
    chrome.browserAction.setBadgeText({ text, tabId });
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const {
    requestType,
    node,
    chain,
    tag,
    query,
    account,
    recipient,
    secretPhrase,
    asset,
    MASTER_ACCOUNT,
    coin,
    publicKey,
    property,
    value,
    message,
    amount,
    searchProperty,
  } = request;

  if (requestType == "getAccount") {
    const url = `${node}/nxt?requestType=getAccount&account=${account}`;
    getApiRequest({ url }, sendResponse);
  } else if (requestType == "getBalance") {
    const url = `${node}/nxt?requestType=getBalance&chain=${chain}&account=${account}`;
    getApiRequest({ url }, sendResponse);
  } else if (requestType == "searchTaggedData") {
    const url = `${node}/nxt?requestType=searchTaggedData&chain=${chain}&tag=${tag}&query=${query}`;
    getApiRequest({ url }, sendResponse);
  } else if (requestType == "getTaggedData") {
    const url = `${node}/nxt?requestType=getTaggedData&chain=${chain}&transaction=${query}`;
    getApiRequest({ url }, sendResponse);
  } else if (requestType == "getAliases") {
    // const url = `${node}/nxt?requestType=getAliases&chain=${chain}&account=${account}`
    // getApiRequest({ url }, sendResponse);
    searchAccountAlias(node, account).then((result) => sendResponse(result));
  } else if (requestType == "searchAssets") {
    const url = `${node}/nxt?requestType=searchAssets&query=${query}`;
    getApiRequest({ url }, sendResponse);
  } else if (requestType == "getAssetProperties") {
    const url = `${node}/nxt?requestType=getAssetProperties&asset=${asset}&setter=${MASTER_ACCOUNT}`;
    getApiRequest({ url }, sendResponse);
  } else if (requestType == "getConversionValue") {
    const url = `https://layers.xcubicle.com/cryptoconvert.php?coin=${coin}`;
    getApiRequest({ url }, sendResponse);
  } else if (requestType == "activateAccount") {
    const url = `https://layers.xcubicle.com/xactivate.php?address=${account}&publicKey=${publicKey}`;
    getApiRequest({ url }, sendResponse);
  } else if (requestType == "setAccountProperty") {
    const url = `${node}/nxt?requestType=setAccountProperty&chain=IGNIS&recipient=${recipient}&secretPhrase=${secretPhrase}&feeNQT=100000000&property=${property}&value=${value}`;
    getApiRequest({ url, method: "POST" }, sendResponse);
  } else if (requestType == "sendMessage") {
    // Send message requires checking weather the user is logged in, by looking at the chrome.storage
    const referenceTx = `2:e600d12a862451add88047a40b99b782bd0e0b4c320ebdf2dae9ba980b4a34`;
    const data = `&recipient=${recipient}&secretPhrase=${secretPhrase}&chain=ignis&message=pledge&messageToEncrypt=${message}&deadline=2&broadcast=true&messageToEncryptIsText=true&encryptedMessageIsPrunable=true&feeNQT=0&referencedTransactionFullHash=${referenceTx}`;
    const url = `${node}/nxt?requestType=sendMessage${data}`;
    userLoggedIn().then((isLoggedIn) => {
      if (isLoggedIn) {
        getApiRequest({ url, method: "POST" }, sendResponse);
      } else {
        sendResponse("user not logged in");
      }
    });
  } else if (requestType == "getTransaction") {
    const url = `${node}/nxt?requestType=getTransaction&fullHash=${query}`;
    getApiRequest({ url }, sendResponse);
  } else if (request.requestType == "getEosAccountName") {
    getEosAccountName(request.publicKey, sendResponse);
  } else if (request.requestType == "getEOSBalance") {
    getEOSBalance(request.accountName, sendResponse);
  } else if (request.requestType == "getAccountPropertyByPropertyName") {
    const url = `${node}/nxt?requestType=getAccountProperties&recipient=${account}&property=${searchProperty}&setter=${MASTER_ACCOUNT}`;
    getApiRequest({ url }, sendResponse);
  } else if (request.action === "createWindow" && request.url) {
    chrome.windows.getCurrent(function (win) {
      var width = 500;
      var height = 600;
      var left = screen.width / 2 - width / 2 + win.left;
      var top = screen.height / 2 - height / 2 + win.top;

      chrome.windows.create({
        url: request.url,
        width: width,
        height: height,
        top: Math.round(top),
        left: Math.round(left),
        type: "popup",
      });
    });
  }

  return true;
});

function userLoggedIn() {
  return new Promise((resolve) => {
    chrome.storage.local.get(null, (result) => {
      resolve(result.coins ? true : false);
    });
  });
}

function getEosAccountName(publicKey, cb) {
  return fetch("https://eos.greymass.com:443/v1/history/get_key_accounts", {
    method: "POST", // or 'PUT'
    body: `{"public_key":"${publicKey}"}`,
    headers: { "Content-Type": "application/json" },
  })
    .then((res) => res.json())
    .then((r) => cb(r.account_names));
}

function getEOSBalance(accountName, cb) {
  return fetch("https://eos.greymass.com:443/v1/chain/get_currency_balance", {
    method: "POST", // or 'PUT'
    body: `{"account":"${accountName}","code":"eosio.token","symbol":"EOS"}`,
    headers: { "Content-Type": "application/json" },
  })
    .then((res) => res.json())
    .then((r) => cb(r.toString() || ""));
}

function getApiRequest({ url, method = "GET" }, cb) {
  fetch(url, { method })
    .then((res) => res.json())
    .then((res) => {
      cb(res);
    });
}
