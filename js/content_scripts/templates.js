const pledgeStatusTemplate = () => {
  const btc = chrome.extension.getURL("../images/btc-icon.png");
  const ltc = chrome.extension.getURL("../images/ltc-icon.png");
  const xmr = chrome.extension.getURL("../images/xmr-icon.png");
  const eos = chrome.extension.getURL("../images/eos-icon.png");
  const eth = chrome.extension.getURL("../images/eth-icon.png");
  const usdc = chrome.extension.getURL("../images/usdc-icon.png");
  const usdt = chrome.extension.getURL("../images/usdt-icon.png");
  const dai = chrome.extension.getURL("../images/dai-icon.png");
  const ignis = chrome.extension.getURL("../images/ignis-icon.png");

  const currencies = [
    { code: "btc", name: "Bitcoin", src: btc },
    { code: "ltc", name: "Litecoin", src: ltc },
    { code: "xmr", name: "Monero", src: xmr },
    { code: "eos", name: "EOS", src: eos },
    { code: "eth", name: "Ethereum", src: eth },
    { code: "usdc", name: "USDC", src: usdc },
    { code: "usdt", name: "USDT", src: usdt },
    { code: "dai", name: "DAI", src: dai },
    { code: "ignis", name: "IGNIS", src: ignis },
  ];

  return `
			<div id="total-pledges" style="padding: 10px;">
				<h3 style="color: #000; text-align: center; padding: 9px 0;margin: inherit; font-size: 20px;">Pledges in Cryptocurrency</h3>
				<small class="pledge-status" style="display: block;margin:5px 0;text-align: center;color: red;"><b>Status:</b> <em
						class="pledge-output"> <strong>Unclaimed</strong> &gt; Verified &gt; Pledges Claimed</em></small>
				<ul class="pledged-total">
					${currencies.map((currency) => {
            return `<li class="${currency.code} hide">
											<h5 style="display:inline-block;margin:0;font-size:14px;width:40px"><img src="${currency.src}" alt="${currency.name}" /></h5>
											<div class="value"><span>0</span> <sup>($0)</sup></div>
										</li>`;
          }).join("")}
				</ul>
				<details class="pledged-total-empty-container">
					<summary>Supported Coins</summary>
					<ul class="pledged-total-empty">
					${currencies.map((currency) => {
            return `<li class="${currency.code} hide">
											<h5 style="display:inline-block;margin:0;font-size:14px;width:40px"><img src="${currency.src}" alt="${currency.name}" /></h5>
											<span style="display:inline-block;width:60px;vertical-align:super;">${currency.name}</span>
										</li>`;
          }).join("")}
					</ul>
				</details>
			</div>
		`;
};

const modalTemplate = ({ url, explorerLink, btcAddress, balanceOutput }) => {
  return `
		<div id="cdonate" class="wrap-bitcoin" style="text-align:center;padding: 9px;word-wrap: break-word;transition: 2s all;"> 
			<input id="cdonate__init-btn" type="radio" name="cdonate">
			<input id="cdonate__confirm-btn" type="radio" name="cdonate" checked>
			<div id="cdonate__init">
				<select class="coin-options" name="coin"></select>
				<h3 style=" font-size: 14px; margin: 0 0 5px;">Deposit To Your Address<br><span class="coin-address"><a href="${explorerLink}" target="_blank" style="font-size:13px">${btcAddress}</a></span></h3>
				<img class="coin-qr" style="border: 1px solid #000;margin:auto;" src=${url}>
				<h4 class="balance" style="margin:0;color:#f00;font-size: 16px;">Your Balance: ${balanceOutput}</h4>
				<details>
					<summary style="outline: none; cursor: pointer; margin-bottom:5px;">How does this work?</summary>
					<ul style="list-style:none; margin: 0; padding-left:15px; text-align: left;">
						<li>- Deposit coins to "your address"*</li>
						<li>- Enter a pledge amount**</li>
						<li>- Amount will be withdrawn when compaign ends.***</li>
					</ul>
					<div style="text-align: left; padding: 15px;">
						<p>Read the <a href="#">FAQ</a></p>
						<p>* You control your own private keys. View them in the extension options.</p>
						<p>** Upon pledging, your private keys are shared with us creating a "shared" address. The pledge amount will be
							withdrawn when the campaign ends. If there are not enough funds in the address, nothing happens.</p>
					</div>
				</details>
				<div class="amount-container">
					<input style="box-sizing:border-box;border:1px solid #000;width:180px;height:40px;" placeholder="Amount" type="number" class="pledge-amount">
					<div id="pledge-usd-value"><strong>USD Value:</strong> <em>$0</em></div>
				</div>
				<input type="text" class="pledge-note" placeholder="Add a message (Optional)" maxlength="100" style="width: 100%; margin: 10px 0;width:250px;height:40px">
				<label for="cdonate__init-btn" tabindex="0" class="pledge-btn">Pledge Now</label>
				<sup id="total-price" style="margin-top: 15px; display: inline-block;"><em>Currenctly 1 <span class="label" style="color:#000;"> BTC </span> = $<span class="price"></span></em></sup>
				</div>
				<div id="cdonate__confirm"> 
				<strong style="color: #f00">Confirm Pledge?</strong>
				<label for="cdonate__init-btn" class="pledge-submit">Yes</label>
				<label for="cdonate__confirm-btn" class="pledge-btn">Cancel</label>
					<p>Sending <span class="balance"></span><br>(<span class="usd-value"></span> USD) to</p>
					<p class="campaign-url"></p>
					<p class="pledge-note"></p>
					<p class="campaign-status"></p>
			</div>
		</div>
  `;
};
