import URLEvaluator from "/js/classes/urlevaluator.js"

let funcOnMessageSelf = null

function sendMessage(message) {
	if(funcOnMessageSelf)
		funcOnMessageSelf(message)

	chrome.runtime.sendMessage(message)
}

export default class DividerUtils {
	/**
	 * Causes the specified method to be called when a utility method is called
	 * @param {function} func Function to be called
	 * @param {object} func.message Sent message
	 * @param {object} func.sender Sender of the message
	 * @param {function} func.sendResponse Callback
	 */
	static onMessageSelf(func) {
		funcOnMessageSelf = func
	}

	/**
	 * Opens the divider
	 * @param {string} name Name of the divider to open
	 * @param {boolean} redirect True to open the divider in this tab, false to open a new tab for the divider
	 */
	static open(name, redirect) {
		let url = "divider.html#" + name

		if(redirect)
			chrome.tabs.update({"url": url})
		else
			chrome.tabs.create({"url": url})
	}

	/**
	 * Compress all tabs into the divider that match the predicate
	 * @param {string} divider Name of the divider
	 * @param {function} predicate Function to match the tab to possibly compress against the divider's current tab. Return true to compress, false to not compress
	 * @param {Tab} predicate.dividerTab Tab the divider is in
	 * @param {Tab} predicate.tab Tab the page to compress is in
	 */
	static compressAll(divider, predicate) {
		//Get the page path
		let dividerPagePath = getPagePath(divider)

		chrome.storage.local.get(dividerPagePath, items => { //Get the object for the page path
			chrome.tabs.getCurrent(dividerTab => { //Get the current tab
				chrome.tabs.query( //Get all the tabs in the same window
					{
						"currentWindow": true,
						"pinned": false
					},
					async tabs => {
						//Get the actual pages object
						let pages = items[dividerPagePath]
						let additionalPages = []

						for(let tab of tabs) {
							//Compress if predicate returns true
							if(predicate(dividerTab, tab)) {
								let url = await URLEvaluator.evaluate(tab)

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

	/**
	 * Compresses a tab into a divider
	 * @param {string} divider Name of the divider
	 * @param {number} tabId Index of the tab to compress
	 */
	static compress(divider, tabId) {
		chrome.tabs.get(tabId, async tab => {
			//Get the path for the divider
			let dividerPagePath = getPagePath(divider)

			//Get the url
			let url = await URLEvaluator.evaluate(tab)

			//Remove the current tab
			chrome.tabs.remove(tab.id)

			chrome.storage.local.get(dividerPagePath, items => {
				let pages = items[dividerPagePath]

				let page = {
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

	/**
	 * Expands each page at the index to the directly to the right of the divider tab in the corresponding order
	 * @param {string} divider Name of the divider
	 * @param {number[]} orderedIndices The order of the pages to be expanded in where the order in the array represent their new position and the numeric value at that index represents the old position
	 */
	static expandAll(divider, orderedIndices) {
		sendMessage({
			"event": "dividerBatchExpand",
			"divider": divider,
			"orderedIndices": orderedIndices
		})

		let dividerPagePath = getPagePath(divider)

		chrome.storage.local.get(dividerPagePath, pageItems => {
			const oldPages = pageItems[dividerPagePath]
			const oldPagesLength = oldPages.length
			let pages = []

			chrome.tabs.getSelected(tab => orderedIndices.forEach(element => {
				//Open the tab at each specified index
				if(element < oldPagesLength) {
					let page = oldPages[element]

					chrome.tabs.create({
						"url": page.url,
						"active": false,
						"index": tab.index + 1
					})
				}
			}))

			//Recreate pages excluding all the indicies mentioned in orderedIndices
			for(let i = 0; i < oldPagesLength; i++) {
				if(!orderedIndices.includes(i))
					pages.push(oldPages[i])
			}

			//Update
			chrome.storage.local.set({[dividerPagePath]: pages})
		})
	}

	/**
	 * Expands a page from a divider
	 * @param {string} divider Name of divider
	 * @param {number} pageIndex Index of page
	 * @param {string} type How to expand (redirect, new, none)
	 * redirect: Opens in the current tab
	 * new: Opens in a new tab
	 * none: Doesn't open at all (pseudo deletion of a page)
	 */
	static expand(divider, pageIndex, type) {
		sendMessage({
			"event": "dividerExpand",
			"divider": divider,
			"pageIndex": pageIndex
		})

		//Find the divider path
		let dividerPagePath = getPagePath(divider)

		chrome.storage.local.get(dividerPagePath, pageItems => {
			//Remove from pages by index
			let pages = pageItems[dividerPagePath]
			let page = pages[pageIndex]
			pages.splice(pageIndex, 1)

			switch(type) {
				case "redirect": {
					chrome.tabs.update({
						"url": page.url
					})

					break
				}
				case "new": {
					chrome.tabs.getSelected(tab => chrome.tabs.create({
						"url": page.url,
						"active": false,
						"index": tab.index + 1
					}))

					break
				}
				case "none": default:
					break
			}

			//Update
			chrome.storage.local.set({[dividerPagePath]: pages})
		})
	}

	/**
	 * Attempts to rename a divider
	 * @param {string} oldName Old/current name of divider
	 * @param {string} newName New name for divider
	 * @param {function} callback Called after renaming attempt
	 * @param {boolean} callback.result True if renaming worked, false if it didn't
	 */
	static rename(oldName, newName, callback) {
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

					let dividers = []

					oldDividers.forEach(element => {
						if(element == oldName)
							dividers.push(newName)
						else
							dividers.push(element)
					})

					//Update name in dividers and then rename pages and options
					chrome.storage.local.set({"dividers": dividers}, tab => {
						//Rename for pages
						let oldPagePath = "dividers." + oldName + ".pages", newPagePath = "dividers." + newName + ".pages"
						chrome.storage.local.get(oldPagePath, pageItems => {
							const pages = pageItems[oldPagePath]

							//Remove old and set new
							chrome.storage.local.remove(oldPagePath)
							chrome.storage.local.set({[newPagePath]: pages})
						})

						//Rename for options
						let oldOptionPath = "dividers." + oldName + ".options", newOptionPath = "dividers." + newName + ".options"
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

	/**
	 * Removes a divider
	 * @param {string} name Name of divider
	 */
	static remove(name) {
		chrome.storage.local.get("dividers", items => {
			let dividers = items.dividers
			let index = dividers.indexOf(name)

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

	/**
	 * Addes a new divider
	 */
	static add() {
		chrome.storage.local.get("dividers", items => {
			let dividers = items.dividers

			let name = ""
			let baseName = "New Divider "
			let index = 1

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

	/**
	 * Changes the order of a divider
	 * @param {number} oldIndex Old/current index of the divider
	 * @param {number} newIndex New index for the divider
	 */
	static reorder(oldIndex, newIndex) {
		if(oldIndex != newIndex) {
			sendMessage({
				"event": "dividerReorder",
				"oldIndex": oldIndex,
				"newIndex": newIndex
			})

			chrome.storage.local.get("dividers", items => {
				let dividers = items.dividers;

				dividers.splice(newIndex, 0, dividers[oldIndex]) //Insert the divider into the new index
				dividers.splice(newIndex < oldIndex ? (oldIndex + 1) : oldIndex, 1) //Remove it from the old index

				chrome.storage.local.set({"dividers": dividers})
			})
		}
	}

	/**
	 * Changes the order of a page in a divider
	 * @param {string} divider Name of divider
	 * @param {number} oldIndex Old/current index of the page
	 * @param {number} newIndex New index for the page
	 */
	static reorderPage(divider, oldIndex, newIndex) {
		if(oldIndex != newIndex) { //Ensure the old and new indices are different
			sendMessage({
				"event": "pageReorder",
				"divider": divider,
				"oldIndex": oldIndex,
				"newIndex": newIndex
			})

			let dividerPagePath = getPagePath(divider)

			chrome.storage.local.get(dividerPagePath, pageItems => {
				let pages = pageItems[dividerPagePath]
				pages.splice(newIndex, 0, pages[oldIndex]) //Insert the page into the new index
				pages.splice(newIndex < oldIndex ? (oldIndex + 1) : oldIndex, 1) //Remove it from the old index

				chrome.storage.local.set({[dividerPagePath]: pages}) //Update the page
			})
		}
	}

	/**
	 * Exports a json config of all the tabs
	 */
	static exportAll() {
		chrome.storage.local.get(null, items => {
			let data = JSON.stringify(items, null, "\t")

			let link = document.createElement("a")
			link.href = URL.createObjectURL(new Blob([data], {type: "text/json"}))
			link.download = "Tabs Config.json"
			link.click()
		})
	}

	/**
	 * Exports a txt containing the title and url of all the pages in the divider
	 * @param {string} divider Name of divider
	 */
	static exportURLs(divider) {
		const pagePath = getPagePath(divider)

		chrome.storage.local.get(pagePath, items => {
			let data = ""

			items[pagePath].forEach(page => {
				data = data.concat(page.title + ": " + page.url + "\r\n\r\n")
			})

			let link = document.createElement("a")
			link.href = URL.createObjectURL(new Blob([data], {type: "text"}))
			link.download = divider + ".txt"
			link.click()
		})
	}

	/**
	 * @param {string} divider Name for the divider
	 * @returns The path in chrome storage where the list of the divider's pages can be found
	 */
	static getPagePath(divider) {
		return "dividers." + divider + ".pages"
	}

	/**
	 * @param {string} divider Name for the divider
	 * @returns The path in chrome storage where the divider's options can be found
	 */
	static getOptionPath(divider) {
		return "dividers" + divider + ".options"
	}
}