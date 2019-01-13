function compress(info, tab) {
	var dividerName = info.menuItemId.split("_")[2]
	console.log("Compressing \"" + tab.title + "\" to " + dividerName)
}

function addContext(dividerName) {
	chrome.contextMenus.create({
		"parentId": "menu_page",
		"id": "menu_page_" + dividerName,
		"title": dividerName,
		"onclick": compress
	})

	chrome.contextMenus.create({
		"id": "menu_icon_" + dividerName,
		"title": "Compress to " + dividerName,
		"contexts": ["browser_action"],
		"onclick": compress
	})
}

chrome.contextMenus.create({
	"id": "menu_page",
	"title": "Compress to",
	"contexts": ["page", "frame", "selection", "page_action"]
})

addContext("New")
addContext("YouTube")