const ContentUtils = (_ => {
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
				all: initial;
				font-size: 16px;
				box-sizing: border-box;
			} 

			style {
				display: none;
			}

			.xc {
				position: fixed;
				right: 5px; 
				width: 300px;
				height: 100px;
				font-size: 16px;
				z-index: 999999; 
				display: flex;
				flex-direction: column;
				justify-content: center;
				align-items: center;
				top: -100px;
			}

			.xc.show {
				top: 5px; 
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
			<button class="xc__btn">Make a Pledge</button>
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
	
	utils.createNoteToggleButton = function() { 
		const shadowContainer = document.createElement("div");
    shadowContainer.id = "xc-dialog";
    const shadowRoot = shadowContainer.attachShadow({ mode: "open" });
    const bgImageLocation = chrome.runtime.getURL("/images/bg_xclayers.png");
    const style = `
		<style>
			* { 
				all: initial;
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

				top: -100px;
				transition: top 500ms cubic-bezier(0.005, 0.465, 0.730, 0.900);
			}

			.xc.show {
				top: 1vh; 
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
			
		</style>
	`;

    shadowRoot.innerHTML = ` 
		${style}
		<div class="xc">
			<button class="xc__btn">Open my Notes</button>
		</div>
	`;

    const content = shadowRoot.querySelector(".xc");

    setTimeout(() => {
      content.classList.add("show");
    }, 500);

    shadowRoot.querySelector(".xc__btn").addEventListener("click", () => {
			 const templatePath = chrome.runtime.getURL("/html/notes.html");
			 chrome.runtime.sendMessage({
				 action: "createWindow",
				 url: templatePath,
			 });
		}); 
		
    return shadowContainer;	
	}

  return utils;
})();
