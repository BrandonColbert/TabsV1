function getDivider() {
	return decodeURIComponent(window.location.href.split("#")[1])
}

function decompress(page) {
	//Find the divider path
	var dividerPagePath = "dividers." + getDivider() + ".pages"

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
		chrome.tabs.getCurrent(tab => {
			//Open url in a new tab next to the same tab
			chrome.tabs.create({
				"url": page.url,
				"active": false,
				"index": tab.index + 1
			})

			decompress(page)
		})
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

//Get the divider and its page path
var divider = getDivider()
var dividerPagePath = "dividers." + divider + ".pages"

//Set the names to the divider name
document.getElementById("title").innerText = "(" + divider + ") | Divider"
document.getElementById("name").innerText = divider

//Populate the urls in the divider
chrome.storage.local.get(dividerPagePath, pageItems => {
	//Get all the stored pages for the divider and place them in it
	pageItems[dividerPagePath].forEach(page => {
		document.getElementById("items").appendChild(createPageElement(page))
	})
})


//Update the view in case it is changed somewhere
chrome.storage.onChanged.addListener((changes, areaName) => {
	var dividerPagePath = "dividers." + getDivider() + ".pages"

	//Check if this page was changed
	if(changes.hasOwnProperty(dividerPagePath)) {
		var items = document.getElementById("items")

		//Remove all the children
		while(items.lastChild)
			items.removeChild(items.lastChild)

		//Add the new titles
		changes[dividerPagePath].newValue.forEach(page => {
			document.getElementById("items").appendChild(createPageElement(page))
		})
	}
})

document.getElementById("compressRight").addEventListener("click", () => {
	//Get the page path
	var dividerPagePath = "dividers." + getDivider() + ".pages"

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
						if(tab.index > dividerTab.index) {
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
})

document.getElementById("expandRight").addEventListener("click", () => {
	var dividerPagePath = "dividers." + getDivider() + ".pages"

	chrome.storage.local.get(dividerPagePath, pageItems => {
		pageItems[dividerPagePath].forEach(page => {
			chrome.tabs.create({
				"url": page.url,
				"active": false
			})
		})

		//Update
		chrome.storage.local.set({[dividerPagePath]: []})
	})
})