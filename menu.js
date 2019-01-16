function decompress(tabItem, page) {
	//Find the divider path
	var dividerPagePath = "dividers." + tabItem.parentElement.firstChild.innerText + ".pages"

	chrome.storage.local.get(dividerPagePath, pageItems => {
		//Remove pages with matching urls
		const pages = pageItems[dividerPagePath].filter(dividerPage => {
			return dividerPage.url !== page.url
		})

		//Update
		chrome.storage.local.set({[dividerPagePath]: pages})
	})
}

function createPageElement(page) {
	//Create the button for the page and define actions for clicking it
	var tabItem = document.createElement("button")
	tabItem.appendChild(document.createTextNode(page.title))

	//Navigate to page on left-click
	tabItem.addEventListener("click", () => {
		chrome.tabs.update(
			{
				"url": page.url
			},
			tab => decompress(tabItem, page)
		)
	})

	//Open in new tab on right-click
	tabItem.addEventListener("contextmenu", event => {
		//Disable context menu
		event.preventDefault()

		chrome.tabs.getSelected(tab => {
			//Open url in a new tab next to the same tab
			chrome.tabs.create(
				{
					"url": page.url,
					"active": false,
					"index": tab.index + 1
				},
				tab => decompress(tabItem, page)
			)
		})
	})

	return tabItem
}

//Initialize with dividers and items preadded
chrome.storage.local.get("dividers", items => {
	//Iterate through stored divider names
	items.dividers.forEach(element => {
		//Get the page path based on the element name
		var dividerPagePath = "dividers." + element + ".pages"

		//Create the dividers details and assign it the same id as its page path
		var details = document.createElement("details")
		details.id = dividerPagePath

		//Make the name the same as the divider name
		var summary = document.createElement("summary")

		//Double clickable text to edit divider name
		var txt = document.createElement("font")
		txt.addEventListener("dblclick", () => {
			console.log("Rename")
		})

		//Show button to navigate to the divider's page
		var pageButton = document.createElement("button")
		pageButton.classList.add("pageButton")

		pageButton.addEventListener("click", () => {
			//Open divider with the dividier's name as metadata
			chrome.tabs.create({
				"url": "divider.html#" + element
			})
		})

		//Display them properly in html
		txt.appendChild(document.createTextNode(element))
		summary.appendChild(pageButton)
		summary.appendChild(txt)
		details.appendChild(summary)
		document.getElementById("tab-dividers").appendChild(details)

		//Populate the urls in the divider
		chrome.storage.local.get(dividerPagePath, pageItems => {
			//Get all the stored pages for the divider and place them in it
			pageItems[dividerPagePath].forEach(page => {
				details.appendChild(createPageElement(page))
			})
		})
	})
})

//Update the view in case it is changed somewhere
chrome.storage.onChanged.addListener((changes, areaName) => {
	//Regex to make sure the change involves a divider page
	var re = RegExp("^dividers\\..*\\.pages$")

	//Get all the keys that were changed
	for(var key in changes) {
		//Check if divider page was changed
		if(re.test(key)) {
			var divider = document.getElementById(key)

			//Remove all the children from details besides the summary name
			while(divider.childElementCount > 1)
				divider.removeChild(divider.lastChild)

			//Add the new titles
			changes[key].newValue.forEach(page => {
				divider.appendChild(createPageElement(page))
			})
		}
	}
})