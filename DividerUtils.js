export function open(name, redirect) {
	var url = "divider.html#" + name

	if(redirect) {
		chrome.tabs.update({"url": url})
	} else {
		chrome.tabs.create({"url": url})
	}
}

//Compress all objects into the divider that return true for their predicate involving the divider's current tab and the tab in question
export function compressAll(divider, predicate) {
	//Get the page path
	var dividerPagePath = "dividers." + divider + ".pages"

	chrome.storage.local.get(dividerPagePath, items => { //Get the object for the page path
		chrome.tabs.getCurrent(dividerTab => { //Get the current tab
			chrome.tabs.query( //Get all the tabs in the same window
				{
					"currentWindow": true,
					"pinned": false
				},
				tabs => {
					//Get the actual pages object
					var pages = items[dividerPagePath]

					tabs.forEach(tab => {
						//Compress if index is to the right
						if(predicate(dividerTab, tab)) {
							pages.push({
								"title": tab.title,
								"url": tab.url,
								"time": new Date().getTime()
							})

							//Remove the tab
							chrome.tabs.remove(tab.id)
						}
					})

					//Update with new pages
					chrome.storage.local.set({[dividerPagePath]: pages})
				}
			)
		})
	})
}

export function compress(divider, tabId) {
	chrome.tabs.get(tabId, tab => {
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
	})
}

//Expands each page at the index to the directly to the right of the divider tab in the corresponding order
export function expandAll(divider, orderedIndices) {
	var dividerPagePath = "dividers." + divider + ".pages"

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
	//Find the divider path
	var dividerPagePath = "dividers." + divider + ".pages"

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
	console.log("Deleted " + name)

	chrome.storage.local.get("dividers", items => {
		var dividers = items.dividers
		var index = dividers.indexOf(name)

		//Check if divider actually exists
		if(index != -1) {
			//Remove divider from array
			dividers.splice(index, 1)

			//Update dividers
			chrome.storage.local.set({"dividers": dividers})

			//Remove pages and options
			chrome.storage.local.remove([
				"dividers." + name + ".pages",
				"dividers." + name + ".options"
			])
		}
	})
}

export function add(name) {

}