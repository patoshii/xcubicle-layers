
chrome.storage.local.get(['activeNode', 'isTestnet'], function (result) {
  pledges(result['activeNode'], result['isTestnet']);
});

async function pledges(node = 'https://testardor.jelurida.com', isTestnet=true) { 
  let pledgeList = [];

  // Get the address query string 
  const urlParams = new URLSearchParams(window.location.search);
  const address = urlParams.get('address').split('?')[0];

  if (!address) {
    document.querySelector('.container h1').textContent = 'Address not found, Make sure you are logged in';
    return;
  }

  document.querySelector('.container h1 sup').textContent = ` (${isTestnet ? 'Testnet' : 'Mainnet'})`; 
  document.querySelector('.pledges').after(loader()); 
  document.querySelector('.loading h1').innerHTML = `Trouble loading?<br/>See if your node is working: <a href="${node}/index.html?chain=IGNIS&account=${address}" target="_blank">${node}</a>`;

  const searchQueryRequest = `${node}/nxt?requestType=searchTaggedData&chain=ignis&tag=${address},pledge-note`;

  const cloudResponse = await window
    .fetch(searchQueryRequest, { method: 'GET' })
    .then(res => res.json());

  if (cloudResponse.data) {
    for (let data of cloudResponse.data) {
      // the label explicitly contains the following tags only 
      if (data && data.tags.includes(`pledge-note`) && data.tags.includes(address)) {
        const hash = data.transactionFullHash;
        const pledgeRequest = `${node}/nxt?requestType=getTaggedData&chain=ignis&transactionFullHash=${hash}`;

        const donationResponse = await window
          .fetch(pledgeRequest, { method: 'GET' })
          .then(res => res.json());

        try { 
          const resultObj = JSON.parse(donationResponse.data);
          resultObj['hash'] = donationResponse.transactionFullHash;
          pledgeList.push(resultObj);
        } catch (error) { 
          console.log("Aeris: ", error)
        } 
      }
    }

    const emptyText = ['No Pledges Detected.'];

    if (pledgeList.length == 0) {
      document.querySelector('.pledges').innerHTML = emptyText;
    } else {
      const html = pledgeList.map(pledge => {
        const { hash, message='', account, amount, coin, publicKey, url, time = new Date().toDateString() } = pledge;
        return `
          <td class="date">${time}</td>
          <td class="amount">${(+amount).toFixed(8)} ${coin.toUpperCase()}</td> 
          <td class="url" ><a href="${url}#${hash}" target="_BLANK">${url}</a></td>
          <td class="account"><a href="https://testardor.xcubicle.com/index.html?chain=IGNIS&account=${account}" target="_BLANK">${account}</a></td>
        `;
      });

      document.querySelector('.pledges').innerHTML =
        ` <table style="width:100%">
          <thead>
            <tr>
              <th data-index="0">Date</th>
              <th data-index="1">Amount</th>
              <th data-index="2">URL</th>
              <th data-index="3">Account</th>
            </tr>
          </thead>
          <tbody class="pledge-list">
            ${html.map((content, index) => `<tr class="pledge pledge--${index}">${content}</tr>`).join('')} 
          </tbody> 
        </table>
      `;

      const $th = document.querySelectorAll('.pledge thead th');
      for (let th of $th) {
        th.addEventListener('click', () => {
          const index = th.getAttribute('data-index');
          sortTable(document.querySelector('.pledge table'), index);
        });
      }
    }
    removeLoader();
  } 

  function loader() {
    const loader = document.createElement('div');
    loader.setAttribute('class', 'loading');
    loader.setAttribute('style', 'display:block;width: 100%; text-align:center;margin-top:150px;')
    loader.innerHTML = `<h1>Loading</h1><svg id="load" x="0px" y="0px" viewBox="0 0 150 150"><circle id="loading-inner" cx="75" cy="75" r="60"></circle></svg>`;

    return loader;
  }

  function removeLoader() {
    document.querySelector('.loading') ? document.querySelector('.loading').remove() : '';
  }
}
