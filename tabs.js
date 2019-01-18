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

function init() {
	createContextMenus()

	//Recreate context menu everytime dividers is changed
	chrome.storage.onChanged.addListener((changes, areaName) => {
		if(changes.hasOwnProperty("dividers"))
			chrome.contextMenus.removeAll(() => createContextMenus())
	})
}

//init()

//DEBUG START
var reset = true

if(reset) {
	chrome.storage.local.clear()

	fetch(chrome.runtime.getURL("Example.json")).then(response => response.json()).then(json => {
		chrome.storage.local.set(json)

		chrome.storage.local.get(null, items => {
			console.log(items)
			init()
		})
	})
} else {
	chrome.storage.local.get(null, items => {
		console.log(items)
		init()
	})
}
//DEBUG END