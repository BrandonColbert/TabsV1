var openDividers = {}

function send(dividerName, message) {
	if(dividerName in openDividers) {
		var openDivider = openDividers[dividerName]

		if(openDivider.loaded) {
			chrome.tabs.sendMessage(openDivider.id, message)
		} else {
			chrome.tabs.onUpdated.addListener(
				function apply(tabId, changeInfo, updatedTab) {
					if(tabId == openDivider.id && changeInfo.status == "complete") {
						chrome.tabs.onUpdated.removeListener(apply)
						openDividers[dividerName].loaded = true

						chrome.tabs.sendMessage(tabId, message)
					}
				}
			)
		}
	}
}

function compress(info, tab) {
	var dividerName = info.menuItemId.split("_")[2]

	console.log("Compressing \"" + tab.title + "\" to " + dividerName)

	//Remove the current tab
	chrome.tabs.remove(tab.id)

	//Create if not already
	if(!(dividerName in openDividers)) {
		//Register the divider
		openDividers[dividerName] = {
			"id": 0,
			"loaded": false,
			"open": false
		}

		//Create the divider tab
		chrome.tabs.create(
			{
				"url": "dividers/divider.html",
				"active": false
			},
			function(tab) {
				openDividers[dividerName].id = tab.id
			}
		)
	}

	send(dividerName, {
		"command": "apply",
		"name": dividerName
	})

	send(dividerName, {
		"command": "append",
		"title": tab.title,
		"url": tab.url
	})
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

//addContext("New")
addContext("YouTube")

