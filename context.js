function compress(info, tab) {
	var dividerName = info.menuItemId.split("_")[2]

	console.log("Compressing \"" + tab.title + "\" to " + dividerName)

	//Remove the current tab
	chrome.tabs.remove(
		tab.id,
		function() {
			//Create the divider for the tab to be held in using divider.html as a base
			chrome.tabs.create(
				{
					"url": "dividers/divider.html",
					"active": false
				},
				function(dividerTab) {
					//Wait for the created divider tab to finish loading
					chrome.tabs.onUpdated.addListener(
						function apply(tabId, changeInfo, updatedTab) {
							console.log("Sending for tab: " + dividerTab.id)

							if(tabId == dividerTab.id && changeInfo.status == "complete") {
								chrome.tabs.onUpdated.removeListener(apply)

								//Send the tab its name and and url
								chrome.tabs.sendMessage(
									dividerTab.id,
									{
										"name": dividerName,
										"command": "apply"
									}
								)
								chrome.tabs.sendMessage(
									dividerTab.id,
									{
										"name": dividerName,
										"command": "append",
										"title": tab.title,
										"url": tab.url
									}
								)
							}
						}
					)
				}
			)
		}
	)
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