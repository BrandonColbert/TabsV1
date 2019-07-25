var funcOnMessageSelf = null

export function onMessageSelf(func) {
	funcOnMessageSelf = func
}

function sendMessage(message) {
	if(funcOnMessageSelf)
		funcOnMessageSelf(message)

	chrome.runtime.sendMessage(message)
}

export function open(name, redirect) {
	var url = "divider.html#" + name

	if(redirect) {
		chrome.tabs.update({"url": url})
	} else {
		chrome.tabs.create({"url": url})
	}
}

/**
 * Evalutates what url should be derived and saved based on the website
 * @param tab Tab for the url
 * @return A promise yielding the url
 */
function evaluateURL(tab) {
	var url = tab.url

	if(/^https:\/\/www.youtube.com\/watch\?/.test(url)) { //Check if youtube and return url with current timestamp
		return new Promise((resolve, reject) => {
			const retrieveURL = (msg, sender) => {
				if(msg.event == "evaluateURL" && sender.url == url) {
					chrome.runtime.onMessage.removeListener(retrieveURL)

					if(msg != null && msg.url.length > 0)
						url = msg.url

					resolve(url)
				}
			}

			chrome.runtime.onMessage.addListener(retrieveURL);

			chrome.tabs.executeScript(tab.id, {
				code: `
					const sendURL = msg => {
						window.removeEventListener("message", sendURL)

						chrome.runtime.sendMessage({
							"event": "evaluateURL",
							"url": msg.data
						})
					}

					window.addEventListener("message", sendURL)

					if(document.readyState === "complete") { //Try getting the video with timestamp if page is loaded
						var script = document.createElement("script")
						var code = \`
							var player = document.getElementById("movie_player")
							var url = player != null ? player.getVideoUrl().replace(/t=.*&/, "t=" + Math.floor(player.getCurrentTime()) + "&") : null
							window.postMessage(url, "*")
						\`
						script.appendChild(document.createTextNode(code))
						document.querySelector("head").appendChild(script)
					} else {
						window.postMessage(document.URL, "*") //Just use URL otherwise
					}
				`
			}, () => {
				if(chrome.runtime.lastError) {
					chrome.runtime.onMessage.removeListener(retrieveURL)
					resolve(url)
				}
			})
		})
	} else {
		return new Promise((resolve, reject) => resolve(url))
	}
}

//Compress all objects into the divider that return true for their predicate involving the divider's current tab and the tab in question
export function compressAll(divider, predicate) {
	//Get the page path
	var dividerPagePath = getPagePath(divider)

	chrome.storage.local.get(dividerPagePath, items => { //Get the object for the page path
		chrome.tabs.getCurrent(dividerTab => { //Get the current tab
			chrome.tabs.query( //Get all the tabs in the same window
				{
					"currentWindow": true,
					"pinned": false
				},
				async tabs => {
					//Get the actual pages object
					var pages = items[dividerPagePath]
					var additionalPages = []

					for(var tab of tabs) {
						//Compress if index is to the right
						if(predicate(dividerTab, tab)) {
							var url = await evaluateURL(tab)

							//Remove the tab
							chrome.tabs.remove(tab.id)

							additionalPages.push({
								"title": tab.title.length == 0 ? "[Unknown]" : tab.title,
								"url": url,
								"time": new Date().getTime()
							})
						}
					}

					sendMessage({
						"event": "dividerBatchCompress",
						"divider": divider,
						"pages": additionalPages
					})

					//Update with new pages
					chrome.storage.local.set({[dividerPagePath]: pages.concat(additionalPages)})
				}
			)
		})
	})
}

export function compress(divider, tabId) {
	chrome.tabs.get(tabId, async tab => {
		//Get the path for the divider
		var dividerPagePath = getPagePath(divider)

		//Get the url
		var url = await evaluateURL(tab)

		//Remove the current tab
		chrome.tabs.remove(tab.id)

		chrome.storage.local.get(dividerPagePath, items => {
			var pages = items[dividerPagePath]

			var page = {
				"title": tab.title.length == 0 ? "[Unknown]" : tab.title,
				"url": url,
				"time": new Date().getTime()
			}

			//Add the page to the array
			pages.push(page)

			sendMessage({
				"event": "dividerCompress",
				"divider": divider,
				"page": page
			})

			//Update storage accordingly
			chrome.storage.local.set({[dividerPagePath]: pages})
		})
	})
}

//Expands each page at the index to the directly to the right of the divider tab in the corresponding order
export function expandAll(divider, orderedIndices) {
	sendMessage({
		"event": "dividerBatchExpand",
		"divider": divider,
		"orderedIndices": orderedIndices
	})

	var dividerPagePath = getPagePath(divider)

	chrome.storage.local.get(dividerPagePath, pageItems => {
		const oldPages = pageItems[dividerPagePath]
		const oldPagesLength = oldPages.length
		var pages = []

		chrome.tabs.getSelected(tab => orderedIndices.forEach(element => {
			//Open the tab at each specified index
			if(element < oldPagesLength) {
				var page = oldPages[element]

				chrome.tabs.create({
					"url": page.url,
					"active": false,
					"index": tab.index + 1
				})
			}
		}))

		//Recreate pages excluding all the indicies mentioned in orderedIndices
		for(var i = 0; i < oldPagesLength; i++) {
			if(!orderedIndices.includes(i))
				pages.push(oldPages[i])
		}

		//Update
		chrome.storage.local.set({[dividerPagePath]: pages})
	})
}

export function expand(divider, pageIndex, redirect) {
	sendMessage({
		"event": "dividerExpand",
		"divider": divider,
		"pageIndex": pageIndex
	})

	//Find the divider path
	var dividerPagePath = getPagePath(divider)

	chrome.storage.local.get(dividerPagePath, pageItems => {
		//Remove from pages by index
		var pages = pageItems[dividerPagePath]
		var page = pages[pageIndex]
		pages.splice(pageIndex, 1)

		if(redirect) {
			chrome.tabs.update({
				"url": page.url
			})
		} else {
			chrome.tabs.getSelected(tab => chrome.tabs.create({
				"url": page.url,
				"active": false,
				"index": tab.index + 1
			}))
		}

		//Update
		chrome.storage.local.set({[dividerPagePath]: pages})
	})
}

//Callback passes a boolean which is true if renaming worked and false if it didnt
export function rename(oldName, newName, callback) {
	//Keep old name if text is empty or the same
	if(newName.length > 0 && oldName != newName) {
		//Rename in dividers
		chrome.storage.local.get("dividers", items => {
			//Reconstruct 
			const oldDividers = items.dividers

			//Prevent renaming if another divider already has that name
			if(oldDividers.includes(newName)) {
				callback(false)
			} else {
				callback(true)

				sendMessage({
					"event": "dividerRename",
					"oldName": oldName,
					"newName": newName
				})

				var dividers = []

				oldDividers.forEach(element => {
					if(element == oldName)
						dividers.push(newName)
					else
						dividers.push(element)
				})

				//Update name in dividers and then rename pages and options
				chrome.storage.local.set({"dividers": dividers}, tab => {
					//Rename for pages
					var oldPagePath = "dividers." + oldName + ".pages", newPagePath = "dividers." + newName + ".pages"
					chrome.storage.local.get(oldPagePath, pageItems => {
						const pages = pageItems[oldPagePath]

						//Remove old and set new
						chrome.storage.local.remove(oldPagePath)
						chrome.storage.local.set({[newPagePath]: pages})
					})

					//Rename for options
					var oldOptionPath = "dividers." + oldName + ".options", newOptionPath = "dividers." + newName + ".options"
					chrome.storage.local.get(oldOptionPath, pageItems => {
						const pages = pageItems[oldOptionPath]

						//Remove old and set new
						chrome.storage.local.remove(oldOptionPath)
						chrome.storage.local.set({[newOptionPath]: pages})
					})
				})
			}
		})
	} else {
		callback(false)
	}
}

export function remove(name) {
	chrome.storage.local.get("dividers", items => {
		var dividers = items.dividers
		var index = dividers.indexOf(name)

		//Check if divider actually exists
		if(index != -1) {
			//Remove divider from array
			dividers.splice(index, 1)

			//Update dividers
			chrome.storage.local.set({"dividers": dividers}, () => {
				//Remove pages and options
				chrome.storage.local.remove([
					"dividers." + name + ".pages",
					"dividers." + name + ".options"
				], () => {
					//Send message
					sendMessage({
						"event": "dividerRemove",
						"name": name
					})
				})
			})
		}
	})
}

export function add() {
	chrome.storage.local.get("dividers", items => {
		var dividers = items.dividers

		var name = ""
		var baseName = "New Divider "
		var index = 1

		//Check if divider already exists and increase index if it does
		while(dividers.indexOf(name = baseName + index) != -1) index++

		dividers.push(name)
		
		//Update dividers
		chrome.storage.local.set(
			{
				"dividers": dividers,
				["dividers." + name + ".pages"]: [],
				["dividers." + name + ".options"]: []
			}, () => {
				sendMessage({
					"event": "dividerAdd",
					"name": name
				})
			}
		)
	})
}

//Changes the order of a divider
export function reorder(oldIndex, newIndex) {
	if(oldIndex != newIndex) {
		sendMessage({
			"event": "dividerReorder",
			"oldIndex": oldIndex,
			"newIndex": newIndex
		})

		chrome.storage.local.get("dividers", items => {
			var dividers = items.dividers;

			dividers.splice(newIndex, 0, dividers[oldIndex]) //Insert the divider into the new index
			dividers.splice(newIndex < oldIndex ? (oldIndex + 1) : oldIndex, 1) //Remove it from the old index

			chrome.storage.local.set({"dividers": dividers})
		})
	}
}

//Changes the order of a page on a divider
export function reorderPage(divider, oldIndex, newIndex) {
	if(oldIndex != newIndex) { //Ensure the old and new indices are different
		sendMessage({
			"event": "pageReorder",
			"divider": divider,
			"oldIndex": oldIndex,
			"newIndex": newIndex
		})

		var dividerPagePath = getPagePath(divider)

		chrome.storage.local.get(dividerPagePath, pageItems => {
			var pages = pageItems[dividerPagePath]
			pages.splice(newIndex, 0, pages[oldIndex]) //Insert the page into the new index
			pages.splice(newIndex < oldIndex ? (oldIndex + 1) : oldIndex, 1) //Remove it from the old index

			chrome.storage.local.set({[dividerPagePath]: pages}) //Update the page
		})
	}
}

export function exportAll() {
	chrome.storage.local.get(null, items => {
		var data = JSON.stringify(items, null, "\t")

		var link = document.createElement("a")
		link.href = URL.createObjectURL(new Blob([data], {type: "text/json"}))
		link.download = "Tabs Config.json"
		link.click()
	})
}

export function exportURLs(divider) {
	const pagePath = getPagePath(divider)

	chrome.storage.local.get(pagePath, items => {
		var data = ""

		items[pagePath].forEach(page => {
			data = data.concat(page.title + ": " + page.url + "\r\n\r\n")
		})

		var link = document.createElement("a")
		link.href = URL.createObjectURL(new Blob([data], {type: "text"}))
		link.download = divider + ".txt"
		link.click()
	})
}

export function getPagePath(divider) {
	return "dividers." + divider + ".pages"
}

export function getOptionPath(divider) {
	return "dividers" + divider + ".options"
}