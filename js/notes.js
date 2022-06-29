'use strict'; 
const MASTER_ARDOR_ACCOUNT = "COIN-XXXX-XXXX-5496-B3YAC";

let secondaryPass = 'disable';
let nodeType = 'Testnet';
let CUSTOM_BLOCK_TIMESTAMP = moment().unix();
let TIMEZONE = moment.tz.guess() || 'America/New_York';

let node = '';

document.addEventListener('DOMContentLoaded', function () {
  chrome.storage.local.get(['source', 'activeNode', 'currentUrlHashed', 'globalUrlHashed', 'currentPrivateUrlHashed', 'globalPrivateUrlHashed', 'blocktimestamp', 'timezone'], async function (result) {
    if (result.source == null) {
      result.source = 'https://www.google.com';
    }

    if (result['blocktimestamp']) CUSTOM_BLOCK_TIMESTAMP = result['blocktimestamp'];

    if (result['timezone']) TIMEZONE = result['timezone'];

    node = result.activeNode;

    const obj = {
      "source": result.source,
      "node": result.activeNode,
      "currentPrivateUrlHashed": result.currentPrivateUrlHashed,
      "globalPrivateUrlHashed": result.globalPrivateUrlHashed,
      "currentUrlHashed": result.currentUrlHashed,
      "globalUrlHashed": result.globalUrlHashed
    };

    try {
      nodeType = await getNodeType(result.activeNode);
    } catch (error) {
      console.log("Aeris Error: ", error);
    }

    init(obj);

    document.addEventListener('click', async (event) => {
      if (event.target.className.split(' ').includes('decrypt-btn')) {
        const noteEl = event.target.closest('tr').querySelector('.note span'),
          note = event.target.getAttribute('data-note');
        try {
          const text = note.replace(' ', '');
          let decryptedText = await aesGcmDecrypt(text, localStorage.getItem('btcpri'));
          decryptedText = attemptJSONParse(decryptedText);
          decryptedText = (typeof decryptedText === 'object') ? decryptedText.note : decryptedText;
          // Decode spaces, but it will not work if there's malformed URI in it like % sign,
          // So I am putting this in a try/catch block
          try {
            decryptedText = decodeURIComponent(decryptedText);
          } catch (e) {
            console.log('weird text', e);
          }
          noteEl.innerHTML = snarkdown(escapeHTML(decryptedText)).replace(/(\r\n|\n|\r)/gm, "<br>");
          event.target.style.display = 'none';
        } catch (error) {
          console.log(error);
        }
      }
      if (event.target.className.split(' ').includes('decipher-btn')) {
        const noteEl = event.target.closest('tr').querySelector('.note span');
        let text = noteEl.innerHTML;
        const decipherCode = prompt("Please enter your code");
        if (decipherCode != null) {
          text = text.replace(/<br>/g, "\n");
          const d = vigenereCipher(text, decipherCode, true);
          noteEl.innerHTML = d.replace(/(\r\n|\n|\r)/gm, "<br>");
        }
      }
      if (event.target.className.split(' ').includes('delete')) {
        const index = event.target.getAttribute('data-index');
        if (!index) return;

        chrome.storage.local.get([index], function (result) {
          if (result[index] && result[index].length > 0) {
            result[index].splice(index, 1);
            chrome.storage.local.set(result);
            event.target.closest('tr').style.display = 'none';
          }
        });
      }
    });

    document.getElementById('new-url-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const url = document.getElementById('url').value;
      if (url.length === 0) return;
      const node = document.getElementById('node').value,
        currentUrlHashed = await hashUrl(url),
        globalUrlHashed = await hashUrl(getUrlHostName(url)),
        currentPrivateUrlHashed = await hashUrl(getLocalStorage('nxtpass') + url),
        globalPrivateUrlHashed = await hashUrl(getLocalStorage('nxtpass') + getUrlHostName(url));;

      const obj = {
        "source": url,
        "node": node,
        "currentUrlHashed": currentUrlHashed,
        "globalUrlHashed": globalUrlHashed,
        "currentPrivateUrlHashed": currentPrivateUrlHashed,
        "globalPrivateUrlHashed": globalPrivateUrlHashed,
      };
      document.querySelector('#private-note-list tbody').innerHTML = '';
      document.querySelector('#public-note-list tbody').innerHTML = '';
      init(obj);
    });

    document.getElementById('toggle-global-note').addEventListener('click', function (event) {
      const label = this.textContent.split(' ')[0].toLowerCase();
      toggleGlobalNotes(label);
      this.textContent = (label === 'hide') ? 'Show Sitewide Notes' : 'Hide Sitewide Notes';
    }); //toggle global note

    document.getElementById('decrypt-all').addEventListener('click', async () => {
      const $decryptBtn = document.querySelectorAll('.decrypt-btn');
      for (const btn of $decryptBtn) {
        const noteEl = btn.closest('tr').querySelector('.note span'),
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
        } catch (error) {
          console.log(error);
        }
      }
    }); //decrypt all

    document.getElementById('self-note').addEventListener('click', (event) => {
      const $publicList = document.querySelectorAll('#public-note-list tbody tr');
      for (const list of $publicList) {
        const address = list.querySelector('td.address span').textContent,
          currentAddress = localStorage.getItem('nxtaddr');
        if (address !== currentAddress) list.style.display = 'none';
      }
    }); //self-note

    const $pubTH = document.querySelectorAll('#public-note-list thead th');
    for (let th of $pubTH) {
      th.addEventListener('click', () => {
        const index = th.getAttribute('data-index');
        sortTable(document.querySelector('#public-note-list table'), index);
      });
    }
    const $priTH = document.querySelectorAll('#private-note-list thead th');
    for (let th of $priTH) {
      th.addEventListener('click', () => {
        const index = th.getAttribute('data-index');
        sortTable(document.querySelector('#private-note-list table'), index);
      });
    }
  });

}); //DOMContentLoaded

function init(obj) {
  const
    source = obj.source,
    node = obj.node,
    currentUrlHashed = obj.currentUrlHashed,
    globalUrlHashed = obj.globalUrlHashed,
    currentPrivateUrlHashed = obj.currentPrivateUrlHashed,
    globalPrivateUrlHashed = obj.globalPrivateUrlHashed;

  printLocalNotes(currentUrlHashed, globalUrlHashed);
  // need to clean this
  if (currentUrlHashed === globalUrlHashed) {
    printPublicNotes(node, globalUrlHashed);
    printPrivateNotes(node, globalPrivateUrlHashed);
  } else {
    printPublicNotes(node, currentUrlHashed);
    printPublicNotes(node, globalUrlHashed);

    printPrivateNotes(node, currentPrivateUrlHashed);
    printPrivateNotes(node, globalPrivateUrlHashed); 

    if(source.includes('gofundme')) { 
      const urlObj = new URL(source);
      const path = urlObj.pathname.split('/').pop();
      const oldURL = `${urlObj.origin}/${path}`; 

      hashUrl(oldURL).then(result => {
        const hash = result.replace(/[^a-z0-9]/gi, '_'); 
        printPublicNotes(node, hash);
        printPrivateNotes(node, hash);  
      })

    }
  }

  document.getElementById('node').value = node;
  document.getElementById('source').value = source;
  document.getElementById('global-url').value = globalUrlHashed;
  document.getElementById('source-url').value = currentUrlHashed;
}

async function printPublicNotes(node, query) {
  const searchQueryRequest = `${node}/nxt?requestType=searchTaggedData&chain=ignis&tag=note&query=${query}`;

  let notes = [];

  try {
    const queryResponse = await getRequest(searchQueryRequest);

    for (let i = 0; i < queryResponse.data.length; i++) {
      const data = queryResponse.data[i];
      if (transactionIsOlderThanSetTime(nodeType, CUSTOM_BLOCK_TIMESTAMP, data.blockTimestamp)) {
        if (data) {
          const noteRequest = MainBlockchain.requestUrl(node, 'getTaggedData', {chain: "ignis", ...data}),
            noteResponse = await getRequest(noteRequest),
            tags = noteResponse.tags.replace(/\s/g, '').split(',');

          if (noteResponse.isText && noteResponse.type == 'text/plain' && !tags.includes('encrypted')) {
            let note = snarkdown(escapeHTML(noteResponse.data)),
              sitewideClass = '',
              sitewideLabel = '';
            if (data.tags.includes('sitewide')) {
              sitewideClass = 'global';
              sitewideLabel = ' <span>*Sitewide Note</span>';
            }
            const account = noteResponse.accountRS,
              time = getTimeByTimezone(noteResponse.transactionTimestamp, TIMEZONE, nodeType);


              const pledgeNote = data.tags.includes('pledge-note');
              const sender = data.accountRS;

            notes.push({ note, sitewideClass, time, account, sitewideLabel, pledgeNote, sender });
          }
        }
      }
    }
  } catch (error) {
    console.log(error);
  }
  handlePublicNotes(notes);
} //func printPublicNotes

async function handlePublicNotes(notes) {
  if (document.querySelector('.loading-container')) document.querySelector('.loading-container').remove();
  if (notes.length == 0) return;
  const $table = document.querySelector('#public-note-list tbody');
  notes.sort(sortObjectByValue('time', 'desc'));
  for (let n of notes) {
    let { note, sitewideClass, time, account, sitewideLabel, pledgeNote, sender } = n;

    note = await noteTemplate(note, sender, MASTER_ARDOR_ACCOUNT, node); 
    
    if(pledgeNote) {
      try { 
        const noteJson = JSON.parse(n.note)
        account = noteJson.account;
      } catch (error) { 
        console.log(error)
      }
    }

    const tr = `
          <tr class="${sitewideClass}${pledgeNote ? ' pledge-note':''}">
            <td class="address"><h4>${time}</h4><span class="pictogram" data-value="${account}"></span><span>${account}</span></td>
            <td class="note">${sitewideLabel}<span>${note}</span></td>
          </tr>
        `;
    $table.innerHTML += tr;
  }

  const $pictos = document.querySelectorAll('.pictogram');
  for (let picto of $pictos) {
    new Pictogrify(picto.getAttribute('data-value'), 'monsters').render(picto)
  }
} 

async function noteTemplate(note, sender, masterAccount, ardorNode) { 
  const formattedNote = await cleanUpNote(note, sender, masterAccount, ardorNode); 
  
  if(typeof formattedNote !== 'object') return note.replace(/(\r\n|\n|\r)/gm, "<br>"); 

  const { coinLabel, acctInfo, formatted, time, message } = formattedNote;

  return `<div><div class="account-container">${acctInfo}</div>
  <div class="pledge-amount"><strong>${+formatted} ${coinLabel.toUpperCase()}</strong><span class="date" style="opacity: 0.5"> &#8226; ${time}</span></div>
</div>${message  && `<div class='note' style="opacity: 0.7;clear:left;"><em>${message}</em></div>`}`

}

async function printPrivateNotes(node, query) {
  const account = localStorage.getItem('nxtaddr');
  const searchQueryRequest = `${node}/nxt?requestType=searchTaggedData&chain=ignis&query=${query}&tag=note%2Cencrypted&account=${account}`;
  const queryResponse = await getRequest(searchQueryRequest);

  let notes = [];

  try {
    for (let i = 0; i < queryResponse.data.length; i++) {
      const data = queryResponse.data[i];
      if (transactionIsOlderThanSetTime(nodeType, CUSTOM_BLOCK_TIMESTAMP, data.blockTimestamp)) {
        const noteRequest = MainBlockchain.requestUrl(GLOBAL['node'], 'getTaggedData', {chain: "ignis", ...data}),
          noteResponse = await getRequest(noteRequest),
          tags = noteResponse.tags.replace(/\s/g, '').split(',');

        if (noteResponse.isText && noteResponse.type == 'text/plain') {
          let sitewideClass = '',
            sitewideLabel = '';
          if (tags.includes('sitewide')) {
            sitewideClass = 'global';
            sitewideLabel = ' <span>*Sitewide Note</span>';
          }
          const decryptBtn = `<button class='btn decrypt-btn' data-note='${noteResponse.data}'>Decrypt</button>`;
          const decipherBtn = `<button class='btn decipher-btn'>Decipher</button>`;
          const time = getTimeByTimezone(noteResponse.transactionTimestamp, TIMEZONE, nodeType);

          notes.push({ sitewideClass, time, decryptBtn, decipherBtn, sitewideLabel });
        }
      }
    }
  } catch (err) {
    console.log(err);
  }
  handlePrivateNotes(notes);
} //func printPrivateNotes

function handlePrivateNotes(notes) {
  if (notes.length == 0) return;
  const $table = document.querySelector('#private-note-list tbody');
  notes.sort(sortObjectByValue('time', 'desc'));
  for (let n of notes) {
    const { sitewideClass, time, decryptBtn, decipherBtn, sitewideLabel } = n;
    const tr = `
            <tr class="${sitewideClass}">
              <td class="date">${time}</td>
              <td class="note"><span>Encrypted Note</span>${decryptBtn}${decipherBtn}${sitewideLabel}</td>
            </tr>
          `;
    $table.innerHTML += tr;
  }
}

async function printLocalNotes(key, sitewide_key) {
  // const $ul = document.querySelector('#private-note-list ul');
  const $table = document.querySelector('#private-note-list tbody');

  const localNoteClass = 'local';

  chrome.storage.local.get([key, sitewide_key], function (result) {
    for (let index in result) {
      if (result.hasOwnProperty(index)) {
        let sitewideClass = '',
          sitewideLabel = '';
        if (index == sitewide_key) {
          sitewideClass = 'global';
          sitewideLabel = ' <span>*Sitewide Note</span>';
        }
        for (const [i, value] of result[index].entries()) {
          if (value.split(';')[3] !== localStorage.getItem('nxtaddr')) continue;
          // decreypt button are always present because we are not allowing un-encrypt notes to save locally.
          const account = localStorage.getItem('nxtaddr'),
            note = escapeHTML(value.split(';')[0]),
            time = value.split(';')[1],
            decryptBtn = `<button class='btn decrypt-btn' data-note='${note}'>Decrypt</button>`,
            decipherBtn = `<button class='btn decipher-btn'>Decipher</button>`;

          const tr = `
            <tr class="${sitewideClass} ${localNoteClass}">
              <td class="date">${time}</td>
              <td class="note"><span>Encrypted Note</span>${decryptBtn}${decipherBtn}${sitewideLabel}</td>
            </tr>
          `;
          $table.innerHTML += tr;
        }
      }
    }
    loadPictogrify("#private-note-list .pictogram");
  });
} //func printLocalNotes

function loadPictogrify(s) {
  const $pictos = document.querySelectorAll(s);
  if (!$pictos.length) return;

  for (let picto of $pictos) {
    new Pictogrify(picto.getAttribute('data-value'), 'monsters').render(picto)
  }
}
