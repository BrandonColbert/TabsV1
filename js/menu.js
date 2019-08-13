import DividerUtils from "/js/classes/dividerutils.js"

function getPageIndex(button) {
	return Array.from(button.parentNode.parentNode.children).indexOf(button.parentNode) - 1
}

function getPageDivider(button) {
	return button.parentElement.parentElement.firstChild.innerText
}

function getDividerIndex(details) {
	return Array.from(details.parentNode.parentNode.children).indexOf(details.parentNode)
}

function createPageElement(page) {
	//Create the button for the page and define actions for clicking it
	let tabItem = document.createElement("button")
	tabItem.appendChild(document.createTextNode(page.title))

	//Navigate to page on left-click
	tabItem.addEventListener("click", () => {
		DividerUtils.expand(
			getPageDivider(tabItem),
			getPageIndex(tabItem), //Account that summary is also a child
			"redirect"
		)
	})

	//Open in new tab on right-click
	tabItem.addEventListener("contextmenu", event => {
		//Disable context menu
		event.preventDefault()

		//Open url in a new tab next to the same tab
		DividerUtils.expand(
			getPageDivider(tabItem),
			getPageIndex(tabItem), //Account that summary is also a child
			"new"
		)
	})

	//Make draggable
	let span = document.createElement("span")
	span.appendChild(tabItem)

	tabItem.draggable = true

	tabItem.addEventListener("dragstart", event => {
		event.stopPropagation()
		event.dataTransfer.effectAllowed = "move"
		event.dataTransfer.setData("page_index", getPageIndex(tabItem))
	})

	tabItem.addEventListener("drop", event => {
		event.stopPropagation()
		let pageIndex = event.dataTransfer.getData("page_index")

		if(pageIndex) {
			let dragIndex = parseInt(pageIndex)
			let dropIndex = getPageIndex(tabItem)

			DividerUtils.reorderPage(getPageDivider(tabItem), dragIndex, dropIndex < dragIndex ? dropIndex : (dropIndex + 1))
		}
	})

	span.addEventListener("dragover", event => {
		event.stopPropagation()
		event.preventDefault()
		event.dataTransfer.dropEffect = Array.from(event.dataTransfer.types).includes("page_index") ? "move" : "none"
	})

	span.addEventListener("drop", event => {
		event.stopPropagation()
		let pageIndex = event.dataTransfer.getData("page_index")

		if(pageIndex)
			DividerUtils.reorderPage(getPageDivider(tabItem), parseInt(pageIndex), getPageIndex(tabItem))
	})

	return span
}

function createDivider(name) {
	//Create the dividers details and assign it the same id as its page path
	let details = document.createElement("details")
	details.id = name

	//Make the name the same as the divider name
	let summary = document.createElement("summary")

	//Right click text to edit divider name
	let dividerName = document.createElement("text")
	dividerName.dataset.original = name

	dividerName.addEventListener("contextmenu", event => {
		//Disable context menu
		event.preventDefault()

		//Make editable and focus
		dividerName.contentEditable = true
		dividerName.focus()

		//Select all text
		let range = document.createRange()
		range.selectNodeContents(dividerName)
		window.getSelection().removeAllRanges()
		window.getSelection().addRange(range)
	})

	dividerName.addEventListener("keydown", event => {
		if(dividerName.contentEditable == "true") {
			if(event.code == "Escape") { //Escape to leave text as original
				//Prevent exiting extension
				event.preventDefault()
				
				dividerName.contentEditable = false
				dividerName.textContent = dividerName.dataset.original
			} else if(event.code == "Enter") { //Enter to rename
				dividerName.contentEditable = false

				//Try renaming and revert name if callback result is false
				DividerUtils.rename(dividerName.dataset.original, dividerName.textContent, result => {
					if(!result)
						dividerName.textContent = dividerName.dataset.original
				})
			} else if(event.code == "Space") {
				event.preventDefault()
				dividerName.innerHTML += "&nbsp;"
				window.getSelection().collapse(dividerName.childNodes[0], dividerName.textContent.length);
			}
		}
	})

	dividerName.addEventListener("focusout", () => {
		//Unselecting while editing leaves text as original
		if(dividerName.contentEditable == "true") {
			dividerName.contentEditable = false
			dividerName.textContent = dividerName.dataset.original
		}
	})

	dividerName.addEventListener("click", event => {
		//Prevent toggling open status while renaming
		if(dividerName.contentEditable == "true")
			details.open = !details.open
	})

	//Show button to navigate to the divider's page
	let pageButton = document.createElement("button")
	pageButton.classList.add("pageButton")

	pageButton.addEventListener("click", () => {
		//Open divider with the divider's name as metadata
		DividerUtils.open(dividerName.dataset.original, false)
	})

	pageButton.oncontextmenu = () => {
		event.preventDefault()

		//Compress the open tab to the divider
		chrome.tabs.query({active: true, lastFocusedWindow: true}, tabs => DividerUtils.compress(dividerName.dataset.original, tabs[0].id))
	}

	//Display them properly in html
	dividerName.appendChild(document.createTextNode(name))
	summary.appendChild(pageButton)
	summary.appendChild(dividerName)
	details.appendChild(summary)
	
	//Make draggable
	let span = document.createElement("span")
	span.classList.add("dividerSpan")
	span.appendChild(details)

	details.draggable = true

	details.addEventListener("dragstart", event => {
		event.dataTransfer.effectAllowed = "move"
		event.dataTransfer.setData("divider_index", getDividerIndex(details))
	})

	details.addEventListener("drop", event => {
		event.stopPropagation()
		let dividerIndex = event.dataTransfer.getData("divider_index")

		if(dividerIndex) {
			let dragIndex = parseInt(dividerIndex)
			let dropIndex = getDividerIndex(details)

			DividerUtils.reorder(dragIndex, dropIndex < dragIndex ? dropIndex : (dropIndex + 1))
		}
	})

	span.addEventListener("dragover", event => {
		event.stopPropagation()
		event.preventDefault()
		event.dataTransfer.dropEffect = Array.from(event.dataTransfer.types).includes("divider_index") ? "move" : "none"
	})

	span.addEventListener("drop", event => {
		event.stopPropagation()
		let dividerIndex = event.dataTransfer.getData("divider_index")

		if(dividerIndex)
			DividerUtils.reorder(parseInt(dividerIndex), getDividerIndex(details))
	})

	//Display under Dividers
	document.getElementById("tab-dividers").appendChild(span)

	//Get the page path based on the name
	let dividerPagePath = "dividers." + name + ".pages"

	//Populate the urls in the divider
	chrome.storage.local.get(dividerPagePath, pageItems => {
		//Get all the stored pages for the divider and place them in it
		pageItems[dividerPagePath].forEach(page => {
			details.appendChild(createPageElement(page))
		})
	})
}

document.getElementById("addSymbol").addEventListener("click", () => DividerUtils.add())

//Initialize with dividers and items preadded
chrome.storage.local.get("dividers", items => {
	//Iterate through stored divider names
	items.dividers.forEach(element => createDivider(element))
})

function onMessage(message, sender, sendResponse) {
	switch(message.event) {
		case "dividerBatchExpand": {
			let details = document.getElementById(message.divider).children
			message.orderedIndices.forEach(index => details[index + 1].remove())
			break
		}
		case "dividerBatchCompress": {
			let details = document.getElementById(message.divider)
			message.pages.forEach(page => details.appendChild(createPageElement(page)))
			break
		}
		case "dividerExpand":
			document.getElementById(message.divider).children[message.pageIndex + 1].remove()
			break
		case "dividerCompress":
			document.getElementById(message.divider).appendChild(createPageElement(message.page))
			break
		case "dividerRename": {
			let details = document.getElementById(message.oldName)
			let dividerText = details.firstChild.childNodes[1]

			details.id = message.newName
			dividerText.dataset.original = message.newName
			dividerText.textContent = message.newName
			break
		}
		case "dividerRemove":
			document.getElementById(message.name).remove()
			break
		case "dividerAdd":
			createDivider(message.name)
			break
		case "dividerReorder":
			let dividers = document.getElementById("tab-dividers")
			dividers.insertBefore(dividers.children[message.oldIndex], dividers.children[message.newIndex])
		case "pageReorder":
			if(message.divider) {
				let details = document.getElementById(message.divider)
				details.insertBefore(details.children[message.oldIndex + 1], details.children[message.newIndex + 1])
			}
		default:
			break
	}
}

DividerUtils.onMessageSelf(onMessage)
chrome.runtime.onMessage.addListener(onMessage)