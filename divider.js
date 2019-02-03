import * as DividerUtils from "/DividerUtils.js"

function getDivider() {
	return decodeURIComponent(location.hash).substring(1)
}

function setDivider(name) {
	location.hash = name
	refreshName()
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

	//Right click to open in new tab
	button.addEventListener("contextmenu", event => {
		//Disable context menu
		event.preventDefault()

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

	//Viewable frame
	var viewer = document.createElement("iframe")
	viewer.src = ""
	viewer.width = window.innerWidth * 0.6
	viewer.height = window.innerHeight * 0.5
	viewer.style.display = "none"
	viewer.sandbox = "allow-forms allow-pointer-lock allow-popups allow-scripts allow-same-origin"
	viewer.setAttribute("allowFullScreen", "")

	//Left click button to open view
	button.addEventListener("click", () => {
		//Toggle visibility of website
		if(viewer.style.display == "none") {
			viewer.style.display = null
			viewer.src = page.url
		} else {
			viewer.style.display = "none"
			viewer.src = ""
		}
	})

	var resizeTimer;

	//Prevent interaction with view while resizing to allow smoothness
	new ResizeObserver(() => {
		clearTimeout(resizeTimer)
		viewer.style["pointer-events"] = "none" //Disable view interactions

		resizeTimer = setTimeout(() => {
			viewer.style["pointer-events"] = null //Reenable view interaction
		}, 100)
	}).observe(viewer)

	//Spacer
	var spacer = document.createElement("span")
	spacer.classList.add("pageSpacer")

	//Show correctly
	title.appendChild(button)
	title.appendChild(document.createTextNode(page.title))
	title.appendChild(link)
	div.appendChild(title)
	div.appendChild(viewer)
	div.appendChild(spacer)

	//Make draggable
	button.draggable = true

	var removeOutlines = () => {
		document.querySelectorAll(".dragTarget, .dragSource").forEach(element => element.classList.remove("dragTarget", "dragSource"))
	}

	button.addEventListener("dragstart", event => {
		title.classList.add("dragSource")
		event.dataTransfer.effectAllowed = "move"
		event.dataTransfer.setData("divider_page_index", getButtonIndex(button))
	})

	button.addEventListener("dragend", event => {
		removeOutlines()
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

		removeOutlines()
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

		removeOutlines()
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

		if(pages)
			pages.forEach(page => items.appendChild(createPageElement(page)))

		checkSearch()
	})
}

function refreshName() {
	var divider = getDivider()

	//Set the names to the divider name
	document.getElementById("title").innerText = "(" + divider + ") | Divider"
}

function reloadDividerDropdown() {
	var dropdown = document.getElementById("dropdown")

	while(dropdown.lastChild)
		dropdown.removeChild(dropdown.lastChild)

	chrome.storage.local.get("dividers", items => {
		items.dividers.forEach(divider => {
			var option = document.createElement("option")
			option.value = divider;
			option.appendChild(document.createTextNode(divider))
			dropdown.add(option)
		})

		dropdown.value = getDivider()
	})
}

document.getElementById("dropdown").addEventListener("change", () => {
	setDivider(document.getElementById("dropdown").value)
	reloadItems()
})

document.getElementById("compressRight").addEventListener("click", () => {
	DividerUtils.compressAll(getDivider(), (dividerTab, tab) => tab.index > dividerTab.index)
})

document.getElementById("expandRight").addEventListener("click", () => {
	var items = document.getElementById("items").childNodes
	var orderedIndices = []

	for(var i = items.length - 1; i >= 0; i--) {
		if(!items[i].style.display || items[i].style.display == "block")
			orderedIndices.push(i)
	}

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

function matchSearch(query, content, url) {
	if(query.length == 0)
		return true
	
	if(query.startsWith("regex:")) {
		try {
			if(new RegExp(query.substring(6)).test(content))
				return true
			else
				return false
		} catch(error) {
			document.getElementById("searchbar").style.color = "orangered"
		}
	}
	
	if(query.startsWith("url:")) {
		if(url.includes(query.substring(4)))
			return true
		else
			return false
	}

	if(content.includes(query))
		return true
	
	return false;
}

function simplifyString(str) {
	return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
}

function checkSearch() {
	//Get the searchbar and what is being searched for
	var searchbar = document.getElementById("searchbar")
	var query = simplifyString(searchbar.value)

	//Make the searchbar text blue if it is using a special search
	searchbar.style.color = (query.startsWith("regex:") || query.startsWith("url:")) ? "navy" : "black"

	//Make all urls visible without hovering if the search begins with url: by adding the class searchResult
	if(query.startsWith("url:"))
		document.querySelectorAll(".pageSpan").forEach(element => element.childNodes[2].classList.add("searchResult"))
	else
		document.querySelectorAll(".searchResult").forEach(element => element.classList.remove("searchResult"))

	//Check which pages should be shown based on their content
	document.getElementById("items").childNodes.forEach(div => {
		var spanNodes = div.firstChild.childNodes

		//Get the content and url
		var content = simplifyString(spanNodes[1].textContent)
		var url = simplifyString(spanNodes[2].textContent)

		//Check the match and set visibility
		div.style.display = matchSearch(query, content, url) ? "block" : "none"
	})
}

document.getElementById("searchbar").addEventListener("input", () => checkSearch())

document.getElementById("searchbar").addEventListener("keydown", event => {
	if(event.key == "Enter")
		event.preventDefault()
})

function onMessage(message, sender, sendResponse) {
	switch(message.event) {
		case "dividerBatchExpand":
			if(message.divider == getDivider()) {
				var items = document.getElementById("items").children
				message.orderedIndices.forEach(index => items[index].remove())
			}
			break
		case "dividerBatchCompress":
			if(message.divider == getDivider()) {
				var items = document.getElementById("items")
				message.pages.forEach(page => items.appendChild(createPageElement(page)))
				checkSearch()
			}
			break
		case "dividerExpand":
			if(message.divider == getDivider())
				document.getElementById("items").children[message.pageIndex].remove()
			break
		case "dividerCompress":
			if(message.divider == getDivider()) {
				document.getElementById("items").appendChild(createPageElement(message.page))
				checkSearch()
			}
			break
		case "dividerRename":
			if(message.oldName == getDivider())
				setDivider(message.newName)

			reloadDividerDropdown()
			break
		case "dividerRemove":
			if(message.name == getDivider())
				window.close()
			else
				reloadDividerDropdown()
			break
		case "pageReorder":
			if(message.divider == getDivider()) {
				var items = document.getElementById("items")
				items.insertBefore(items.children[message.oldIndex], items.children[message.newIndex])
			}
			break
		case "dividerAdd":
			reloadDividerDropdown()
			break
		case "dividerReorder":
			reloadDividerDropdown()
			break
		default:
			break
	}
}

refreshName()
reloadItems()
reloadDividerDropdown()

DividerUtils.onMessageSelf(onMessage)
chrome.runtime.onMessage.addListener(onMessage)