import * as DividerUtils from "/DividerUtils.js"

function getDivider() {
	return decodeURIComponent(location.hash).substring(1)
}

function getButtonIndex(button) {
	return Array.from(document.getElementById("items").children).indexOf(button.parentNode.parentNode)
}

function createPageElement(page) {
	//Create divider and text
	var div = document.createElement("div")
	div.classList.add("page")

	//Add title
	var title = document.createElement("span")
	title.classList.add("pageSpan")

	//Add expand button
	var button = document.createElement("button")
	button.classList.add("pageButton")
	button.title = "Expand " + page.title

	button.addEventListener("click", () => {
		//Open url in a new tab next to the same tab
		DividerUtils.expand(
			getDivider(),
			getButtonIndex(button),
			false
		)
	})

	//Add link
	var link = document.createElement("a")
	link.href = page.url
	link.appendChild(document.createTextNode("<" + page.url + ">"))

	//Spacer
	var spacer = document.createElement("span")
	spacer.classList.add("pageSpacer")

	//Show correctly
	title.appendChild(button)
	title.appendChild(document.createTextNode(page.title))
	title.appendChild(link)
	div.appendChild(title)
	div.appendChild(spacer)

	//Make draggable
	button.draggable = true

	button.addEventListener("dragstart", event => {
		title.classList.add("dragSource")
		event.dataTransfer.effectAllowed = "move"
		event.dataTransfer.setData("divider_page_index", getButtonIndex(button))
	})

	button.addEventListener("dragend", event => {
		title.classList.remove("dragSource")
		document.querySelectorAll(".dragTarget").forEach(element => element.classList.remove("dragTarget"))
	})

	title.addEventListener("dragover", event => {
		event.preventDefault()
		event.dataTransfer.dropEffect = Array.from(event.dataTransfer.types).includes("divider_page_index") ? "move" : "none"
	})

	title.addEventListener("drop", event => {
		event.stopPropagation()
		var dividerPageIndex = event.dataTransfer.getData("divider_page_index")

		if(dividerPageIndex) {
			var dragIndex = parseInt(dividerPageIndex)
			var dropIndex = getButtonIndex(button)

			DividerUtils.reorderPage(getDivider(), dragIndex, dropIndex < dragIndex ? dropIndex : (dropIndex + 1))
		}
	})

	spacer.addEventListener("dragover", event => {
		event.preventDefault()
		event.dataTransfer.dropEffect = Array.from(event.dataTransfer.types).includes("divider_page_index") ? "move" : "none"
	})

	spacer.addEventListener("drop", event => {
		event.stopPropagation()
		var dividerPageIndex = event.dataTransfer.getData("divider_page_index")

		if(dividerPageIndex) {
			var dragIndex = parseInt(dividerPageIndex)
			var dropIndex = getButtonIndex(button)

			DividerUtils.reorderPage(getDivider(), dragIndex, dropIndex + 1)
		}
	})

	//Handle highlighting drop location
	spacer.addEventListener("dragenter", event => spacer.classList.add("dragTarget"))
	spacer.addEventListener("dragleave", event => spacer.classList.remove("dragTarget"))
	title.addEventListener("dragenter", event => title.classList.add("dragTarget"))
	title.addEventListener("dragleave", event => {
		if(event.fromElement != button && event.fromElement != title)
			title.classList.remove("dragTarget")
	})

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

function refreshName() {
	var divider = getDivider()

	//Set the names to the divider name
	document.getElementById("title").innerText = "(" + divider + ") | Divider"
	document.getElementById("name").innerText = divider
}

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

document.getElementById("exportSave").addEventListener("click", () => {
	DividerUtils.exportAll()
})

document.getElementById("compressLeft").addEventListener("click", () => {
	DividerUtils.compressAll(getDivider(), (dividerTab, tab) => tab.index < dividerTab.index)
})

document.getElementById("exportURLs").addEventListener("click", () => {
	DividerUtils.exportURLs(getDivider())
})

function onMessage(message, sender, sendResponse) {
	switch(message.event) {
		case "dividerBatchExpand":
			var items = document.getElementById("items").children
			message.orderedIndices.forEach(index => items[index].remove())
			break
		case "dividerBatchCompress":
			if(message.divider == getDivider()) {
				var items = document.getElementById("items")
				message.pages.forEach(page => items.appendChild(createPageElement(page)))
			}
			break
		case "dividerExpand":
			if(message.divider == getDivider())
				document.getElementById("items").children[message.pageIndex].remove()
			break
		case "dividerCompress":
			if(message.divider == getDivider())
				document.getElementById("items").appendChild(createPageElement(message.page))
			break
		case "dividerRename":
			if(message.oldName == getDivider()) {
				location.hash = message.newName
				refreshName()
			}
			break
		case "dividerRemove":
			if(message.name == getDivider())
				window.close()
			break
		case "pageReorder":
			if(message.divider == getDivider()) {
				var items = document.getElementById("items")
				items.insertBefore(items.children[message.oldIndex], items.children[message.newIndex])
			}
		default:
			break
	}
}

refreshName()
reloadItems()

DividerUtils.onMessageSelf(onMessage)
chrome.runtime.onMessage.addListener(onMessage)