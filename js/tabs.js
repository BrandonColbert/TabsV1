import DividerUtils from "/js/classes/dividerutils.js"

function createContextMenus() {
	//Compress to closest divider left of tab
	chrome.contextMenus.create({
		"id": "menu_page",
		"title": "Compress",
		"contexts": ["page", "frame", "selection", "page_action"],
		"onclick": (info, tab) => {
			//Get all the tabs in the window
			chrome.tabs.getAllInWindow(null, tabs => {
				//Iterate through all the tabs between 0 and the current tab from left to right
				for(let i = tab.index - 1; i >= 0; i--) {
					let foundTab = tabs[i]

					//If the tab is a divider, compress to it and stop
					if(foundTab.url.startsWith("chrome-extension://" + chrome.runtime.id + "/divider")) {
						DividerUtils.compress(decodeURIComponent(foundTab.url.substring(foundTab.url.indexOf('#') + 1)), tab.id)
						break;
					}
				}
			})
		}
	})
}

function onMessage(message, sender, sendResponse) {
	switch(message.event) {
		default:
			break
	}
}

//Disable this functionality including right-click in divider if option disabled
function bypassIFrameHeaders() {
	chrome.webRequest.onHeadersReceived.addListener(
		details => {
			let toRemove = ["content-security-policy", "x-frame-options"]

			let filteredHeaders = details.responseHeaders.filter(item => !toRemove.includes(item.name.toLowerCase()))

			let newDetails = {
				responseHeaders: filteredHeaders
			}

			return newDetails;
		},
		{
			urls: ["<all_urls>"]
		},
		[
			"blocking",
			"responseHeaders"
		]
	)
}

function init() {
	createContextMenus()
	bypassIFrameHeaders()

	DividerUtils.onMessageSelf(onMessage)
	chrome.runtime.onMessage.addListener(onMessage)
}

chrome.storage.local.get(null, items => {
	if(items["dividers"]) {
		init()
	} else {
		fetch(chrome.runtime.getURL("initial_config.json")).then(response => response.json()).then(json => {
			chrome.storage.local.set(json, () => init())
		})
	}
})

/*
chrome.storage.local.clear()

fetch(chrome.runtime.getURL("Example.json")).then(response => response.json()).then(json => {
	chrome.storage.local.set(json)

	chrome.storage.local.get(null, items => {
		console.log(items)
		init()
	})
})
*/