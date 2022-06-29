let secondaryPass = 'disable';
let CUSTOM_BLOCK_TIMESTAMP = moment().unix();
let TIMEZONE = moment.tz.guess() || 'America/New_York';
let GLOBAL = {
  node: 'https://testardor.xcubicle.com'
};

document.addEventListener('DOMContentLoaded', function () {
  const account = localStorage.getItem('nxtaddr');

  chrome.storage.local.get(['activeNode', 'isTestnet', 'customPower', 'secondaryPass', 'blocktimestamp', 'timezone'], function (result) {
    if (result['activeNode'] != undefined) {
      GLOBAL['node'] = result['activeNode']
    }
    document.querySelector('.container h2 sup').textContent = ` (${result['isTestnet'] ? 'Testnet' : 'Mainnet'})`; 

    if (result['blocktimestamp']) CUSTOM_BLOCK_TIMESTAMP = result['blocktimestamp'];
    if (result['timezone']) TIMEZONE = result['timezone'];

    if (account != null) {
      privateNotes(account);
    } else {
      alert('Account not detected. Did you login?');
    }

    document.querySelector('.loading-container h1').innerHTML = `Trouble loading?<br/>See if your node is working: <a href="${GLOBAL['node']}/index.html?chain=IGNIS&account=${account}" target="_blank">${GLOBAL['node']}</a>`;

  });

  chrome.storage.local.get('secondaryPass', res => {
    if (res['secondaryPass']) secondaryPass = res['secondaryPass'];
  });

  document.addEventListener('click', async (event) => {
    if (event.target.className.split(' ').includes('decrypt-btn')) {
      const noteEl = event.target.closest('tr').querySelector('.note'),
        note = event.target.getAttribute('data-note');
      try {
        const text = note.replace(' ', '');
        let decryptedText = await aesGcmDecrypt(text, localStorage.getItem('btcpri'));
        decryptedText = attemptJSONParse(decryptedText);
        decryptedText = (typeof decryptedText === 'object') ? decryptedText.note : decryptedText;
        try {
          decryptedText = decodeURIComponent(decryptedText);
        } catch (e) { }
        noteEl.innerHTML = snarkdown(escapeHTML(decryptedText)).replace(/(\r\n|\n|\r)/gm, "<br>");
        event.target.style.display = 'none';
      } catch (e) {
        console.log('weird text', e);
      }
    }
    if (event.target.className.split(' ').includes('decipher-btn')) {
      const noteEl = event.target.closest('tr').querySelector('.note');
      let text = noteEl.innerHTML;
      const decipherCode = prompt("**Enter secondary password to decipher text:");
      if (decipherCode != null) {
        text = text.replace(/<br>/g, "\n");
        const d = vigenereCipher(text, decipherCode, true);
        noteEl.innerHTML = d.replace(/(\r\n|\n|\r)/gm, "<br>");
      }
    }
  });

  document.getElementById('decrypt-all').addEventListener('click', async () => {
    const $decryptBtn = document.querySelectorAll('.decrypt-btn');
    for (const btn of $decryptBtn) {
      const noteEl = btn.closest('tr').querySelector('.note'),
        note = btn.getAttribute('data-note');
      try {
        const text = note.replace(' ', '');
        let decryptedText = await aesGcmDecrypt(text, localStorage.getItem('btcpri'));
        decryptedText = attemptJSONParse(decryptedText);
        decryptedText = (typeof decryptedText === 'object') ? decryptedText.note : decryptedText;

        try {
          decryptedText = decodeURIComponent(decryptedText);
        } catch (e) {
          console.log('weird text', e);
        }

        noteEl.innerHTML = snarkdown(escapeHTML(decryptedText)).replace(/(\r\n|\n|\r)/gm, "<br>");
        btn.style.display = 'none';
      } catch (e) {
        console.log(e);
      }
    }
  }); //decrypt all

  const $th = document.querySelectorAll('#private-table-container thead th');
  for (let th of $th) {
    th.addEventListener('click', () => {
      const index = th.getAttribute('data-index');
      sortTable(document.querySelector('#private-table-container table'), index);
    });
  }

});

async function privateNotes(account) { 
  let notes = [];

  try {
    const request = MainBlockchain.requestUrl(GLOBAL['node'],'searchTaggedData', {chain:"ignis",tag:"note,encrypted",account})
    const noteObj = await getRequest(request);
    let nodeType = await getNodeType(GLOBAL['node'])
    for (const data of noteObj.data) {
      if (transactionIsOlderThanSetTime(nodeType, CUSTOM_BLOCK_TIMESTAMP, data.blockTimestamp)) {
        if (data.tags == 'note,encrypted' || data.tags == 'note,sitewide,encrypted') {
          const noteRequest = MainBlockchain.requestUrl(GLOBAL['node'], 'getTaggedData', {chain: "ignis", ...data});
          const noteResponse = await getRequest(noteRequest);
          const timestamp = noteResponse.transactionTimestamp;
          const noteData = noteResponse.data;
          let decryptedObject = await aesGcmDecrypt(decodeURIComponent(noteData), localStorage.getItem('btcpri'));
          decryptedObject = attemptJSONParse(decryptedObject);
          if (typeof decryptedObject === 'object' && decryptedObject.note && decryptedObject.url) {
            const decryptBtn = `<button class="btn decrypt-btn" data-note="${noteResponse.data}">Decrypt</button>`;
            const decipherBtn = `<button class='btn decipher-btn ${secondaryPass}'>Decipher</button>`;
            const time = getTimeByTimezone(noteResponse.transactionTimestamp, TIMEZONE, nodeType);
            const url = decryptedObject.url;

            notes.push({ time, url, decryptBtn, decipherBtn })
          }
        }
      }
    }
  } catch (err) {
    console.log(err);
  }
  handlePrivateNotes(notes);
}

function handlePrivateNotes(notes) {
  if (document.querySelector('.loading-container')) document.querySelector('.loading-container').remove();
  const $table = document.querySelector('#private-table-container tbody')
  let rows = '';
  if (notes.length) {
    notes.sort(sortObjectByValue('time', 'desc'));
    for (let n of notes) {
      const { time, url, decryptBtn, decipherBtn } = n;
      const row = ` <tr>
        		<td class="date">${time}</td>
        		<td class="url"><div><img style="background: #fff;border:3px solid #fff;position:absolute;height:60px;opacity:.08" src="http://identicon.org?s=19&t=${url}"/><a href="${url}" target="_Blank">${url}</a></div></td>
        		<td class="note">Encrypted Note</td>
        		<td class="action">${decryptBtn}${decipherBtn}</td>
        	</tr>
        `;
      rows += row;
    }
  } else {
    rows = `<tr><td colspan="4" style="font-size: calc(1vw + 1vh + .5vmin); padding: 2vw; text-align: center; color: #000;">No Notes Associated to this Account</td></tr>`;
  }
  $table.innerHTML = rows;
}
