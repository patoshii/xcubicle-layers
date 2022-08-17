const ContentUtils = ((_) => {
  // Clean this util obj later
  const utils = {};

  utils.createFloatButton = function (node) {
    const shadowContainer = document.createElement("div");
    shadowContainer.id = "xc-dialog";
    const shadowRoot = shadowContainer.attachShadow({ mode: "open" });
    const bgImageLocation = chrome.runtime.getURL("/images/bg_xclayers.png");
    const style = `
		<style>
			* { 
				font-size: 16px;
				box-sizing: border-box;
			} 

			style {
				display: none;
			}

			.xc {
				background: url(${bgImageLocation}) #eee8d8 no-repeat;
				background-size: 200px;
				position: fixed;
				right: 1vw; 
				width: 300px;
				height: 100px;
				font-size: 16px;
				background-color: #eeeeee;
				z-index: 999999; 
				display: flex;
				flex-direction: column;
				justify-content: center;
				align-items: center;
				transition: top 500ms cubic-bezier(0.005, 0.465, 0.730, 0.900);
			}

			.xc.show {
				top: -11.5vh; 
				background: hotpink;
			}
			.xc.show:hover {
			        top:0;
			}
			
			.xc__btn { 
				display: inline-block;
				padding: 13px 50px;
				margin-bottom: 5px;
				border: 0;
				border-radius: 10px;
				background-color: #f00;
				color: #fff;
				text-transform: uppercase;
				outline: none;
				cursor: pointer;
			} 
			
			.xc__btn:hover {
				background-color: #da0000;
			}
			
			.xc__close {
				color: #000;
				text-decoration: none;
				cursor: pointer;
			}
		</style>
	`;

    shadowRoot.innerHTML = ` 
		${style}
		<div class="xc">
			<button class="xc__btn">Make a Bounty</button>
			<div class="xc__close">Hide</div>
		</div>
	`;

    const content = shadowRoot.querySelector(".xc");

    setTimeout(() => {
      content.classList.add("show");
    }, 500);

    shadowRoot.querySelector(".xc__btn").addEventListener("click", async () => {
      const currentURL = location.origin + location.pathname;
      const urlHashed = await hashUrl(currentURL);
      const templatePath = chrome.runtime.getURL("/html/pledgeContainer.html");
      chrome.runtime.sendMessage({
        action: "createWindow",
        url: `${templatePath}?url=${currentURL}&node=${node}&hash=${urlHashed}`,
      });
    });

    shadowRoot
      .querySelector(".xc__close")
      .addEventListener("click", (event) => {
        content.classList.remove("show");
        const parent = event.currentTarget.parentElement;
        setTimeout(() => {
          parent.remove();
        }, 500);
      });

    return shadowContainer;
  };

  utils.createNoteToggleButton = function () {
    const shadowContainer = document.createElement("div");
    shadowContainer.id = "xc-note-dialog";
    const shadowRoot = shadowContainer.attachShadow({ mode: "open" });
    const bgImageLocation = chrome.runtime.getURL("/images/bg_xclayers.png");
    const style = `
		<style>
			* { 
				font-size: 16px;
				box-sizing: border-box;
			} 

			style {
				display: none;
			}

			.xc {
				background: url(${bgImageLocation}) #eee8d8 no-repeat;
				background-size: 200px;
				position: fixed;
				right: 1vw; 
				width: 300px;
				min-height: 100px;
				font-size: 16px;
				background-color: #eeeeee;
				z-index: 999999; 
				
				display: flex;
				flex-direction: column;
				justify-content: center;
				align-items: center;

				top: -100px;
				transition: top 500ms cubic-bezier(0.005, 0.465, 0.730, 0.900);
			}

			.xc.show {
				top: 1vh; 
			}
			
			.xc__btn { 
				display: inline-block;
				padding: 13px 50px;
				margin-top: 5px;
				margin-bottom: 5px;
				border: 0;
				border-radius: 10px;
				background-color: #f00;
				color: #fff;
				text-transform: uppercase;
				outline: none;
				cursor: pointer;
			} 
			
			.xc__btn:hover {
				background-color: #da0000;
			}

			.xc__msg {
				display: none;
			}

			.xc__msg ul {
				list-style: none;
				margin: 0;
				padding: 0;
			}

			.xc__msg li {
				padding: .75rem;

				display: flex;
				flex-direction: column;
				width: 100%;
			}

			.xc__msg ul strong {
				display: inline-block;
			}

			.xc__msg ul p {
				margin-bottom: 0;
			}

			.xc__msg ul i {
				font-size: 14px;
			}

			.xc__close {
				color: #000;
				text-decoration: none;
				cursor: pointer;
				margin: 1rem 0;
			}	
		</style>
	`;

    shadowRoot.innerHTML = ` 
		${style}
		<div class="xc">
			<button class="xc__btn">Open my Notes</button>
			<div class="xc__msg"></div>	
			<div class="xc__close">Hide Note</div>
		</div>
	`;

    const content = shadowRoot.querySelector(".xc");

    setTimeout(() => {
      content.classList.add("show");
    }, 500);

    chrome.runtime.onMessage.addListener(function (
      { pageUpdate, payload },
      _sender,
      _sendResponse
    ) {

      if (pageUpdate === "note-found") {
        shadowRoot.querySelector(".xc__msg").style.display = "block";

        if (Array.isArray(payload.publicNotes) && payload.publicNotes.length) {
          const notes = payload.publicNotes;
          const noteContainer = document.createElement("ul");
          noteContainer.classList.add("xc__public_note");

          for (let n of notes) {
            const li = document.createElement("li");
      
						const sender = document.createElement('strong');
						sender.textContent = n.sender;

						const time = document.createElement('i');
						time.textContent = getTimeByTimezone(n.time, moment.tz.guess(), "Mainnet")

						const note = document.createElement('p');
						note.textContent = n.note;

						li.appendChild(sender);
						li.appendChild(time);
						li.appendChild(note);

            noteContainer.appendChild(li);
          }

          shadowRoot.querySelector(".xc__msg").appendChild(noteContainer);
        }
      }
    });

    shadowRoot.querySelector(".xc__btn").addEventListener("click", () => {
      const templatePath = chrome.runtime.getURL("/html/notes.html");
      chrome.runtime.sendMessage({
        action: "createWindow",
        url: templatePath,
      });
    });

		// dupe
		shadowRoot
		.querySelector(".xc__close")
		.addEventListener("click", (event) => {
			content.classList.remove("show");
			const parent = event.currentTarget.parentElement;
			parent.remove();
		});

    return shadowContainer;
  };

  return utils;
})();
