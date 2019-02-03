import * as DividerUtils from "/DividerUtils.js"

function createContextMenus() {
	//'Compress to' for context menu
	chrome.contextMenus.create({
		"id": "menu_page",
		"title": "Compress to",
		"contexts": ["page", "frame", "selection", "page_action"]
	})

	var compress = (info, tab) => DividerUtils.compress(info.menuItemId.split("_")[2], tab.id);

	//Create context menus for each divider under dividers
	chrome.storage.local.get("dividers", items => {
		//Iterate through stored divider names
		items.dividers.forEach(element => {
			//Create the context menu shown when right-clicking on a page
			chrome.contextMenus.create({
				"parentId": "menu_page",
				"id": "menu_page_" + element,
				"title": element,
				"onclick": compress
			})

			//Create the context menu shown when right-clicking the icon on the toolbar
			chrome.contextMenus.create({
				"id": "menu_icon_" + element,
				"title": "Compress to " + element,
				"contexts": ["browser_action"],
				"onclick": compress
			})
		})
	})
}

function onMessage(message, sender, sendResponse) {
	switch(message.event) {
		case "dividerRename": case "dividerRemove": case "dividerAdd": case "dividerReorder":
			chrome.contextMenus.removeAll(() => createContextMenus())
			break
		default:
			break
	}
}

//Disable this functionality including right-click in divider if option disabled
function bypassIFrameHeaders() {
	chrome.webRequest.onHeadersReceived.addListener(
		details => {
			var toRemove = ["content-security-policy", "x-frame-options"]

			var filteredHeaders = details.responseHeaders.filter(item => {
				return !toRemove.includes(item.name.toLowerCase())
			})

			var newDetails = {
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