//DEBUG START
var reset = false

if(reset) {
	chrome.storage.local.clear()

	fetch(chrome.runtime.getURL("Example.json")).then(response => response.json()).then(json => {
		chrome.storage.local.set(json)

		chrome.storage.local.get(null, items => {
			console.log(items)
		})
	})
} else {
	chrome.storage.local.get(null, items => {
		console.log(items)
	})
}
//DEBUG END

function compress(info, tab) {
	var divider = info.menuItemId.split("_")[2]

	//Remove the current tab
	chrome.tabs.remove(tab.id)

	//Get the path for the divider
	var dividerPagePath = "dividers." + divider + ".pages"

	chrome.storage.local.get(dividerPagePath, items => {
		var pages = items[dividerPagePath]

		//Add the page to the array
		pages.push({
			"title": tab.title,
			"url": tab.url,
			"time": new Date().getTime()
		})

		//Update storage accordingly
		chrome.storage.local.set({[dividerPagePath]: pages})
	})
}

//'Compress to' for context menu
chrome.contextMenus.create({
	"id": "menu_page",
	"title": "Compress to",
	"contexts": ["page", "frame", "selection", "page_action"]
})

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