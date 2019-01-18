import * as DividerUtils from "/DividerUtils.js"

function getDivider() {
	return decodeURIComponent(location.hash).substring(1)
}

function createPageElement(page) {
	//Create divider and text
	var div = document.createElement("div")
	div.classList.add("page")

	//Add title
	var title = document.createElement("p")

	//Add expand button
	var button = document.createElement("button")
	button.classList.add("pageButton")
	button.title = "Expand " + page.title

	button.addEventListener("click", () => {
		//Open url in a new tab next to the same tab
		DividerUtils.expand(
			getDivider(),
			Array.from(document.getElementById("items").children).indexOf(button.parentNode.parentNode),
			false
		)
	})

	//Add link
	var link = document.createElement("a")
	link.href = page.url
	link.appendChild(document.createTextNode("<" + page.url + ">"))

	//Show correctly
	title.appendChild(button)
	title.appendChild(document.createTextNode(page.title))
	title.appendChild(link)
	div.appendChild(title)

	return div
}

function reloadItems() {
	var dividerPagePath = "dividers." + getDivider() + ".pages"

	//Get the items
	var items = document.getElementById("items")

	//Remove all the children
	while(items.lastChild)
		items.removeChild(items.lastChild)

	//Populate the urls in the divider
	chrome.storage.local.get(dividerPagePath, pageItems => {
		//Get all the stored pages for the divider and place them in it
		const pages = pageItems[dividerPagePath]

		if(pages) {
			pages.forEach(page => {
				items.appendChild(createPageElement(page))
			})
		}
	})
}

function init() {
	var divider = getDivider()

	//Set the names to the divider name
	document.getElementById("title").innerText = "(" + divider + ") | Divider"
	document.getElementById("name").innerText = divider

	reloadItems()
}

init()

//Update the view in case it is changed somewhere
chrome.storage.onChanged.addListener((changes, areaName) => {
	var dividerName = getDivider()
	var dividerPagePath = "dividers." + dividerName + ".pages"

	//Check if name was changed
	if(changes.hasOwnProperty("dividers")) {
		console.log("Values:")
		console.log(changes)

		var oldValue = changes["dividers"].oldValue
		var newValue = changes["dividers"].newValue

		if(oldValue.length == newValue.length) { //A rename or reorder occured
			if(!newValue.includes(dividerName)) {//This divider was renamed
				for(var i = 0; i < newValue.length; i++) {
					var oldName = oldValue[i]
					var newName = newValue[i]

					if(oldName != newName && oldName == dividerName) {
						location.hash = newName
						init()
					}
				}
			}
		} else { //A removal or addition occured
			if(!newValue.includes(dividerName)) {//This divider was removed
				window.close()
			}
		}
	}

	//Check if this pages on the divider were changed
	if(changes.hasOwnProperty(dividerPagePath)) {
		reloadItems()
	}
})

document.getElementById("compressRight").addEventListener("click", () => {
	DividerUtils.compressAll(getDivider(), (dividerTab, tab) => tab.index > dividerTab.index)
})

document.getElementById("expandRight").addEventListener("click", () => {
	var orderedIndices = []

	for(var i = document.getElementById("items").childNodes.length - 1; i >= 0; i--)
		orderedIndices.push(i)

	DividerUtils.expandAll(getDivider(), orderedIndices)
})

document.getElementById("deleteDivider").addEventListener("click", () => {
	DividerUtils.remove(getDivider())
})